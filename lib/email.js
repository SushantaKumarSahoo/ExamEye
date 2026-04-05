// Email utility for sending admin codes and other notifications
// In production, this would integrate with services like SendGrid, AWS SES, etc.

export const sendAdminCodeEmail = async (companyEmail, companyName, adminCode, expiryDate) => {
  // For development/demo purposes, we'll log the email content
  // In production, replace this with actual email service integration
  
  const emailContent = {
    to: companyEmail,
    subject: `ExamEye Admin Access Code for ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ExamEye Admin Access Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .code-box { background: white; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .code { font-size: 24px; font-weight: bold; color: #dc2626; letter-spacing: 2px; font-family: monospace; }
          .instructions { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛡️ ExamEye Admin Access</h1>
            <p>Your admin verification code is ready</p>
          </div>
          
          <div class="content">
            <h2>Hello ${companyName} Team,</h2>
            
            <p>Your ExamEye admin access code has been generated. Use this code to register and login as an administrator for your organization.</p>
            
            <div class="code-box">
              <p><strong>Your Admin Code:</strong></p>
              <div class="code">${adminCode}</div>
            </div>
            
            <div class="instructions">
              <h3>📋 How to Use This Code:</h3>
              <ol>
                <li><strong>Registration:</strong> Visit the admin registration page and enter this code along with your details</li>
                <li><strong>Login:</strong> Use this code during login for verification (if required)</li>
                <li><strong>Multiple Users:</strong> Any employee from your company can use this same code to register as an admin</li>
              </ol>
            </div>
            
            <p><strong>⏰ Important Details:</strong></p>
            <ul>
              <li>This code expires on: <strong>${expiryDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</strong></li>
              <li>Multiple employees can use the same code</li>
              <li>Keep this code secure and share only with authorized personnel</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/register" class="button">
                Register as Admin
              </a>
            </div>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message from ExamEye. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} ExamEye. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
ExamEye Admin Access Code for ${companyName}

Hello ${companyName} Team,

Your ExamEye admin access code has been generated: ${adminCode}

How to Use This Code:
1. Registration: Visit the admin registration page and enter this code along with your details
2. Login: Use this code during login for verification (if required)  
3. Multiple Users: Any employee from your company can use this same code to register as an admin

Important Details:
- This code expires on: ${expiryDate.toLocaleDateString()}
- Multiple employees can use the same code
- Keep this code secure and share only with authorized personnel

Registration URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/register

If you have any questions or need assistance, please contact our support team.

This is an automated message from ExamEye.
    `
  };

  // Log email content for development
  console.log('📧 EMAIL SENT TO COMPANY:');
  console.log('To:', emailContent.to);
  console.log('Subject:', emailContent.subject);
  console.log('Admin Code:', adminCode);
  console.log('Expires:', expiryDate.toLocaleDateString());
  
  // In production, integrate with email service:
  /*
  try {
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send(emailContent);
    
    // Example with AWS SES:
    // const AWS = require('aws-sdk');
    // const ses = new AWS.SES({ region: 'us-east-1' });
    // await ses.sendEmail({
    //   Source: process.env.FROM_EMAIL,
    //   Destination: { ToAddresses: [companyEmail] },
    //   Message: {
    //     Subject: { Data: emailContent.subject },
    //     Body: { Html: { Data: emailContent.html } }
    //   }
    // }).promise();
    
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
  */
  
  // For development, simulate successful email sending
  return { 
    success: true, 
    message: 'Email sent successfully (simulated)',
    emailContent 
  };
};

