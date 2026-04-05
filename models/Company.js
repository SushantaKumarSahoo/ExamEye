import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  companyId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  website: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    enum: ['education', 'technology', 'healthcare', 'finance', 'government', 'other'],
    default: 'education'
  },
  subscriptionPlan: {
    type: String,
    enum: ['free_trial', 'basic', 'premium', 'enterprise'],
    default: 'free_trial'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'trial'],
    default: 'trial'
  },
  trialStartDate: {
    type: Date,
    default: Date.now
  },
  trialEndDate: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }
  },
  subscriptionStartDate: {
    type: Date
  },
  subscriptionEndDate: {
    type: Date
  },
  maxAdmins: {
    type: Number,
    default: function() {
      switch(this.subscriptionPlan) {
        case 'free_trial': return 2;
        case 'basic': return 5;
        case 'premium': return 15;
        case 'enterprise': return 50;
        default: return 2;
      }
    }
  },
  maxExams: {
    type: Number,
    default: function() {
      switch(this.subscriptionPlan) {
        case 'free_trial': return 5;
        case 'basic': return 50;
        case 'premium': return 200;
        case 'enterprise': return 1000;
        default: return 5;
      }
    }
  },
  maxStudents: {
    type: Number,
    default: function() {
      switch(this.subscriptionPlan) {
        case 'free_trial': return 50;
        case 'basic': return 1000;
        case 'premium': return 5000;
        case 'enterprise': return 25000;
        default: return 50;
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Method to set subscription limits based on plan
companySchema.methods.setSubscriptionLimits = function() {
  const limits = {
    free_trial: { admins: 2, exams: 5, students: 50 },
    basic: { admins: 5, exams: 50, students: 1000 },
    premium: { admins: 15, exams: 200, students: 5000 },
    enterprise: { admins: 50, exams: 1000, students: 25000 }
  };
  
  const planLimits = limits[this.subscriptionPlan] || limits.free_trial;
  this.maxAdmins = planLimits.admins;
  this.maxExams = planLimits.exams;
  this.maxStudents = planLimits.students;
};

// Update the updatedAt field on save and set limits
companySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.setSubscriptionLimits();
  next();
});

// Virtual for admin count
companySchema.virtual('adminCount', {
  ref: 'User',
  localField: 'companyId',
  foreignField: 'companyId',
  count: true,
  match: { role: 'admin', isActive: true }
});

// Virtual for exam count
companySchema.virtual('examCount', {
  ref: 'Exam',
  localField: '_id',
  foreignField: 'company',
  count: true
});

// Ensure virtual fields are serialized
companySchema.set('toJSON', { virtuals: true });
companySchema.set('toObject', { virtuals: true });

export default mongoose.models.Company || mongoose.model('Company', companySchema);