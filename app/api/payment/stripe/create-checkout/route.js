import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromToken } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import Company from '../../../../../models/Company';

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

    const { plan } = await request.json();

    // Get company details
    const company = await Company.findOne({ companyId: user.companyId });
    if (!company) {
      return NextResponse.json(
        { message: 'Company not found' },
        { status: 404 }
      );
    }

    // Plan pricing (in INR, converted to paise for Stripe)
    const planPricing = {
      basic: { amount: 249900, name: 'Basic Plan' },      // ₹2,499
      premium: { amount: 849900, name: 'Premium Plan' },  // ₹8,499
      enterprise: { amount: 2499900, name: 'Enterprise Plan' } // ₹24,999
    };

    const selectedPlan = planPricing[plan];
    if (!selectedPlan) {
      return NextResponse.json(
        { message: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `ExamEye ${selectedPlan.name}`,
              description: `Monthly subscription for ${selectedPlan.name}`,
              images: ['https://your-domain.com/logo.png'], // Optional: Add your logo
            },
            unit_amount: selectedPlan.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/subscription?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/subscription?canceled=true`,
      customer_email: company.email,
      metadata: {
        userId: user._id.toString(),
        companyId: user.companyId,
        companyName: company.name,
        plan: plan,
      },
      // Enable automatic invoice and receipt emails from Stripe
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `ExamEye ${selectedPlan.name} - Monthly Subscription`,
          metadata: {
            companyId: user.companyId,
            companyName: company.name,
            plan: plan,
          },
          footer: 'Thank you for choosing ExamEye!',
        },
      },
      // Automatically send receipt email from Stripe
      payment_intent_data: {
        receipt_email: company.email,
        description: `ExamEye ${selectedPlan.name} Subscription`,
        metadata: {
          companyId: user.companyId,
          companyName: company.name,
          plan: plan,
        },
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return NextResponse.json(
      { message: 'Failed to create checkout session', error: error.message },
      { status: 500 }
    );
  }
}
