import { NextResponse } from 'next/server';
import connectDB from '../../../../../../lib/mongodb';
import Exam from '../../../../../../models/Exam';
import { getUserFromToken } from '../../../../../../lib/auth';

export async function PATCH(request, { params }) {
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

    const { status } = await request.json();
    const { id: examId } = await params;

    // Validate status
    if (!['draft', 'active', 'ended'].includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status' },
        { status: 400 }
      );
    }

    // Find and update exam
    const exam = await Exam.findOne({ _id: examId, createdBy: user._id });
    
    if (!exam) {
      return NextResponse.json(
        { message: 'Exam not found' },
        { status: 404 }
      );
    }

    exam.status = status;
    
    // Set timestamps based on status
    if (status === 'active' && !exam.startTime) {
      exam.startTime = new Date();
    } else if (status === 'ended' && !exam.endTime) {
      exam.endTime = new Date();
    }

    await exam.save();

    return NextResponse.json({
      message: 'Exam status updated successfully',
      exam: {
        id: exam._id,
        status: exam.status,
        startTime: exam.startTime,
        endTime: exam.endTime
      }
    });

  } catch (error) {
    console.error('Error updating exam status:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}