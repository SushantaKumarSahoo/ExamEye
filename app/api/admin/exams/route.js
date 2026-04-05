import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Exam from '../../../../models/Exam';
import TempStudent from '../../../../models/TempStudent';
import Company from '../../../../models/Company';
import { getUserFromToken } from '../../../../lib/auth';
import { sendStudentCredentialsEmail } from '../../../../lib/email';
import { canCreateExam, canAddStudents } from '../../../../lib/subscriptionCheck';
import bcrypt from 'bcryptjs';

export async function POST(request) {
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

    // Check subscription and exam creation limits
    const examCheck = await canCreateExam(user.companyId);
    if (!examCheck.allowed) {
      return NextResponse.json(
        { 
          message: examCheck.message,
          subscriptionExpired: examCheck.subscriptionExpired,
          limitReached: examCheck.limitReached,
          currentCount: examCheck.currentCount,
          limit: examCheck.limit
        },
        { status: 403 }
      );
    }

    const examData = await request.json();

    console.log('\n' + '='.repeat(60));
    console.log('📝 EXAM CREATION - RECEIVED DATA');
    console.log('='.repeat(60));
    console.log('📋 Title:', examData.title);
    console.log('📄 Description:', examData.description);
    console.log('⏱️ Duration:', examData.duration);
    console.log('📊 Total Marks:', examData.totalMarks);
    console.log('❓ Questions Count:', examData.questions?.length || 0);
    console.log('👥 Student Emails:', examData.studentEmails?.length || 0);
    console.log('='.repeat(60) + '\n');

    // Validate required fields
    if (!examData.title || !examData.description || !examData.duration) {
      return NextResponse.json(
        { message: 'Title, description, and duration are required' },
        { status: 400 }
      );
    }

    // Questions are required during creation via Excel upload
    if (!examData.questions || examData.questions.length === 0) {
      return NextResponse.json(
        { message: 'Please upload questions via Excel file' },
        { status: 400 }
      );
    }

    if (!examData.studentEmails || examData.studentEmails.length === 0) {
      return NextResponse.json(
        { message: 'At least one student email is required' },
        { status: 400 }
      );
    }

    // Check student limit
    const studentCheck = await canAddStudents(user.companyId, examData.studentEmails.length);
    if (!studentCheck.allowed) {
      return NextResponse.json(
        { 
          message: studentCheck.message,
          subscriptionExpired: studentCheck.subscriptionExpired,
          limitReached: studentCheck.limitReached,
          limit: studentCheck.limit
        },
        { status: 403 }
      );
    }

    // Get company for linking
    const company = await Company.findOne({ companyId: user.companyId });
    if (!company) {
      return NextResponse.json(
        { message: 'Company not found' },
        { status: 404 }
      );
    }

    // Create new exam
    const exam = new Exam({
      ...examData,
      createdBy: user._id,
      company: company._id
    });

    await exam.save();

    console.log('\n' + '='.repeat(60));
    console.log('💾 EXAM SAVED TO DATABASE');
    console.log('='.repeat(60));
    console.log('🆔 Exam ID:', exam._id);
    console.log('📋 Saved Title:', exam.title);
    console.log('📄 Saved Description:', exam.description);
    console.log('⏱️ Saved Duration:', exam.duration);
    console.log('📊 Saved Total Marks:', exam.totalMarks);
    console.log('='.repeat(60) + '\n');

    // Clean up expired temporary students to avoid username conflicts
    await TempStudent.deleteMany({ expiresAt: { $lt: new Date() } });

    // Generate temporary credentials for each student
    const tempCredentials = [];

    // Helper function to generate unique username
    const generateUniqueUsername = async (email) => {
      let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (baseUsername.length < 3) baseUsername = 'student' + baseUsername;

      let username = baseUsername;
      let counter = 1;

      // Check against existing usernames in database
      while (await TempStudent.findOne({ username })) {
        username = baseUsername + counter;
        counter++;

        // Add exam ID suffix if counter gets too high
        if (counter > 100) {
          username = baseUsername + exam._id.toString().slice(-4) + counter;
        }
      }

      return username;
    };

    // Generate secure password
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      for (let i = 0; i < 8; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
      }
      return password;
    };

    for (const email of examData.studentEmails) {
      const username = await generateUniqueUsername(email);
      const password = generatePassword();
      const hashedPassword = await bcrypt.hash(password, 12);

      // Set expiration to 24 hours after exam end time or 7 days from now if no end time
      const expiresAt = examData.endTime
        ? new Date(new Date(examData.endTime).getTime() + 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const tempStudent = new TempStudent({
        examId: exam._id,
        email: email,
        username: username,
        password: password, // Store plain password temporarily for email
        hashedPassword: hashedPassword,
        expiresAt: expiresAt
      });

      await tempStudent.save();

      tempCredentials.push({
        email: email,
        username: username,
        password: password
      });
    }

    // Send emails to students with their credentials
    console.log(`\n📧 Attempting to send ${tempCredentials.length} emails...`);
    
    for (const credential of tempCredentials) {
      try {
        console.log(`📤 Sending email to: ${credential.email}`);
        const examUrl = `exameye://exam/${exam._id}?username=${encodeURIComponent(credential.username)}&password=${encodeURIComponent(credential.password)}`;
        await sendStudentCredentialsEmail(
          credential.email,
          exam.title,
          credential.username,
          credential.password,
          examUrl,
          exam._id.toString()
        );
        console.log(`✅ Email sent to: ${credential.email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${credential.email}:`, emailError);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎓 EXAM CREATED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('📝 Exam:', exam.title);
    console.log('👥 Students:', tempCredentials.length);
    console.log('🔗 Admin View:', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/admin/exam/${exam._id}`);
    console.log('🔑 Credentials:', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/admin/exam/${exam._id}/credentials`);
    console.log('🎓 Student Login: ExamEye Secure Browser Application');
    console.log('='.repeat(80));
    console.log('📋 GENERATED CREDENTIALS:');
    console.log('='.repeat(80));
    tempCredentials.forEach((cred, index) => {
      console.log(`${index + 1}. ${cred.email}`);
      console.log(`   👤 Username: ${cred.username}`);
      console.log(`   🔒 Password: ${cred.password}`);
      console.log('');
    });
    console.log('='.repeat(80) + '\n');

    // Note: Keeping plain passwords temporarily for admin viewing/testing
    // In production, consider clearing them after a shorter period for security
    // await TempStudent.updateMany(
    //   { examId: exam._id },
    //   { $unset: { password: 1 } }
    // );

    return NextResponse.json({
      message: 'Exam created successfully',
      exam: {
        id: exam._id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        status: exam.status
      }
    });

  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}