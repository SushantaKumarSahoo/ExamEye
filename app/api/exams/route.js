import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Exam from '../../../models/Exam';
import Submission from '../../../models/Submission';
import { getUserFromToken } from '../../../lib/auth';
import { updateExamStatuses } from '../../../lib/examStatusUpdater';

export async function GET(request) {
  try {
    await connectDB();
    
    // Update exam statuses before fetching
    await updateExamStatuses();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    let exams;
    if (user.role === 'admin') {
      // Admin can see all exams they created
      exams = await Exam.find({ createdBy: user._id })
        .sort({ createdAt: -1 });
    } else if (user.role === 'temp_student') {
      // Temporary students can only see their specific exam
      console.log('\n' + '='.repeat(60));
      console.log('🔑 TEMP STUDENT EXAM LOOKUP');
      console.log('='.repeat(60));
      console.log('👤 User ID:', user._id);
      console.log('📋 Looking for Exam ID:', user.examId);
      console.log('='.repeat(60));
      
      const tempStudentExam = await Exam.findById(user.examId);
      
      if (tempStudentExam) {
        console.log('✅ EXAM FOUND IN DATABASE');
        console.log('='.repeat(60));
        console.log('🆔 Database Exam ID:', tempStudentExam._id);
        console.log('📋 Database Title:', tempStudentExam.title);
        console.log('📄 Database Description:', tempStudentExam.description);
        console.log('⏱️ Database Duration:', tempStudentExam.duration);
        console.log('📊 Database Total Marks:', tempStudentExam.totalMarks);
        console.log('🔄 Database Status:', tempStudentExam.status);
        console.log('='.repeat(60) + '\n');
        
        // Check if temp student has already submitted
        const existingSubmission = await Submission.findOne({
          exam: tempStudentExam._id,
          tempStudent: user._id
        });

        exams = [{
          _id: tempStudentExam._id,
          title: tempStudentExam.title,
          description: tempStudentExam.description,
          duration: tempStudentExam.duration,
          totalMarks: tempStudentExam.totalMarks,
          status: tempStudentExam.status,
          startTime: tempStudentExam.startTime,
          endTime: tempStudentExam.endTime,
          createdAt: tempStudentExam.createdAt,
          questionCount: tempStudentExam.questions?.length || 0,
          isTemporary: true,
          hasSubmitted: !!existingSubmission
        }];
      } else {
        console.log('❌ NO EXAM FOUND FOR ID:', user.examId);
        console.log('='.repeat(60) + '\n');
        exams = [];
      }
    } else {
      // Regular students can see all active exams
      const studentExams = await Exam.find({ status: 'active' })
        .sort({ createdAt: -1 });
      
      // Transform exams for students - remove questions but keep count
      const examIds = studentExams.map(exam => exam._id);
      const submissions = await Submission.find({
        exam: { $in: examIds },
        student: user._id
      });
      
      const submittedExamIds = new Set(submissions.map(sub => sub.exam.toString()));
      
      exams = studentExams.map(exam => {
        console.log('📋 Regular student exam data:', {
          title: exam.title,
          description: exam.description,
          examId: exam._id
        });
        
        return {
          _id: exam._id,
          title: exam.title,
          description: exam.description,
          duration: exam.duration,
          totalMarks: exam.totalMarks,
          status: exam.status,
          startTime: exam.startTime,
          endTime: exam.endTime,
          createdAt: exam.createdAt,
          questionCount: exam.questions?.length || 0,
          hasSubmitted: submittedExamIds.has(exam._id.toString())
        };
      });
    }

    return NextResponse.json({ exams });

  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}