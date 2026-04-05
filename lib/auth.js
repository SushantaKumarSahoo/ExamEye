import jwt from 'jsonwebtoken';
import User from '../models/User';
import TempStudent from '../models/TempStudent';
import connectDB from './mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export const generateToken = (userId, userType = 'regular') => {
  return jwt.sign({ userId, userType }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token) => {
  try {
    console.log('🔑 [verifyToken] Verifying token with JWT_SECRET...');
    console.log('🔑 JWT_SECRET exists:', !!JWT_SECRET);
    console.log('🔑 JWT_SECRET preview:', JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : 'undefined');
    const result = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verified successfully');
    return result;
  } catch (error) {
    console.error('❌ [verifyToken] JWT verification failed:', error.message);
    return null;
  }
};

export const getUserFromToken = async (token) => {
  try {
    console.log('🔐 [getUserFromToken] Starting token verification...');
    await connectDB();
    
    const decoded = verifyToken(token);
    console.log('🔓 Decoded token:', decoded);
    
    if (!decoded) {
      console.log('❌ Token verification failed - invalid or expired');
      return null;
    }
    
    console.log('👤 User type:', decoded.userType);
    console.log('🆔 User ID:', decoded.userId);
    
    if (decoded.userType === 'temp_student') {
      console.log('🎓 Looking up temp student...');
      const tempStudent = await TempStudent.findById(decoded.userId).populate('examId');
      console.log('🎓 Temp student found:', !!tempStudent);
      
      if (tempStudent && tempStudent.expiresAt > new Date()) {
        console.log('✅ Temp student valid');
        return {
          _id: tempStudent._id,
          username: tempStudent.username,
          email: tempStudent.email,
          role: 'temp_student',
          examId: tempStudent.examId._id,
          examTitle: tempStudent.examId.title,
          isTemporary: true
        };
      }
      console.log('❌ Temp student expired or not found');
      return null;
    }
    
    console.log('👨‍💼 Looking up regular user...');
    const user = await User.findById(decoded.userId).select('-password');
    console.log('👨‍💼 User found:', !!user);
    
    if (user) {
      console.log('✅ User details:', { id: user._id, email: user.email, role: user.role });
    }
    
    return user;
  } catch (error) {
    console.error('❌ [getUserFromToken] Error:', error);
    return null;
  }
};