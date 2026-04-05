import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import TempStudent from '../../../../../models/TempStudent';
import Exam from '../../../../../models/Exam';
import { getUserFromToken } from '../../../../../lib/auth';

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

    const { examId } = await params;

    // Get exam details
    const exam = await Exam.findById(examId);
    if (!exam) {
      return NextResponse.json(
        { message: 'Exam not found' },
        { status: 404 }
      );
    }

    // Get temporary credentials for this exam
    const tempCredentials = await TempStudent.find({ 
      examId: examId,
      expiresAt: { $gt: new Date() } // Only active credentials
    }).select('email username password hashedPassword isUsed loginTime expiresAt');

    return NextResponse.json({
      exam: {
        id: exam._id,
        title: exam.title,
        description: exam.description
      },
      credentials: tempCredentials.map(cred => ({
        email: cred.email,
        username: cred.username,
        password: cred.password || 'Password cleared after email sending',
        isUsed: cred.isUsed,
        loginTime: cred.loginTime,
        expiresAt: cred.expiresAt
      })),
      loginUrl: 'ExamEye Secure Browser Application',
      totalCredentials: tempCredentials.length
    });

  } catch (error) {
    console.error('Error fetching temp credentials:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}