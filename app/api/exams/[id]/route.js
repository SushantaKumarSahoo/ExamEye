import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Exam from '../../../../models/Exam';
import { getUserFromToken } from '../../../../lib/auth';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'No token provided' },
        { 
          status: 401,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { 
          status: 401,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const { id: examId } = await params;
    let exam;

    if (user.role === 'admin') {
      // Admin can see full exam details including correct answers
      exam = await Exam.findOne({ _id: examId, createdBy: user._id });
    } else {
      // Students can only see active exams without correct answers
      exam = await Exam.findOne({ _id: examId, status: 'active' })
        .select('-questions.correctAnswer');
    }

    if (!exam) {
      return NextResponse.json(
        { message: 'Exam not found or not accessible' },
        { 
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    return NextResponse.json({ exam }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}