import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
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

    const admins = await User.find({ role: 'admin' })
      .populate('approvedBy', 'username email')
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({ admins });

  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
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

    const { adminId, action } = await request.json();
    
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'approve':
        admin.isApproved = true;
        admin.approvedBy = user._id;
        break;
      case 'reject':
        admin.isApproved = false;
        admin.isActive = false;
        break;
      case 'activate':
        admin.isActive = true;
        break;
      case 'deactivate':
        admin.isActive = false;
        break;
      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

    await admin.save();

    return NextResponse.json({
      message: `Admin ${action}d successfully`,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        isApproved: admin.isApproved,
        isActive: admin.isActive
      }
    });

  } catch (error) {
    console.error('Error updating admin:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}