import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import StudentActivity from '../../../../../models/StudentActivity';
import ActivityLog from '../../../../../models/ActivityLog';
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

    const { examId, systemChecks, ipAddress, userAgent } = await request.json();

    // Check if activity already exists
    let activity = await StudentActivity.findOne({
      exam: examId,
      student: user._id
    });

    if (activity) {
      // Update existing activity
      activity.status = 'active';
      activity.systemChecks = systemChecks;
      activity.lastActivity = new Date();
      activity.ipAddress = ipAddress;
      activity.userAgent = userAgent;
      await activity.save();
    } else {
      // Create new activity
      activity = await StudentActivity.create({
        exam: examId,
        student: user._id,
        studentModel: user.role === 'temp_student' ? 'TempStudent' : 'User',
        studentEmail: user.email,
        studentName: user.username || user.email,
        status: 'active',
        systemChecks,
        ipAddress,
        userAgent
      });
    }

    // Log exam start
    await ActivityLog.create({
      exam: examId,
      student: user._id,
      studentModel: user.role === 'temp_student' ? 'TempStudent' : 'User',
      studentEmail: user.email,
      type: 'exam_started',
      description: 'Student started the exam',
      details: `Camera: ${systemChecks.camera ? '✓' : '✗'}, Mic: ${systemChecks.microphone ? '✓' : '✗'}, Network: ${systemChecks.network ? '✓' : '✗'}`,
      severity: 'low',
      metadata: { systemChecks }
    });

    return NextResponse.json({ 
      success: true,
      activityId: activity._id 
    });

  } catch (error) {
    console.error('Error starting activity:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
