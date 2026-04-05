import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import ActivityLog from '../../../../../models/ActivityLog';
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

    const { examId, type, description, details, severity, metadata } = await request.json();

    // Create activity log
    await ActivityLog.create({
      exam: examId,
      student: user._id,
      studentModel: user.role === 'temp_student' ? 'TempStudent' : 'User',
      studentEmail: user.email,
      type,
      description,
      details,
      severity: severity || 'low',
      metadata
    });

    // Update alert count if severity is high or critical
    if (severity === 'high' || severity === 'critical') {
      const activity = await StudentActivity.findOne({
        exam: examId,
        student: user._id
      });

      if (activity) {
        activity.alertCount += 1;
        
        // Update status based on alert count
        if (activity.alertCount >= 5) {
          activity.status = 'flagged';
        } else if (activity.alertCount >= 2) {
          activity.status = 'suspicious';
        }
        
        await activity.save();
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
