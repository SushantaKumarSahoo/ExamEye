import { NextResponse } from 'next/server';
import connectDB from '../../../../../../lib/mongodb';
import Exam from '../../../../../../models/Exam';
import Submission from '../../../../../../models/Submission';
import { getUserFromToken } from '../../../../../../lib/auth';
import nodemailer from 'nodemailer';

export async function POST(request, { params }) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id: examId } = await params;

    // Find the exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return NextResponse.json(
        { message: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if results already released
    if (exam.resultsReleased) {
      return NextResponse.json(
        { message: 'Results have already been released for this exam' },
        { status: 400 }
      );
    }

    // Get all submissions for this exam
    const submissions = await Submission.find({ exam: examId, isCompleted: true });

    if (submissions.length === 0) {
      return NextResponse.json(
        { message: 'No submissions found for this exam' },
        { status: 400 }
      );
    }

    // Update exam to mark results as released
    exam.resultsReleased = true;
    exam.resultsReleasedAt = new Date();
    exam.resultsReleasedBy = user._id;
    await exam.save();

    console.log('\n' + '='.repeat(60));
    console.log('📊 RELEASING RESULTS');
    console.log('='.repeat(60));
    console.log('📋 Exam:', exam.title);
    console.log('👥 Total Submissions:', submissions.length);
    console.log('👤 Released By:', user.username);
    console.log('='.repeat(60) + '\n');

    // Send result emails to all students
    let emailsSent = 0;
    let emailsFailed = 0;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      for (const submission of submissions) {
        try {
          const studentEmail = submission.studentEmail;
          const studentName = submission.studentName;

          if (!studentEmail) {
            console.log('⚠️ Skipping submission - no email:', submission._id);
            continue;
          }

          // Determine pass/fail status
          const passingPercentage = 40; // You can make this configurable
          const passed = submission.percentage >= passingPercentage;
          const status = passed ? 'Passed' : 'Failed';
          const statusColor = passed ? '#10b981' : '#ef4444';
          const statusEmoji = passed ? '🎉' : '📊';

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
      background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
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
    .result-badge {
      background: ${passed ? '#ecfdf5' : '#fef2f2'};
      color: ${statusColor};
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
      border: 2px solid ${passed ? '#a7f3d0' : '#fecaca'};
    }
    .result-badge h2 {
      margin: 0;
      font-size: 2rem;
    }
    .score-box {
      background: #f9fafb;
      padding: 25px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
      border-left: 4px solid ${statusColor};
    }
    .score-value {
      font-size: 3rem;
      font-weight: bold;
      color: ${statusColor};
      margin: 10px 0;
    }
    .info-box {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
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
    .message-box {
      background: ${passed ? '#ecfdf5' : '#fef3c7'};
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid ${passed ? '#a7f3d0' : '#fde68a'};
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">👁️ ExamEye</div>
    <h2 style="margin: 0;">Your Exam Results</h2>
  </div>
  
  <div class="content">
    <p style="font-size: 1.05rem;">Dear ${studentName},</p>
    
    <p>Your exam results have been released. Here are your detailed results:</p>

    <div class="result-badge">
      <div style="font-size: 3rem; margin-bottom: 10px;">${statusEmoji}</div>
      <h2>${status}</h2>
    </div>

    <div class="score-box">
      <div style="font-size: 1.1rem; color: #6b7280; margin-bottom: 10px;">Your Score</div>
      <div class="score-value">${submission.percentage.toFixed(1)}%</div>
      <div style="font-size: 1.2rem; color: #6b7280; margin-top: 10px;">
        ${submission.obtainedMarks} out of ${submission.totalMarks} marks
      </div>
    </div>

    <div class="info-box">
      <h3 style="margin-top: 0; color: #1f2937;">Exam Details</h3>
      <div class="info-row">
        <span class="label">Exam:</span>
        <span class="value">${exam.title}</span>
      </div>
      <div class="info-row">
        <span class="label">Total Questions:</span>
        <span class="value">${exam.questions.length}</span>
      </div>
      <div class="info-row">
        <span class="label">Correct Answers:</span>
        <span class="value">${submission.answers.filter(a => a.isCorrect).length}</span>
      </div>
      <div class="info-row">
        <span class="label">Submitted At:</span>
        <span class="value">${new Date(submission.submittedAt).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })} IST</span>
      </div>
      <div class="info-row">
        <span class="label">Duration:</span>
        <span class="value">${submission.duration || 0} minutes</span>
      </div>
    </div>

    <div class="message-box">
      <p style="margin: 0; color: ${passed ? '#047857' : '#92400e'};">
        ${passed 
          ? '<strong>🎉 Congratulations!</strong> You have successfully passed this exam. Keep up the excellent work!'
          : '<strong>📚 Keep Learning!</strong> Don\'t be discouraged. Review the material and you\'ll do better next time!'
        }
      </p>
    </div>

    <p style="color: #6b7280; font-size: 0.95rem; margin-top: 30px;">
      If you have any questions about your results, please contact your exam administrator.
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
            subject: `Exam Results Released - ${exam.title}`,
            html: emailHtml
          });

          emailsSent++;
          console.log(`✅ Result email sent to: ${studentEmail} (${submission.percentage.toFixed(1)}%)`);

        } catch (emailError) {
          emailsFailed++;
          console.error(`❌ Failed to send email to ${submission.studentEmail}:`, emailError.message);
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL SUMMARY');
      console.log('='.repeat(60));
      console.log('✅ Emails Sent:', emailsSent);
      console.log('❌ Emails Failed:', emailsFailed);
      console.log('📊 Total Submissions:', submissions.length);
      console.log('='.repeat(60) + '\n');
    } else {
      console.log('⚠️ Email credentials not configured - results marked as released but emails not sent');
    }

    return NextResponse.json({
      success: true,
      message: 'Results released successfully',
      emailsSent,
      emailsFailed,
      totalSubmissions: submissions.length
    });

  } catch (error) {
    console.error('Error releasing results:', error);
    return NextResponse.json(
      { message: 'Failed to release results', error: error.message },
      { status: 500 }
    );
  }
}
