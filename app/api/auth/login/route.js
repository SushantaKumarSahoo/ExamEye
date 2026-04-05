import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import TempStudent from '../../../../models/TempStudent';
import AdminCode from '../../../../models/AdminCode';
import Exam from '../../../../models/Exam';
import { generateToken } from '../../../../lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    await connectDB();

    const { email, password, username, adminCode } = await request.json();

    // Validate input
    if ((!email && !username) || !password) {
      return NextResponse.json(
        { message: 'Email/Username and password are required' },
        { status: 400 }
      );
    }

    // First, try to find regular user
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (username) {
      user = await User.findOne({ username });
    }

    // If no regular user found, check for temporary student credentials
    if (!user && username) {
      const tempStudent = await TempStudent.findOne({
        username: username,
        expiresAt: { $gt: new Date() }
      }).populate('examId');

      if (tempStudent) {
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, tempStudent.hashedPassword);
        if (isPasswordValid) {
          // Update login time
          tempStudent.loginTime = new Date();
          tempStudent.isUsed = true;
          await tempStudent.save();

          // Generate token for temporary student
          const token = generateToken(tempStudent._id, 'temp_student');

          return NextResponse.json({
            message: 'Login successful',
            token,
            user: {
              id: tempStudent._id,
              username: tempStudent.username,
              email: tempStudent.email,
              role: 'temp_student',
              examId: tempStudent.examId._id,
              examTitle: tempStudent.examId.title,
              examDuration: tempStudent.examId.duration,
              isTemporary: true
            }
          });
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Account is deactivated. Please contact support.' },
        { status: 401 }
      );
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // For admin users, verify admin code if provided
    if (user.role === 'admin' && adminCode) {
      const validAdminCode = await AdminCode.findOne({
        code: adminCode,
        companyId: user.companyId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (!validAdminCode) {
        return NextResponse.json(
          { message: 'Invalid or expired admin code' },
          { status: 401 }
        );
      }
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password)
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName()
    };

    // Add role-specific data
    if (user.role === 'student') {
      userData.studentId = user.studentId;
      userData.department = user.department;
    }

    return NextResponse.json({
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}