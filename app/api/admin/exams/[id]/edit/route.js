import { NextResponse } from 'next/server';
import connectDB from '../../../../../../lib/mongodb';
import Exam from '../../../../../../models/Exam';
import { getUserFromToken } from '../../../../../../lib/auth';
import { isExamEditable } from '../../../../../../lib/examUtils';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id: examId } = await params;
    const updateData = await request.json();

    // Find the exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return NextResponse.json(
        { message: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if exam is editable (hasn't started yet)
    if (!isExamEditable(exam)) {
      return NextResponse.json(
        { message: 'Cannot edit exam after it has started' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!updateData.title || !updateData.description || !updateData.duration || !updateData.startTime) {
      return NextResponse.json(
        { message: 'Title, description, duration, and start time are required' },
        { status: 400 }
      );
    }

    // Validate start time is in the future
    const startTime = new Date(updateData.startTime);
    const now = new Date();
    if (startTime <= now) {
      return NextResponse.json(
        { message: 'Start time must be in the future' },
        { status: 400 }
      );
    }

    // Update the exam
    const updatedExam = await Exam.findByIdAndUpdate(
      examId,
      {
        title: updateData.title,
        description: updateData.description,
        duration: updateData.duration,
        startTime: updateData.startTime,
        endTime: updateData.endTime
      },
      { new: true }
    );

    return NextResponse.json({
      message: 'Exam updated successfully',
      exam: updatedExam
    });

  } catch (error) {
    console.error('Error updating exam:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}