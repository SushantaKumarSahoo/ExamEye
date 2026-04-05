import { NextResponse } from 'next/server';
import connectDB from '../../../../../../lib/mongodb';
import Exam from '../../../../../../models/Exam';
import TempStudent from '../../../../../../models/TempStudent';
import { getUserFromToken } from '../../../../../../lib/auth';

export async function DELETE(request, { params }) {
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

    // Check if exam can be deleted (only draft or not started exams)
    if (exam.status === 'active') {
      return NextResponse.json(
        { message: 'Cannot delete an active exam. Please end the exam first.' },
        { status: 400 }
      );
    }

    if (exam.status === 'ended') {
      return NextResponse.json(
        { message: 'Cannot delete an ended exam with submissions.' },
        { status: 400 }
      );
    }

    // Delete associated temporary student credentials
    await TempStudent.deleteMany({ examId: examId });

    // Delete the exam
    await Exam.findByIdAndDelete(examId);

    return NextResponse.json({
      message: 'Exam deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting exam:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}