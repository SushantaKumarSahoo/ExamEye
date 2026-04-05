import { NextResponse } from 'next/server';
import connectDB from '../../../../../../lib/mongodb';
import Exam from '../../../../../../models/Exam';
import StudentActivity from '../../../../../../models/StudentActivity';
import { getUserFromToken } from '../../../../../../lib/auth';

export async function GET(request, { params }) {
  try {
    console.log('\n🔍 [API] GET /api/admin/live-monitor/[examId]/students');
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    console.log('🔑 Auth header exists:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No token provided or invalid format');
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('🔑 Token extracted, length:', token.length);
    
    const user = await getUserFromToken(token);
    console.log('👤 User from token:', user ? { id: user._id, role: user.role, email: user.email } : 'null');

    if (!user || user.role !== 'admin') {
      console.log('❌ Unauthorized: User is not admin');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { examId } = await params;
    console.log('📋 Exam ID from params:', examId);

    // Get exam details
    const exam = await Exam.findById(examId);
    console.log('📚 Exam found:', !!exam);
    
    if (!exam) {
      console.log('❌ Exam not found');
      return NextResponse.json({ message: 'Exam not found' }, { status: 404 });
    }

    // Verify admin owns this exam
    console.log('🔐 Checking ownership - Exam creator:', exam.createdBy.toString(), 'User:', user._id.toString());
    if (exam.createdBy.toString() !== user._id.toString()) {
      console.log('❌ Unauthorized: User does not own this exam');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Get active students from database
    console.log('🔍 Querying StudentActivity collection...');
    const activeStudents = await StudentActivity.find({
      exam: examId,
      status: { $in: ['active', 'suspicious', 'flagged'] }
    })
    .sort({ lastActivity: -1 })
    .lean();

    console.log('👥 Active students found:', activeStudents.length);
    activeStudents.forEach((student, index) => {
      console.log(`  ${index + 1}. ${student.studentName} (${student.studentEmail}) - Status: ${student.status}`);
    });

    // Format response
    const formattedStudents = activeStudents.map(student => ({
      _id: student.student.toString(),
      name: student.studentName,
      email: student.studentEmail,
      status: student.status,
      alertCount: student.alertCount,
      checks: student.systemChecks,
      startedAt: student.startedAt,
      lastActivity: student.lastActivity
    }));

    console.log('✅ Returning', formattedStudents.length, 'students');
    return NextResponse.json({ students: formattedStudents });

  } catch (error) {
    console.error('❌ Error fetching active students:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
