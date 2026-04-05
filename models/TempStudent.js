import mongoose from 'mongoose';

const tempStudentSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  hashedPassword: {
    type: String,
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  loginTime: {
    type: Date
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for automatic cleanup of expired credentials
tempStudentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for faster lookups
tempStudentSchema.index({ examId: 1, email: 1 });
tempStudentSchema.index({ username: 1 }, { unique: true });

export default mongoose.models.TempStudent || mongoose.model('TempStudent', tempStudentSchema);