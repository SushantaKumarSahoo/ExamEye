import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Exam from '../../../../../models/Exam';
import Submission from '../../../../../models/Submission';
import TempStudent from '../../../../../models/TempStudent';
import { getUserFromToken } from '../../../../../lib/auth';
import nodemailer from 'nodemailer';

export async function POST(request, { params }) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'No token provided' },
        { 
          status: 401,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);

    if (!user || (user.role !== 'student' && user.role !== 'temp_student')) {
      return NextResponse.json(
        { message: 'Student access required' },
        { 
          status: 403,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const { id: examId } = await params;
    const body = await request.json();
    const { answers, flaggedQuestions = {} } = body;

    console.log('📥 Received submission request:', {
      examId,
      userId: user._id,
      answersReceived: answers ? 'Yes' : 'No',
      answersType: Array.isArray(answers) ? 'Array' : typeof answers,
      answersLength: Array.isArray(answers) ? answers.length : Object.keys(answers || {}).length
    });

    // Find the exam
    const exam = await Exam.findOne({ _id: examId, status: 'active' });
    
    if (!exam) {
      return NextResponse.json(
        { message: 'Exam not found or not active' },
        { status: 404 }
      );
    }

    // Check if student has already submitted
    const existingSubmission = await Submission.findOne({
      exam: examId,
      $or: [
        { student: user._id },
        { tempStudent: user._id }
      ]
    });

    if (existingSubmission) {
      return NextResponse.json(
        { message: 'Exam already submitted' },
        { status: 400 }
      );
    }

    // Get student information
    let studentEmail = user.email;
    let studentName = user.username;
    
    if (user.role === 'temp_student') {
      const tempStudent = await TempStudent.findById(user._id);
      if (tempStudent) {
        studentEmail = tempStudent.email;
        studentName = tempStudent.username;
      }
    }

    // Calculate score
    let obtainedMarks = 0;
    const submissionAnswers = [];
    const startTime = new Date();

    // Ensure answers is an array
    const answersArray = Array.isArray(answers) ? answers : Object.values(answers || {});

    exam.questions.forEach((question, index) => {
      const studentAnswer = answersArray[index];
      let isCorrect = false;
      let marks = 0;

      // Handle different question types
      if (question.questionType === 'multiple-choice' || question.questionType === 'true-false') {
        isCorrect = studentAnswer === question.correctAnswer;
      } else if (question.questionType === 'multiple-answer') {
        // For multiple answer questions, compare arrays
        isCorrect = Array.isArray(studentAnswer) && Array.isArray(question.correctAnswer) &&
                   studentAnswer.length === question.correctAnswer.length &&
                   studentAnswer.every(ans => question.correctAnswer.includes(ans));
      }
      
      if (isCorrect) {
        marks = question.marks || 1;
        obtainedMarks += marks;
      }

      submissionAnswers.push({
        questionIndex: index,
        selectedAnswer: studentAnswer,
        isCorrect,
        marks
      });
    });

    const percentage = exam.totalMarks > 0 ? (obtainedMarks / exam.totalMarks) * 100 : 0;
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / (1000 * 60)); // Duration in minutes

    // Save submission
    const submission = new Submission({
      exam: examId,
      student: user.role === 'student' ? user._id : null,
      tempStudent: user.role === 'temp_student' ? user._id : null,
      studentEmail,
      studentName,
      answers: submissionAnswers,
      totalMarks: exam.totalMarks,
      obtainedMarks,
      percentage,
      startTime,
      endTime,
      duration,
      isCompleted: true,
      submittedAt: new Date(),
      flaggedQuestions: new Map(Object.entries(flaggedQuestions))
    });

    await submission.save();

    console.log('\n' + '='.repeat(60));
    console.log('✅ EXAM SUBMISSION SUCCESSFUL');
    console.log('='.repeat(60));
    console.log('👤 Student:', studentName);
    console.log('📧 Email:', studentEmail);
    console.log('📋 Exam:', exam.title);
    console.log('📊 Score:', `${obtainedMarks}/${exam.totalMarks} (${percentage.toFixed(1)}%)`);
    console.log('🆔 Submission ID:', submission._id);
    console.log('='.repeat(60) + '\n');

    // Send submission confirmation email to student
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS && studentEmail) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .logo {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .success-badge {
      background: #ecfdf5;
      color: #059669;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
      border: 1px solid #a7f3d0;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .info-box {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #10b981;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      color: #6b7280;
      font-weight: 500;
    }
    .value {
      color: #1f2937;
      font-weight: 600;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      text-align: center;
      border-radius: 0 0 10px 10px;
      color: #6b7280;
      font-size: 0.9rem;
    }
    .note-box {
      background: #fef3c7;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #fde68a;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">👁️ ExamEye</div>
    <h2 style="margin: 0;">Exam Submitted Successfully!</h2>
  </div>
  
  <div class="content">
    <div class="success-badge">
      ✅ Your responses have been recorded
    </div>

    <p style="font-size: 1.05rem;">Dear ${studentName},</p>
    
    <p>Thank you for completing the exam. Your responses have been successfully submitted and recorded in our system.</p>

    <div class="info-box">
      <h3 style="margin-top: 0; color: #1f2937;">Submission Details</h3>
      <div class="info-row">
        <span class="label">Exam:</span>
        <span class="value">${exam.title}</span>
      </div>
      <div class="info-row">
        <span class="label">Submitted At:</span>
        <span class="value">${new Date().toLocaleString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })} IST</span>
      </div>
      <div class="info-row">
        <span class="label">Questions Answered:</span>
        <span class="value">${submissionAnswers.length} of ${exam.questions.length}</span>
      </div>
      <div class="info-row">
        <span class="label">Submission ID:</span>
        <span class="value">${submission._id}</span>
      </div>
    </div>

    <div class="note-box">
      <p style="margin: 0; color: #92400e;">
        <strong>📊 Results:</strong> Your exam results will be shared with you once the instructor releases them. You will receive another email with your detailed results.
      </p>
    </div>

    <p style="margin-top: 30px; font-size: 1.1rem; color: #059669; font-weight: 600;">
      🎉 All the best!
    </p>

    <p style="color: #6b7280; font-size: 0.95rem;">
      We wish you success in your examination. If you have any questions or concerns about your submission, please contact your exam administrator.
    </p>
  </div>

  <div class="footer">
    <p style="margin: 10px 0;">Thank you for using ExamEye!</p>
    <p style="margin: 10px 0; font-size: 0.8rem;">
      This is an automated email. Please do not reply to this message.
    </p>
  </div>
</body>
</html>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: studentEmail,
          subject: `Exam Submitted Successfully - ${exam.title}`,
          html: emailHtml
        });

        console.log('✅ Submission confirmation email sent to:', studentEmail);
      } else {
        console.log('⚠️ Email not sent - credentials not configured or student email missing');
      }
    } catch (emailError) {
      console.error('❌ Failed to send submission email:', emailError);
      // Don't fail the submission if email fails
    }

    return NextResponse.json({
      message: 'Exam submitted successfully',
      resultId: submission._id,
      score: obtainedMarks,
      totalMarks: exam.totalMarks,
      percentage: percentage.toFixed(1)
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error) {
    console.error('Error submitting exam:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}