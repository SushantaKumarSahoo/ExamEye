import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Company from '../../../../../models/Company';
import { getUserFromToken } from '../../../../../lib/auth';

export async function GET(request, { params }) {
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

    const { id } = await params;
    const company = await Company.findById(id)
      .populate('createdBy', 'username email');

    if (!company) {
      return NextResponse.json(
        { message: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ company });

  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
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

    const { action } = await request.json();
    const { id } = await params;
    
    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json(
        { message: 'Company not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'activate':
        company.isActive = true;
        break;
      case 'deactivate':
        company.isActive = false;
        break;
      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

    await company.save();

    return NextResponse.json({
      message: `Company ${action}d successfully`,
      company: {
        id: company._id,
        name: company.name,
        isActive: company.isActive
      }
    });

  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}