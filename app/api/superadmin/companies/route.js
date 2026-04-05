import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Company from '../../../../models/Company';
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

    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { message: 'Super admin access required' },
        { status: 403 }
      );
    }

    const companies = await Company.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ companies });

  } catch (error) {
    console.error('Error fetching companies:', error);
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

    const companyData = await request.json();
    
    // Generate unique company ID
    let companyId;
    let isUnique = false;
    while (!isUnique) {
      companyId = companyData.name.substring(0, 4).toUpperCase() + 
                  Math.random().toString(36).substring(2, 6).toUpperCase();
      const existing = await Company.findOne({ companyId });
      if (!existing) {
        isUnique = true;
      }
    }

    const company = new Company({
      ...companyData,
      companyId,
      createdBy: user._id
    });

    await company.save();

    return NextResponse.json({
      message: 'Company created successfully',
      company
    });

  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}