import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import { getUserFromToken } from '../../../../lib/auth';

// In-memory storage for screenshots (in production, use Redis or database)
const screenshots = new Map();

export async function POST(request) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);

    if (!user || (user.role !== 'student' && user.role !== 'temp_student')) {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const { examId, screenshot, timestamp } = await request.json();

    // Store screenshot with student ID and exam ID
    const key = `${examId}_${user._id}`;
    screenshots.set(key, {
      screenshot,
      timestamp: timestamp || Date.now(),
      studentId: user._id,
      studentEmail: user.email,
      examId
    });

    // Clean up old screenshots (older than 1 minute)
    const oneMinuteAgo = Date.now() - 60000;
    screenshots.forEach((value, key) => {
      if (value.timestamp < oneMinuteAgo) {
        screenshots.delete(key);
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error saving screenshot:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
