import mongoose from 'mongoose';

const studentActivitySchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'studentModel'
  },
  studentModel: {
    type: String,
    enum: ['User', 'TempStudent'],
    required: true
  },
  studentEmail: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'suspicious', 'flagged', 'completed', 'disconnected'],
    default: 'active'
  },
  alertCount: {
    type: Number,
    default: 0
  },
  systemChecks: {
    camera: { type: Boolean, default: false },
    microphone: { type: Boolean, default: false },
    network: { type: Boolean, default: true },
    fullscreen: { type: Boolean, default: false },
    secureBrowser: { type: Boolean, default: false }
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Compound index for efficient queries
studentActivitySchema.index({ exam: 1, student: 1 });
studentActivitySchema.index({ exam: 1, status: 1 });

export default mongoose.models.StudentActivity || mongoose.model('StudentActivity', studentActivitySchema);
