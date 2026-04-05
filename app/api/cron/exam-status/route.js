import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Exam from '@/models/Exam';
import User from '@/models/User';

export async function GET() {
  try {
    await connectDB();
    
    const now = new Date();
    let updatedCount = 0;

    // Find exams that should start (status: draft, startTime <= now)
    const examsToStart = await Exam.find({
      status: 'draft',
      startTime: { $lte: now }
    });

    for (const exam of examsToStart) {
      await Exam.findByIdAndUpdate(exam._id, { status: 'active' });
      updatedCount++;
    }

    // Find exams that should end (status: active, endTime <= now)
    const examsToEnd = await Exam.find({
      status: 'active',
      endTime: { $lte: now }
    });

    for (const exam of examsToEnd) {
      await Exam.findByIdAndUpdate(exam._id, { status: 'ended' });
      
      // Expire student credentials for this exam
      await User.updateMany(
        { 
          role: 'student',
          examId: exam._id,
          isTemporary: true
        },
        { 
          $set: { 
            isActive: false,
            expiredAt: now
          }
        }
      );
      
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} exams`,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}