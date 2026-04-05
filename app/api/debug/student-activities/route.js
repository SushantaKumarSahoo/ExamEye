import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import StudentActivity from '../../../../models/StudentActivity';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    
    console.log('🔍 [DEBUG] Checking StudentActivity records...');
    console.log('📋 Exam ID:', examId);
    
    const query = examId ? { exam: examId } : {};
    const activities = await StudentActivity.find(query).lean();
    
    console.log('📊 Total activities found:', activities.length);
    
    activities.forEach((activity, index) => {
      console.log(`\n${index + 1}. Student Activity:`);
      console.log('   Student:', activity.studentName, '(' + activity.studentEmail + ')');
      console.log('   Status:', activity.status);
      console.log('   Alert Count:', activity.alertCount);
      console.log('   Started:', activity.startedAt);
      console.log('   Last Activity:', activity.lastActivity);
      console.log('   System Checks:', activity.systemChecks);
    });
    
    return NextResponse.json({ 
      count: activities.length,
      activities: activities.map(a => ({
        id: a._id,
        studentName: a.studentName,
        studentEmail: a.studentEmail,
        status: a.status,
        alertCount: a.alertCount,
        startedAt: a.startedAt,
        lastActivity: a.lastActivity,
        systemChecks: a.systemChecks
      }))
    });
    
  } catch (error) {
    console.error('❌ Error fetching activities:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
