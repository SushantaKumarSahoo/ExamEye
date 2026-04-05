import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import StudentActivity from '../../../../../models/StudentActivity';
import { getUserFromToken } from '../../../../../lib/auth';

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

    const { examId, systemChecks, status, alertCount } = await request.json();

    // Prepare update object
    const updateData = {
      systemChecks,
      status: status || 'active',
      lastActivity: new Date()
    };

    // Update alertCount if provided
    if (alertCount !== undefined) {
      updateData.alertCount = alertCount;
    }

    // Update activity
    const activity = await StudentActivity.findOneAndUpdate(
      { exam: examId, student: user._id },
      { $set: updateData },
      { new: true }
    );

    if (!activity) {
      return NextResponse.json({ message: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
