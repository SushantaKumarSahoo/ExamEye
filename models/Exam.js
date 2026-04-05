import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'multiple-answer'],
    default: 'multiple-choice'
  },
  options: [{
    type: String,
    required: function() {
      return this.questionType !== 'true-false';
    }
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed, // Can be number (single) or array (multiple)
    required: true
  },
  marks: {
    type: Number,
    default: 1
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true // in minutes
  },
  totalMarks: {
    type: Number,
    required: true
  },
  questions: [questionSchema],
  status: {
    type: String,
    enum: ['draft', 'active', 'ended'],
    default: 'draft'
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  studentEmails: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  // Exam Instructions
  instructions: {
    enabled: {
      type: Boolean,
      default: true
    },
    title: {
      type: String,
      default: 'Exam Instructions'
    },
    content: {
      type: String,
      default: `Please read the following instructions carefully before starting the exam:

1. **Time Limit**: You have the allocated time to complete this exam. The timer will be visible at the top of your screen.

2. **Navigation**: You can navigate between questions using the Next/Previous buttons or by clicking on question numbers in the navigation grid.

3. **Answering Questions**: Click on your chosen answer for each question. You can change your answers at any time before submission.

4. **Flagging Questions**: If you find any issues with a question, you can flag it for review using the flag buttons.

5. **Auto-Save**: Your answers are automatically saved as you progress through the exam.

6. **Submission**: Once you complete all questions, click the "Submit Exam" button. You can also submit a partially completed exam.

7. **Technical Issues**: If you experience any technical difficulties, contact your exam administrator immediately.

8. **Academic Integrity**: This exam is monitored for security. Any attempt to cheat or access unauthorized materials will result in disqualification.

Good luck with your exam!`
    },
    acknowledgmentText: {
      type: String,
      default: 'I have read and understood the exam instructions and agree to follow all exam rules and regulations.'
    },
    requireAcknowledgment: {
      type: Boolean,
      default: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function() {
      return this.createdBy && this.createdBy.role === 'admin';
    }
  },
  resultsReleased: {
    type: Boolean,
    default: false
  },
  resultsReleasedAt: {
    type: Date
  },
  resultsReleasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Exam || mongoose.model('Exam', examSchema);