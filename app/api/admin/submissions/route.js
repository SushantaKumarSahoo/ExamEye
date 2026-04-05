import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Submission from '../../../../models/Submission';
import { getUserFromToken } from '../../../../lib/auth';

export async function GET(request) {
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

    // Get all submissions for exams created by this admin
    const submissions = await Submission.find()
      .populate({
        path: 'exam',
        match: { createdBy: user._id },
        select: 'title createdBy'
      })
      .populate('student', 'username email')
      .populate('tempStudent', 'username email')
      .sort({ submittedAt: -1 });

    // Filter out submissions where exam is null (not created by this admin)
    const filteredSubmissions = submissions.filter(submission => submission.exam !== null);

    console.log(`📊 Found ${filteredSubmissions.length} total submissions for admin ${user.username}`);

    return NextResponse.json({ 
      submissions: filteredSubmissions.map(sub => {
        // Handle both regular students and temporary students
        const studentInfo = sub.student || sub.tempStudent;
        const studentName = sub.studentName || (studentInfo ? studentInfo.username : 'Unknown');
        const studentEmail = sub.studentEmail || (studentInfo ? studentInfo.email : 'Unknown');

        return {
          _id: sub._id,
          exam: sub.exam._id,
          examTitle: sub.exam.title,
          student: studentName,
          studentEmail: studentEmail,
          studentType: sub.student ? 'regular' : 'temporary',
          score: sub.obtainedMarks,
          totalMarks: sub.totalMarks,
          percentage: sub.percentage,
          submittedAt: sub.submittedAt,
          duration: sub.duration
        };
      })
    });

  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}