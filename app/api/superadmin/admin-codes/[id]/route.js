import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import AdminCode from '../../../../../models/AdminCode';
import { getUserFromToken } from '../../../../../lib/auth';

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
    const adminCode = await AdminCode.findById(id);
    if (!adminCode) {
      return NextResponse.json(
        { message: 'Admin code not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'deactivate':
        adminCode.isActive = false;
        break;
      case 'activate':
        adminCode.isActive = true;
        break;
      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

    await adminCode.save();

    return NextResponse.json({
      message: `Admin code ${action}d successfully`,
      code: {
        id: adminCode._id,
        code: adminCode.code,
        isActive: adminCode.isActive
      }
    });

  } catch (error) {
    console.error('Error updating admin code:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}