export const sendStudentCredentialsEmail = async (studentEmail, examTitle, username, password, examUrl, examId) => {
  // Create web launcher URL that will trigger the protocol
  const webLauncherUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/launch-exam?examId=${examId}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  
  const emailContent = {
    to: studentEmail,
    subject: `ExamEye Exam Access - ${examTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ExamEye Exam Access</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1f2937 0%, #374151 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials-box { background: white; border: 2px solid #1f2937; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .credential { margin: 10px 0; padding: 10px; background: #f3f4f6; border-radius: 4px; }
          .button { display: inline-block; background: #1f2937; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 ExamEye Exam Access</h1>
            <p>Your exam credentials are ready</p>
          </div>
          
          <div class="content">
            <h2>Exam: ${examTitle}</h2>
            
            <p>You have been invited to take an exam on ExamEye. Use the credentials below to access your exam.</p>
            
            <div class="credentials-box">
              <h3>Your Login Credentials:</h3>
              <div class="credential"><strong>Username:</strong> ${username}</div>
              <div class="credential"><strong>Password:</strong> ${password}</div>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p><strong>⚠️ Important:</strong> You must have the ExamEye Secure Browser installed to take this exam.</p>
              <p style="margin: 5px 0;">Don't have it? <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/download-browser" style="color: #dc2626; font-weight: bold;">Download it here</a></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${webLauncherUrl}" class="button" style="background: #dc2626; font-size: 16px; font-weight: bold;">🚀 Launch Secure Browser</a>
            </div>
            
            <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
              <p><strong>📋 Alternative:</strong></p>
              <p style="margin: 10px 0;">Click this link or copy it to your browser:</p>
              <p style="margin: 10px 0;"><a href="${webLauncherUrl}" style="color: #0284c7; word-break: break-all; font-size: 13px;">${webLauncherUrl}</a></p>
            </div>
            
            <p><strong>Important:</strong> These credentials are temporary and will expire after the exam period.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
ExamEye Exam Access - ${examTitle}

You have been invited to take an exam on ExamEye.

Your Login Credentials:
Username: ${username}
Password: ${password}

IMPORTANT: You must have the ExamEye Secure Browser installed to take this exam.
Download it here: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/download-browser

To launch the exam, click this link or copy it to your browser:
${webLauncherUrl}

Important: These credentials are temporary and will expire after the exam period.
    `
  };

  console.log('\n' + '='.repeat(60));
  console.log('📧 STUDENT EXAM CREDENTIALS EMAIL');
  console.log('='.repeat(60));
  console.log('📧 To:', studentEmail);
  console.log('🎓 Exam:', examTitle);
  console.log('👤 Username:', username);
  console.log('🔒 Password:', password);
  console.log('🔗 Deep Link:', examUrl);
  console.log('🌐 Web Launcher:', webLauncherUrl);
  console.log('='.repeat(60) + '\n');

  // For development, we'll use a simple SMTP service
  // You can configure this with Gmail, Outlook, or any SMTP service
  try {
    const nodemailer = require('nodemailer');
    
    // Create transporter (configure with your email service)
    const transporter = nodemailer.createTransport({
      // For Gmail:
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your app password
      }
      
      // For other SMTP services:
      // host: 'smtp.your-email-provider.com',
      // port: 587,
      // secure: false,
      // auth: {
      //   user: process.env.EMAIL_USER,
      //   pass: process.env.EMAIL_PASS
      // }
    });

    // Send email only if credentials are configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: studentEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      });
      
      console.log('✅ Email sent successfully to:', studentEmail);
      return { success: true, message: 'Email sent successfully' };
    } else {
      console.log('⚠️ Email credentials not configured. Email content logged above.');
      console.log('💡 To enable email sending:');
      console.log('   1. Add EMAIL_USER and EMAIL_PASS to your .env file');
      console.log('   2. For Gmail: Use your email and app password');
      console.log('   3. Restart the development server');
      console.log('   4. Check EMAIL_SETUP.md for detailed instructions');
      return { success: true, message: 'Email credentials not configured (logged to console)' };
    }
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.log('📧 Email content (fallback):');
    console.log('Subject:', emailContent.subject);
    console.log('To:', studentEmail);
    console.log('Credentials:', { username, password });
    
    return { success: false, error: error.message, emailContent };
  }
};