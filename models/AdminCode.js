import mongoose from 'mongoose';
import Company from './Company.js'; // Ensure Company schema is registered

const adminCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  companyId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  usedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      // Default expiry: 30 days from creation
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
adminCodeSchema.index({ code: 1, isActive: 1 });
adminCodeSchema.index({ companyId: 1 });
adminCodeSchema.index({ expiresAt: 1 });

// Instance method to mark code as used
adminCodeSchema.methods.markAsUsed = function(userId) {
  this.isUsed = true;
  this.usedBy = userId;
  this.usedAt = new Date();
  return this.save();
};

// Static method to generate unique code
adminCodeSchema.statics.generateUniqueCode = async function(companyId) {
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate code format: COMP-XXXX-XXXX
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase() + 
                      Math.random().toString(36).substring(2, 6).toUpperCase();
    code = `${companyId.substring(0, 4)}-${randomPart.substring(0, 4)}-${randomPart.substring(4, 8)}`;
    
    const existing = await this.findOne({ code });
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code;
};

// Static method to validate code
adminCodeSchema.statics.validateCode = async function(code, companyId) {
  const adminCode = await this.findOne({
    code: code.toUpperCase(),
    companyId: companyId.toUpperCase(),
    isActive: true,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).populate('company');
  
  return adminCode;
};

export default mongoose.models.AdminCode || mongoose.model('AdminCode', adminCodeSchema);