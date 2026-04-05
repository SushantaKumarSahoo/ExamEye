import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import { getUserFromToken } from '../../../../../lib/auth';

// Import the same screenshots Map from the POST route
// In production, use Redis or database
const screenshots = new Map();

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { studentId } = await params;
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');

    if (!examId) {
      return NextResponse.json({ message: 'Exam ID required' }, { status: 400 });
    }

    // Get screenshot for this student and exam
    const key = `${examId}_${studentId}`;
    const data = screenshots.get(key);

    if (!data) {
      return NextResponse.json({ 
        screenshot: null,
        message: 'No recent screenshot available'
      });
    }

    return NextResponse.json({
      screenshot: data.screenshot,
      timestamp: data.timestamp,
      studentEmail: data.studentEmail
    });

  } catch (error) {
    console.error('Error fetching screenshot:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
