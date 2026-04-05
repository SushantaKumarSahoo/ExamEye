import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'superadmin'],
    default: 'student'
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  // Student-specific fields
  studentId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
    trim: true,
    uppercase: true
  },
  department: {
    type: String,
    enum: ['computer-science', 'mathematics', 'physics', 'chemistry', 'biology', 'engineering', 'business', 'other'],
    required: function() {
      return this.role === 'student' && this.studentId;
    }
  },
  // Admin-specific fields
  companyName: {
    type: String,
    trim: true,
    maxlength: 100,
    required: function() {
      return this.role === 'admin';
    }
  },
  companyId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    required: function() {
      return this.role === 'admin';
    }
  },
  adminVerificationCode: {
    type: String,
    required: function() {
      return this.role === 'admin';
    }
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.role === 'admin';
    }
  },
  // Super Admin specific fields
  permissions: {
    type: [String],
    default: function() {
      if (this.role === 'superadmin') {
        return ['manage_admins', 'generate_codes', 'view_analytics', 'system_settings'];
      }
      return [];
    }
  },
  // Profile information
  profilePicture: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: function() {
      return this.role !== 'admin'; // Auto-approve students and superadmins
    }
  },
  lastLogin: {
    type: Date,
    default: null
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
userSchema.pre('save', async function(next) {
  this.updatedAt = new Date();
  
  // Hash password if it's modified
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.getFullName = function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.username;
};

userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return await this.save();
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.getFullName();
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

export default mongoose.models.User || mongoose.model('User', userSchema);