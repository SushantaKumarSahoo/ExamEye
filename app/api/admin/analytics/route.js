import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import StudentActivity from '../../../../models/StudentActivity';
import ActivityLog from '../../../../models/ActivityLog';
import Submission from '../../../../models/Submission';
import Exam from '../../../../models/Exam';
import { getUserFromToken } from '../../../../lib/auth';

export async function GET(request) {
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

    // Get all exams for this admin
    const exams = await Exam.find({ createdBy: user._id }).select('_id title');
    const examIds = exams.map(e => e._id);

    // Get AI monitoring statistics
    const totalActivities = await StudentActivity.countDocuments({ exam: { $in: examIds } });
    const activeNow = await StudentActivity.countDocuments({ 
      exam: { $in: examIds },
      status: { $in: ['active', 'suspicious', 'flagged'] }
    });
    const flaggedStudents = await StudentActivity.countDocuments({ 
      exam: { $in: examIds },
      status: 'flagged'
    });
    const suspiciousStudents = await StudentActivity.countDocuments({ 
      exam: { $in: examIds },
      status: 'suspicious'
    });

    // Get total alerts
    const totalAlerts = await ActivityLog.countDocuments({ 
      exam: { $in: examIds },
      severity: { $in: ['high', 'critical'] }
    });

    // Get recent AI events (last 50)
    const recentEvents = await ActivityLog.find({ 
      exam: { $in: examIds }
    })
    .sort({ timestamp: -1 })
    .limit(50)
    .populate('exam', 'title')
    .lean();

    // Get event type distribution
    const eventDistribution = await ActivityLog.aggregate([
      { $match: { exam: { $in: examIds } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get severity distribution
    const severityDistribution = await ActivityLog.aggregate([
      { $match: { exam: { $in: examIds } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    // Get hourly activity (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const hourlyActivity = await ActivityLog.aggregate([
      { 
        $match: { 
          exam: { $in: examIds },
          timestamp: { $gte: twentyFourHoursAgo }
        } 
      },
      {
        $group: {
          _id: { 
            hour: { $hour: '$timestamp' },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1, '_id.hour': 1 } }
    ]);

    // Get top flagged students
    const topFlaggedStudents = await StudentActivity.find({ 
      exam: { $in: examIds },
      alertCount: { $gt: 0 }
    })
    .sort({ alertCount: -1 })
    .limit(10)
    .populate('exam', 'title')
    .lean();

    // Get camera/microphone statistics
    const systemCheckStats = await StudentActivity.aggregate([
      { $match: { exam: { $in: examIds } } },
      {
        $group: {
          _id: null,
          cameraEnabled: { $sum: { $cond: ['$systemChecks.camera', 1, 0] } },
          microphoneEnabled: { $sum: { $cond: ['$systemChecks.microphone', 1, 0] } },
          fullscreenEnabled: { $sum: { $cond: ['$systemChecks.fullscreen', 1, 0] } },
          networkConnected: { $sum: { $cond: ['$systemChecks.network', 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);

    return NextResponse.json({
      overview: {
        totalActivities,
        activeNow,
        flaggedStudents,
        suspiciousStudents,
        totalAlerts
      },
      recentEvents: recentEvents.map(event => ({
        id: event._id,
        examTitle: event.exam?.title || 'Unknown',
        studentEmail: event.studentEmail,
        type: event.type,
        description: event.description,
        details: event.details,
        severity: event.severity,
        timestamp: event.timestamp
      })),
      eventDistribution,
      severityDistribution,
      hourlyActivity,
      topFlaggedStudents: topFlaggedStudents.map(student => ({
        studentName: student.studentName,
        studentEmail: student.studentEmail,
        examTitle: student.exam?.title || 'Unknown',
        alertCount: student.alertCount,
        status: student.status,
        lastActivity: student.lastActivity
      })),
      systemCheckStats: systemCheckStats[0] || {
        cameraEnabled: 0,
        microphoneEnabled: 0,
        fullscreenEnabled: 0,
        networkConnected: 0,
        total: 0
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
