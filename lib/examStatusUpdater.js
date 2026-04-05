import connectDB from './mongodb';
import Exam from '../models/Exam';
import User from '../models/User';
import TempStudent from '../models/TempStudent';

let lastUpdateTime = 0;
const UPDATE_INTERVAL = 60000; // 1 minute

export async function updateExamStatuses() {
  const now = Date.now();
  
  // Throttle updates to once per minute
  if (now - lastUpdateTime < UPDATE_INTERVAL) {
    return;
  }
  
  lastUpdateTime = now;
  
  try {
    await connectDB();
    
    const currentTime = new Date();
    let updatedCount = 0;

    // Find exams that should start (status: draft, startTime <= now)
    const examsToStart = await Exam.find({
      status: 'draft',
      startTime: { $lte: currentTime }
    });

    for (const exam of examsToStart) {
      await Exam.findByIdAndUpdate(exam._id, { status: 'active' });
      updatedCount++;
    }

    // Find exams that should end (status: active, endTime <= now)
    const examsToEnd = await Exam.find({
      status: 'active',
      endTime: { $lte: currentTime }
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
            expiredAt: currentTime
          }
        }
      );
      
      updatedCount++;
    }

    // Clean up expired temporary students
    const expiredStudents = await TempStudent.deleteMany({ 
      expiresAt: { $lt: currentTime } 
    });

    if (updatedCount > 0) {
      console.log(`Updated ${updatedCount} exam statuses at ${currentTime.toISOString()}`);
    }

    if (expiredStudents.deletedCount > 0) {
      console.log(`Cleaned up ${expiredStudents.deletedCount} expired temporary students`);
    }

    return updatedCount;

  } catch (error) {
    console.error('Error updating exam statuses:', error);
    return 0;
  }
}