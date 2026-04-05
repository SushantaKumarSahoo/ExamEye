import { NextResponse } from 'next/server';

// In-memory storage for active students
// In production, use Redis or database
const activeStudents = new Map();

export async function GET() {
  try {
    // Clean up old entries (older than 60 seconds)
    const sixtySecondsAgo = Date.now() - 60000;
    for (const [key, student] of activeStudents.entries()) {
      if (student.lastSeen < sixtySecondsAgo) {
        activeStudents.delete(key);
      }
    }
    
    const students = Array.from(activeStudents.values());
    
    return NextResponse.json({
      success: true,
      students,
      count: students.length
    });
  } catch (error) {
    console.error('Error fetching available students:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { studentId, examId, action } = await request.json();
    
    if (action === 'register') {
      // Register student as available
      activeStudents.set(studentId, {
        studentId,
        examId,
        lastSeen: Date.now(),
        status: 'ready'
      });
      
      console.log(`📝 Student registered: ${studentId} for exam ${examId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Student registered',
        studentId,
        examId
      });
    } else if (action === 'heartbeat') {
      // Update last seen timestamp
      const student = activeStudents.get(studentId);
      if (student) {
        student.lastSeen = Date.now();
        activeStudents.set(studentId, student);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Heartbeat received'
      });
    } else if (action === 'unregister') {
      // Remove student
      activeStudents.delete(studentId);
      
      console.log(`📝 Student unregistered: ${studentId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Student unregistered'
      });
    }
    
    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error managing student:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
