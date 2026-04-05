import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Submission from '../../../../models/Submission';
import { getUserFromToken } from '../../../../lib/auth';

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

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { id: resultId } = await params;
    
    // Find result and populate exam details
    const result = await Submission.findOne({ 
      _id: resultId,
      $or: [
        { student: user._id },
        { tempStudent: user._id }
      ]
    }).populate('exam', 'title description duration totalMarks');

    if (!result) {
      return NextResponse.json(
        { message: 'Result not found' },
        { status: 404 }
      );
    }

    // Format the result to match expected structure
    const formattedResult = {
      _id: result._id,
      exam: result.exam,
      student: result.student || result.tempStudent,
      studentName: result.studentName,
      studentEmail: result.studentEmail,
      answers: result.answers,
      score: result.obtainedMarks,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      submittedAt: result.submittedAt,
      duration: result.duration,
      statistics: result.getStatistics()
    };

    return NextResponse.json({ result: formattedResult });

  } catch (error) {
    console.error('Error fetching result:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}