import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromToken } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import Company from '../../../../../models/Company';
import AdminCode from '../../../../../models/AdminCode';
import User from '../../../../../models/User';
import nodemailer from 'nodemailer';
import { subscriptionUpgradeEmail } from '../../../../../lib/emailTemplates';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, message: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Get metadata
    const { userId, companyId, plan } = session.metadata;

    // Verify this is the correct user
    if (userId !== user._id.toString() || companyId !== user.companyId) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 403 }
      );
    }

    // Update company subscription
    const company = await Company.findOne({ companyId });
    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const subscriptionEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    company.subscriptionPlan = plan;
    company.subscriptionStatus = 'active';
    company.subscriptionStartDate = now;
    company.subscriptionEndDate = subscriptionEndDate;
    company.setSubscriptionLimits();

    await company.save();

    // Generate new admin code
    const newAdminCode = await AdminCode.create({
      code: await AdminCode.generateUniqueCode(companyId),
      companyId: companyId,
      company: company._id,
      generatedBy: user._id,
      expiresAt: subscriptionEndDate,
      isActive: true,
      isUsed: false
    });

    console.log('✅ Subscription updated successfully via Stripe session verification');
    console.log('Company:', company.name);
    console.log('Plan:', plan);
    console.log('Payment ID:', session.payment_intent);

    // Send subscription upgrade email to admin
    try {
      // Get plan details
      const planDetails = {
        basic: {
          name: 'Basic Plan',
          price: 2499,
          features: ['5 Admins', '50 Exams', '1,000 Students', 'Email Support', 'Basic Analytics']
        },
        premium: {
          name: 'Premium Plan',
          price: 8499,
          features: ['15 Admins', '200 Exams', '5,000 Students', 'Priority Support', 'Advanced Analytics', 'Custom Branding']
        },
        enterprise: {
          name: 'Enterprise Plan',
          price: 24999,
          features: ['50 Admins', '1,000 Exams', '25,000 Students', '24/7 Support', 'Custom Features', 'API Access', 'White-label Solution']
        }
      };

      const selectedPlan = planDetails[plan];

      // Get admin user details
      const adminUser = await User.findById(user._id);

      // Create email HTML
      const emailHtml = subscriptionUpgradeEmail({
        companyName: company.name,
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        paymentId: session.payment_intent,
        startDate: company.subscriptionStartDate,
        endDate: company.subscriptionEndDate,
        adminCode: newAdminCode.code,
        features: selectedPlan.features
      });

      // Send email if credentials are configured
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: adminUser.email,
          subject: `ExamEye - Subscription Upgraded to ${selectedPlan.name}`,
          html: emailHtml
        });

        console.log('✅ Subscription upgrade email sent to:', adminUser.email);
      } else {
        console.log('⚠️ Email credentials not configured. Email not sent.');
        console.log('💡 Add EMAIL_USER and EMAIL_PASS to .env to enable email notifications');
      }
    } catch (emailError) {
      console.error('❌ Failed to send subscription email:', emailError);
      // Don't fail the entire request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully',
      company: {
        subscriptionPlan: company.subscriptionPlan,
        subscriptionStatus: company.subscriptionStatus,
        subscriptionEndDate: company.subscriptionEndDate,
        maxAdmins: company.maxAdmins,
        maxExams: company.maxExams,
        maxStudents: company.maxStudents
      },
      adminCode: newAdminCode.code,
      paymentId: session.payment_intent
    });

  } catch (error) {
    console.error('Error verifying Stripe session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify payment', error: error.message },
      { status: 500 }
    );
  }
}
