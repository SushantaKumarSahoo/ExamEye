import { NextResponse } from 'next/server';
import connectDB from '../../../../../../lib/mongodb';
import Exam from '../../../../../../models/Exam';
import TempStudent from '../../../../../../models/TempStudent';
import { getUserFromToken } from '../../../../../../lib/auth';

export async function POST(request, { params }) {
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
    
    // Find the exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return NextResponse.json(
        { message: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if exam can be ended (only active exams)
    if (exam.status !== 'active') {
      return NextResponse.json(
        { message: 'Only active exams can be ended' },
        { status: 400 }
      );
    }

    // Update exam status to ended
    exam.status = 'ended';
    exam.endTime = new Date();
    await exam.save();

    // Expire all temporary student credentials for this exam
    await TempStudent.updateMany(
      { examId: examId },
      { 
        expiresAt: new Date(), // Set to current time to expire immediately
        isUsed: true
      }
    );

    return NextResponse.json({
      message: 'Exam ended successfully',
      exam: {
        id: exam._id,
        title: exam.title,
        status: exam.status,
        endTime: exam.endTime
      }
    });

  } catch (error) {
    console.error('Error ending exam:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}