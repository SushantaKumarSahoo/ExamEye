import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be null for temporary students
  },
  tempStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TempStudent',
    required: false // Can be null for regular students
  },
  studentEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  studentName: {
    type: String,
    required: true
  },
  answers: [{
    questionIndex: {
      type: Number,
      required: true
    },
    selectedAnswer: {
      type: mongoose.Schema.Types.Mixed, // Can be number (single) or array (multiple)
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    marks: {
      type: Number,
      required: true
    }
  }],
  totalMarks: {
    type: Number,
    required: true
  },
  obtainedMarks: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  flaggedQuestions: {
    type: Map,
    of: {
      flagged: Boolean,
      reason: String,
      timestamp: Date
    },
    default: new Map()
  }
});

// Indexes for better query performance
submissionSchema.index({ exam: 1, studentEmail: 1 });
submissionSchema.index({ exam: 1, submittedAt: -1 });
submissionSchema.index({ student: 1 });
submissionSchema.index({ tempStudent: 1 });

// Virtual for grade calculation
submissionSchema.virtual('grade').get(function() {
  if (this.percentage >= 90) return 'A+';
  if (this.percentage >= 80) return 'A';
  if (this.percentage >= 70) return 'B+';
  if (this.percentage >= 60) return 'B';
  if (this.percentage >= 50) return 'C';
  return 'F';
});

// Method to calculate statistics
submissionSchema.methods.getStatistics = function() {
  return {
    totalQuestions: this.answers.length,
    correctAnswers: this.answers.filter(a => a.isCorrect).length,
    incorrectAnswers: this.answers.filter(a => !a.isCorrect).length,
    accuracy: this.answers.length > 0 ? (this.answers.filter(a => a.isCorrect).length / this.answers.length) * 100 : 0,
    grade: this.grade
  };
};

export default mongoose.models.Submission || mongoose.model('Submission', submissionSchema);