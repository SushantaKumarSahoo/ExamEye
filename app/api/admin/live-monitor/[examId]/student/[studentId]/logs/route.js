import { NextResponse } from 'next/server';
import connectDB from '../../../../../../../../lib/mongodb';
import ActivityLog from '../../../../../../../../models/ActivityLog';
import { getUserFromToken } from '../../../../../../../../lib/auth';

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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { examId, studentId } = await params;

    // Get activity logs from database
    const logs = await ActivityLog.find({
      exam: examId,
      student: studentId
    })
    .sort({ timestamp: -1 })
    .limit(100)
    .lean();

    // Format logs for frontend
    const formattedLogs = logs.map(log => ({
      type: log.type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      description: log.description,
      details: log.details,
      severity: log.severity,
      timestamp: log.timestamp,
      metadata: log.metadata
    }));

    return NextResponse.json({ logs: formattedLogs });

  } catch (error) {
    console.error('Error fetching student logs:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
