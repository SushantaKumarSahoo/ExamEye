import { NextResponse } from 'next/server';
import connectDB from '../../../../../../lib/mongodb';
import Submission from '../../../../../../models/Submission';
import Exam from '../../../../../../models/Exam';
import User from '../../../../../../models/User';
import TempStudent from '../../../../../../models/TempStudent';
import { getUserFromToken } from '../../../../../../lib/auth';

export async function GET(request, { params }) {
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

    // Verify that the exam belongs to this admin
    const exam = await Exam.findOne({ _id: examId, createdBy: user._id });
    if (!exam) {
      return NextResponse.json(
        { message: 'Exam not found or access denied' },
        { status: 404 }
      );
    }

    // Get all submissions for this specific exam
    const submissions = await Submission.find({ exam: examId })
      .populate('student', 'username email')
      .populate('tempStudent', 'username email')
      .sort({ submittedAt: -1 });

    console.log(`📊 Found ${submissions.length} submissions for exam ${examId}`);

    return NextResponse.json({ 
      submissions: submissions.map(sub => {
        // Handle both regular students and temporary students
        const studentInfo = sub.student || sub.tempStudent;
        const studentName = sub.studentName || (studentInfo ? studentInfo.username : 'Unknown');
        const studentEmail = sub.studentEmail || (studentInfo ? studentInfo.email : 'Unknown');

        return {
          _id: sub._id,
          student: studentName,
          studentEmail: studentEmail,
          studentType: sub.student ? 'regular' : 'temporary',
          score: sub.obtainedMarks,
          totalMarks: sub.totalMarks,
          percentage: sub.percentage,
          submittedAt: sub.submittedAt,
          duration: sub.duration,
          answers: sub.answers,
          flaggedQuestions: sub.flaggedQuestions ? Object.fromEntries(sub.flaggedQuestions) : {},
          statistics: sub.getStatistics()
        };
      })
    });

  } catch (error) {
    console.error('Error fetching exam submissions:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}