import { NextResponse } from 'next/server';
import connectDB from '../../../../../../lib/mongodb';
import Exam from '../../../../../../models/Exam';
import TempStudent from '../../../../../../models/TempStudent';
import Submission from '../../../../../../models/Submission';
import { getUserFromToken } from '../../../../../../lib/auth';
import { canRemoveExam } from '../../../../../../lib/examUtils';

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

    // Check if exam can be removed (only after it has ended)
    if (!canRemoveExam(exam)) {
      return NextResponse.json(
        { message: 'Can only remove exams that have ended' },
        { status: 400 }
      );
    }

    // Remove all related data
    await Promise.all([
      // Remove exam
      Exam.findByIdAndDelete(examId),
      // Remove temporary student credentials
      TempStudent.deleteMany({ examId }),
      // Remove submissions
      Submission.deleteMany({ exam: examId })
    ]);

    return NextResponse.json({
      message: 'Exam and all related data removed successfully'
    });

  } catch (error) {
    console.error('Error removing exam:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}