import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectDB from '../../../../../lib/mongodb';
import Company from '../../../../../models/Company';
import AdminCode from '../../../../../models/AdminCode';
import User from '../../../../../models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { message: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      await connectDB();

      // Get metadata
      const { userId, companyId, plan } = session.metadata;

      // Update company subscription
      const company = await Company.findOne({ companyId });
      if (!company) {
        console.error('Company not found:', companyId);
        return NextResponse.json({ message: 'Company not found' }, { status: 404 });
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
      const user = await User.findById(userId);
      if (user) {
        await AdminCode.create({
          code: await AdminCode.generateUniqueCode(companyId),
          companyId: companyId,
          company: company._id,
          generatedBy: userId,
          expiresAt: subscriptionEndDate,
          isActive: true,
          isUsed: false
        });
      }

      console.log('Subscription updated successfully for company:', companyId);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { message: 'Webhook handler failed', error: error.message },
      { status: 500 }
    );
  }
}
