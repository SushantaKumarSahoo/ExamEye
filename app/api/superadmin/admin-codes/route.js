import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import AdminCode from '../../../../models/AdminCode';
import Company from '../../../../models/Company';
import { getUserFromToken } from '../../../../lib/auth';
import { sendAdminCodeEmail } from '../../../../lib/email';

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

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { message: 'Super admin access required' },
        { status: 403 }
      );
    }

    const codes = await AdminCode.find()
      .populate('company', 'name companyId')
      .populate('generatedBy', 'username email')
      .populate('usedBy', 'username email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ codes });

  } catch (error) {
    console.error('Error fetching admin codes:', error);
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

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { message: 'Super admin access required' },
        { status: 403 }
      );
    }

    const { companyId, expiryDays = 30 } = await request.json();
    
    // Verify company exists
    const company = await Company.findOne({ companyId });
    if (!company) {
      return NextResponse.json(
        { message: 'Company not found' },
        { status: 404 }
      );
    }

    // Generate unique code
    const code = await AdminCode.generateUniqueCode(companyId);
    
    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const adminCode = new AdminCode({
      code,
      companyId,
      company: company._id,
      generatedBy: user._id,
      expiresAt
    });

    await adminCode.save();

    // Send email to company with the admin code
    try {
      const emailResult = await sendAdminCodeEmail(
        company.email,
        company.name,
        adminCode.code,
        adminCode.expiresAt
      );
      
      console.log('Email sending result:', emailResult);
    } catch (emailError) {
      console.error('Failed to send admin code email:', emailError);
      // Don't fail the code generation if email fails
    }

    return NextResponse.json({
      message: 'Admin code generated and sent to company email successfully',
      code: {
        id: adminCode._id,
        code: adminCode.code,
        companyId: adminCode.companyId,
        companyEmail: company.email,
        expiresAt: adminCode.expiresAt
      }
    });

  } catch (error) {
    console.error('Error generating admin code:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}