import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import AdminCode from '../../../../models/AdminCode';
import Company from '../../../../models/Company';
import { generateToken } from '../../../../lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    
    const requestData = await request.json();
    const { 
      username, 
      email, 
      password, 
      role, 
      firstName, 
      lastName, 
      studentId, 
      department, 
      adminCode,
      organizationName
    } = requestData;
    
    let { companyId, companyName } = requestData;
    let validAdminCode = null;

    // Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate username format
    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { message: 'Username must be at least 3 characters and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Validate password strength based on role
    if (role === 'superadmin') {
      if (password.length < 12 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
        return NextResponse.json(
          { message: 'Super admin password must be at least 12 characters with uppercase, lowercase, number, and special character' },
          { status: 400 }
        );
      }
    } else if (role === 'admin') {
      if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
        return NextResponse.json(
          { message: 'Admin password must be at least 8 characters with uppercase, lowercase, number, and special character' },
          { status: 400 }
        );
      }
    } else {
      if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        return NextResponse.json(
          { message: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
          { status: 400 }
        );
      }
    }

    // Validate admin code if registering as admin
    if (role === 'admin') {
      if (!adminCode) {
        return NextResponse.json(
          { message: 'Admin code is required for admin registration' },
          { status: 400 }
        );
      }

      // Verify admin code exists and is valid
      validAdminCode = await AdminCode.findOne({
        code: adminCode,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).populate('company');

      if (!validAdminCode) {
        return NextResponse.json(
          { message: 'Invalid or expired admin code. Please contact your system administrator.' },
          { status: 400 }
        );
      }

      // Set company information from the admin code
      companyId = validAdminCode.companyId;
      companyName = validAdminCode.company.name;
    }



    // Validate student ID format if provided
    if (role === 'student' && studentId && !/^[A-Z0-9]{6,12}$/.test(studentId)) {
      return NextResponse.json(
        { message: 'Student ID should be 6-12 characters (letters and numbers only)' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json(
          { message: 'An account with this email already exists' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { message: 'This username is already taken' },
          { status: 400 }
        );
      }
    }

    // Check if student ID is already taken (if provided)
    if (studentId) {
      const existingStudentId = await User.findOne({ studentId });
      if (existingStudentId) {
        return NextResponse.json(
          { message: 'This student ID is already registered' },
          { status: 400 }
        );
      }
    }

    // Create new user
    const userData = {
      username,
      email,
      password,
      role: role || 'student'
    };

    // Add optional fields if provided
    if (firstName) userData.firstName = firstName;
    if (lastName) userData.lastName = lastName;
    
    // Add role-specific fields
    if (role === 'student') {
      if (studentId) userData.studentId = studentId;
      if (department) userData.department = department;
    } else if (role === 'admin') {
      if (companyName) userData.companyName = companyName;
      if (companyId) userData.companyId = companyId;
      if (adminCode) userData.adminVerificationCode = adminCode;
      
      // Set approvedBy to the super admin who generated the admin code
      if (validAdminCode && validAdminCode.generatedBy) {
        userData.approvedBy = validAdminCode.generatedBy;
        userData.isApproved = true; // Auto-approve since they have valid admin code
      }
    } else if (role === 'superadmin') {
      userData.permissions = ['manage_admins', 'generate_codes', 'view_analytics', 'system_settings'];
      if (organizationName) userData.organizationName = organizationName;
    }

    const user = new User(userData);
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password)
    const responseUserData = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    // Add role-specific data
    if (user.role === 'student') {
      responseUserData.studentId = user.studentId;
      responseUserData.department = user.department;
    }

    return NextResponse.json({
      message: 'Account created successfully! Welcome to ExamEye.',
      token,
      user: responseUserData
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { message: `This ${field} is already registered` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}