import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'studentModel',
    required: true
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
  type: {
    type: String,
    required: true,
    enum: [
      'exam_started',
      'exam_completed',
      'camera_enabled',
      'camera_disabled',
      'microphone_enabled',
      'microphone_disabled',
      'tab_switch',
      'window_blur',
      'fullscreen_exit',
      'face_not_detected',
      'multiple_faces',
      'no_face',
      'suspicious_behavior',
      'copy_paste_detected',
      'right_click_detected',
      'keyboard_shortcut',
      'network_disconnected',
      'network_reconnected',
      'browser_devtools_opened',
      'rapid_clicking',
      'unusual_typing_pattern',
      'ai_anomaly_detected',
      'system_check',
      // AI Monitoring types
      'monitoring_started',
      'monitoring_error',
      'face_too_small',
      'face_size_normal',
      'multiple_voices_detected',
      'loud_audio_detected',
      'sustained_conversation',
      'looking_away',
      'looking_left',
      'looking_right',
      'looking_up',
      'looking_down',
      'object_detected',
      'phone_detected',
      'book_detected',
      'device_detected',
      'gaze_alert',
      'audio_alert',
      'face_alert',
      'object_alert'
    ]
  },
  description: {
    type: String,
    required: true
  },
  details: {
    type: String
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
activityLogSchema.index({ exam: 1, student: 1, timestamp: -1 });
activityLogSchema.index({ exam: 1, severity: 1, timestamp: -1 });
activityLogSchema.index({ exam: 1, type: 1 });

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
