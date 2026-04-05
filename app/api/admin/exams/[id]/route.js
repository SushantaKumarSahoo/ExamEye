import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Exam from '../../../../../models/Exam';
import { getUserFromToken } from '../../../../../lib/auth';

export async function GET(request, { params }) {
  try {
    console.log('\n🔍 [API] GET /api/admin/exams/[id]');
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    console.log('🔑 Auth header exists:', !!authHeader);
    console.log('🔑 Auth header preview:', authHeader ? authHeader.substring(0, 30) + '...' : 'null');
    
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

    const { id } = await params;
    console.log('📋 Exam ID from params:', id);

    // Get exam details
    const exam = await Exam.findById(id);
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

    console.log('✅ Exam details fetched successfully');
    return NextResponse.json({ exam });

  } catch (error) {
    console.error('❌ Error fetching exam:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
