import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Company from '../../../../models/Company';
import AdminCode from '../../../../models/AdminCode';
import { getUserFromToken } from '../../../../lib/auth';

export async function GET(request) {
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

    const company = await Company.findOne({ companyId: user.companyId });
    if (!company) {
      return NextResponse.json(
        { message: 'Company not found' },
        { status: 404 }
      );
    }

    // Check if trial is expired
    const now = new Date();
    const isTrialExpired = company.subscriptionStatus === 'trial' && company.trialEndDate < now;

    // Get admin code information for this company
    const adminCode = await AdminCode.findOne({
      companyId: user.companyId,
      isActive: true,
      expiresAt: { $gt: now }
    }).sort({ createdAt: -1 }); // Get the most recent active code

    let adminCodeInfo = null;
    if (adminCode) {
      const daysRemaining = Math.ceil((adminCode.expiresAt - now) / (1000 * 60 * 60 * 24));
      adminCodeInfo = {
        code: adminCode.code,
        expiresAt: adminCode.expiresAt,
        daysRemaining: Math.max(0, daysRemaining),
        isExpiringSoon: daysRemaining <= 7,
        isExpired: daysRemaining <= 0
      };
    }

    return NextResponse.json({
      company: {
        name: company.name,
        companyId: company.companyId,
        subscriptionPlan: company.subscriptionPlan,
        subscriptionStatus: isTrialExpired ? 'expired' : company.subscriptionStatus,
        trialEndDate: company.trialEndDate,
        subscriptionEndDate: company.subscriptionEndDate,
        maxAdmins: company.maxAdmins,
        maxExams: company.maxExams,
        maxStudents: company.maxStudents,
        isTrialExpired,
        adminCode: adminCodeInfo
      }
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const { subscriptionPlan, paymentMethod, paymentId, paymentCompleted } = await request.json();

    if (!subscriptionPlan || !['basic', 'premium', 'enterprise'].includes(subscriptionPlan)) {
      return NextResponse.json(
        { message: 'Valid subscription plan is required' },
        { status: 400 }
      );
    }

    const company = await Company.findOne({ companyId: user.companyId });
    if (!company) {
      return NextResponse.json(
        { message: 'Company not found' },
        { status: 404 }
      );
    }

    // Update subscription
    const now = new Date();
    const subscriptionEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    company.subscriptionPlan = subscriptionPlan;
    company.subscriptionStatus = 'active';
    company.subscriptionStartDate = now;
    company.subscriptionEndDate = subscriptionEndDate;

    // Set new limits based on plan
    company.setSubscriptionLimits();

    await company.save();

    // Generate new admin code
    const newAdminCode = await AdminCode.create({
      code: await AdminCode.generateUniqueCode(company.companyId),
      companyId: company.companyId,
      company: company._id,
      generatedBy: user._id,
      expiresAt: subscriptionEndDate,
      isActive: true,
      isUsed: false
    });

    // Send email notification
    if (paymentCompleted) {
      try {
        const nodemailer = require('nodemailer');
        const { subscriptionUpgradeEmail } = require('../../../../lib/emailTemplates');

        const planDetails = {
          basic: { name: 'Basic Plan', amount: 2499, features: ['5 Admins', '50 Exams', '1,000 Students', 'Email Support', 'Basic Analytics'] },
          premium: { name: 'Premium Plan', amount: 8499, features: ['15 Admins', '200 Exams', '5,000 Students', 'Priority Support', 'Advanced Analytics', 'Custom Branding'] },
          enterprise: { name: 'Enterprise Plan', amount: 24999, features: ['50 Admins', '1,000 Exams', '25,000 Students', '24/7 Support', 'Custom Features', 'API Access', 'White-label Solution'] }
        };

        const plan = planDetails[subscriptionPlan];

        const emailHTML = subscriptionUpgradeEmail({
          companyName: company.name,
          planName: plan.name,
          amount: plan.amount,
          paymentId: paymentId || 'N/A',
          startDate: now,
          endDate: subscriptionEndDate,
          adminCode: newAdminCode.code,
          features: plan.features
        });

        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'smtp.gmail.com',
          port: process.env.EMAIL_PORT || 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: company.email,
          subject: `Subscription Upgraded - ${plan.name} | ExamEye`,
          html: emailHTML
        });

        console.log('Subscription upgrade email sent to:', company.email);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      message: 'Subscription updated successfully',
      company: {
        subscriptionPlan: company.subscriptionPlan,
        subscriptionStatus: company.subscriptionStatus,
        subscriptionEndDate: company.subscriptionEndDate,
        maxAdmins: company.maxAdmins,
        maxExams: company.maxExams,
        maxStudents: company.maxStudents
      },
      adminCode: newAdminCode.code
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}