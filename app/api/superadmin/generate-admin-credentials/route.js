import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Company from '../../../../models/Company';
import AdminCode from '../../../../models/AdminCode';
import { getUserFromToken } from '../../../../lib/auth';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

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

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { message: 'Super admin access required' },
        { status: 403 }
      );
    }

    const { companyId, companyName, companyEmail } = await request.json();

    if (!companyId || !companyName) {
      return NextResponse.json(
        { message: 'Company ID and name are required' },
        { status: 400 }
      );
    }

    // Find or create the company
    let company = await Company.findOne({ companyId: companyId.toUpperCase() });
    
    if (!company) {
      // Create company if it doesn't exist
      company = new Company({
        name: companyName,
        companyId: companyId.toUpperCase(),
        email: companyEmail || `admin@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        subscriptionPlan: 'trial',
        subscriptionStatus: 'trial',
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        maxAdmins: 2,
        maxExams: 10,
        maxStudents: 100,
        isActive: true,
        createdBy: user._id
      });
      
      await company.save();
    }

    // Generate admin username (company name + admin)
    const baseUsername = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + 'admin';
    let adminUsername = baseUsername;
    let counter = 1;
    
    // Ensure username is unique
    while (await User.findOne({ username: adminUsername })) {
      adminUsername = baseUsername + counter;
      counter++;
    }

    // Generate admin email
    const adminEmail = companyEmail || `admin@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

    // Generate secure password
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
      let password = '';
      
      // Ensure at least one of each required character type
      password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
      password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
      password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
      password += '@#$%&*'[Math.floor(Math.random() * 6)]; // Special char
      
      // Fill remaining characters
      for (let i = 4; i < 12; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
      }
      
      // Shuffle the password
      return password.split('').sort(() => Math.random() - 0.5).join('');
    };

    const adminPassword = generatePassword();

    // Generate admin code
    let adminCode;
    let isCodeUnique = false;
    while (!isCodeUnique) {
      adminCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const existingCode = await AdminCode.findOne({ code: adminCode });
      if (!existingCode) {
        isCodeUnique = true;
      }
    }

    // Create admin code record
    const adminCodeRecord = new AdminCode({
      code: adminCode,
      companyId: companyId.toUpperCase(),
      company: company._id, // Add the company ObjectId reference
      generatedBy: user._id,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      isActive: true
    });

    await adminCodeRecord.save();

    // Create admin user (password will be hashed by User model's pre-save middleware)
    const adminUser = new User({
      username: adminUsername,
      email: adminEmail,
      password: adminPassword, // Use plain password - model will hash it
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      companyId: companyId.toUpperCase(),
      companyName: companyName,
      adminVerificationCode: adminCode, // Add the admin verification code
      approvedBy: user._id, // Add the super admin who approved/created this admin
      isApproved: true, // Auto-approve since created by super admin
      isActive: true,
      permissions: ['create_exams', 'manage_students', 'view_results', 'manage_settings']
    });

    await adminUser.save();

    // Send email with credentials
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials-box { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .credential-item { margin: 15px 0; padding: 10px; background: #f0f0f0; border-radius: 5px; }
            .credential-label { font-weight: bold; color: #667eea; display: block; margin-bottom: 5px; }
            .credential-value { font-family: 'Courier New', monospace; font-size: 16px; color: #333; word-break: break-all; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 ExamEye Admin Account Created</h1>
              <p>Welcome to ExamEye Examination Platform</p>
            </div>
            <div class="content">
              <h2>Hello ${companyName} Team!</h2>
              <p>Your admin account has been successfully created by the ExamEye Super Administrator. Below are your login credentials:</p>
              
              <div class="credentials-box">
                <h3>🔐 Login Credentials</h3>
                
                <div class="credential-item">
                  <span class="credential-label">Username:</span>
                  <span class="credential-value">${adminUsername}</span>
                </div>
                
                <div class="credential-item">
                  <span class="credential-label">Email:</span>
                  <span class="credential-value">${adminEmail}</span>
                </div>
                
                <div class="credential-item">
                  <span class="credential-label">Password:</span>
                  <span class="credential-value">${adminPassword}</span>
                </div>
                
                <div class="credential-item">
                  <span class="credential-label">Admin Verification Code:</span>
                  <span class="credential-value">${adminCode}</span>
                </div>
                
                <div class="credential-item">
                  <span class="credential-label">Company ID:</span>
                  <span class="credential-value">${companyId.toUpperCase()}</span>
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <ul>
                  <li>Please change your password immediately after first login</li>
                  <li>Keep your admin verification code secure</li>
                  <li>Do not share these credentials with unauthorized personnel</li>
                  <li>This email contains sensitive information - delete it after saving credentials securely</li>
                </ul>
              </div>

              <h3>📋 Your Subscription Details</h3>
              <ul>
                <li><strong>Plan:</strong> ${company.subscriptionPlan.toUpperCase()}</li>
                <li><strong>Status:</strong> ${company.subscriptionStatus}</li>
                <li><strong>Trial End Date:</strong> ${company.trialEndDate ? new Date(company.trialEndDate).toLocaleDateString() : 'N/A'}</li>
                <li><strong>Max Admins:</strong> ${company.maxAdmins}</li>
                <li><strong>Max Exams:</strong> ${company.maxExams}</li>
                <li><strong>Max Students:</strong> ${company.maxStudents}</li>
              </ul>

              <h3>🚀 Getting Started</h3>
              <ol>
                <li>Visit the ExamEye admin login page</li>
                <li>Enter your username and password</li>
                <li>Change your password in account settings</li>
                <li>Start creating exams and managing students</li>
              </ol>

              <center>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/login" class="button">
                  Login to Admin Dashboard
                </a>
              </center>

              <div class="footer">
                <p>This is an automated email from ExamEye. Please do not reply to this email.</p>
                <p>If you did not request this account, please contact support immediately.</p>
                <p>&copy; ${new Date().getFullYear()} ExamEye. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"ExamEye Admin" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: `ExamEye Admin Account Created - ${companyName}`,
        html: emailHTML
      });

      console.log('Admin credentials email sent to:', adminEmail);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails, just log it
    }

    return NextResponse.json({
      message: 'Admin credentials generated successfully and email sent',
      credentials: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword, // Return plain password for initial setup
        adminCode: adminCode,
        companyId: companyId.toUpperCase(),
        companyName: companyName
      }
    });

  } catch (error) {
    console.error('Error generating admin credentials:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}