import Company from '../models/Company';
import Exam from '../models/Exam';
import User from '../models/User';

/**
 * Check if company's trial or subscription has expired
 */
export async function isSubscriptionExpired(companyId) {
  const company = await Company.findOne({ companyId });
  
  if (!company) {
    return { expired: true, message: 'Company not found' };
  }

  const now = new Date();

  // Check trial expiration
  if (company.subscriptionStatus === 'trial') {
    if (now > new Date(company.trialEndDate)) {
      return { 
        expired: true, 
        message: 'Your free trial has expired. Please upgrade to continue using ExamEye.',
        company 
      };
    }
  }

  // Check subscription expiration
  if (company.subscriptionStatus === 'active' && company.subscriptionEndDate) {
    if (now > new Date(company.subscriptionEndDate)) {
      // Update status to expired
      company.subscriptionStatus = 'expired';
      await company.save();
      
      return { 
        expired: true, 
        message: 'Your subscription has expired. Please renew to continue using ExamEye.',
        company 
      };
    }
  }

  // Check if subscription is cancelled or expired
  if (company.subscriptionStatus === 'expired' || company.subscriptionStatus === 'cancelled') {
    return { 
      expired: true, 
      message: 'Your subscription is not active. Please upgrade or renew to continue.',
      company 
    };
  }

  return { expired: false, company };
}

/**
 * Check if company has reached exam creation limit
 */
export async function canCreateExam(companyId) {
  const company = await Company.findOne({ companyId });
  
  if (!company) {
    return { 
      allowed: false, 
      message: 'Company not found',
      currentCount: 0,
      limit: 0
    };
  }

  // Check subscription expiration first
  const subscriptionCheck = await isSubscriptionExpired(companyId);
  if (subscriptionCheck.expired) {
    return { 
      allowed: false, 
      message: subscriptionCheck.message,
      currentCount: 0,
      limit: company.maxExams,
      subscriptionExpired: true
    };
  }

  // Count current exams for this company
  const examCount = await Exam.countDocuments({ company: company._id });

  if (examCount >= company.maxExams) {
    return { 
      allowed: false, 
      message: `You have reached your exam limit (${company.maxExams} exams). Please upgrade your plan to create more exams.`,
      currentCount: examCount,
      limit: company.maxExams,
      limitReached: true
    };
  }

  return { 
    allowed: true, 
    currentCount: examCount,
    limit: company.maxExams,
    remaining: company.maxExams - examCount
  };
}

/**
 * Check if company can add more admins
 */
export async function canAddAdmin(companyId) {
  const company = await Company.findOne({ companyId });
  
  if (!company) {
    return { 
      allowed: false, 
      message: 'Company not found',
      currentCount: 0,
      limit: 0
    };
  }

  // Check subscription expiration first
  const subscriptionCheck = await isSubscriptionExpired(companyId);
  if (subscriptionCheck.expired) {
    return { 
      allowed: false, 
      message: subscriptionCheck.message,
      currentCount: 0,
      limit: company.maxAdmins,
      subscriptionExpired: true
    };
  }

  // Count current admins for this company
  const adminCount = await User.countDocuments({ 
    companyId: companyId, 
    role: 'admin', 
    isActive: true 
  });

  if (adminCount >= company.maxAdmins) {
    return { 
      allowed: false, 
      message: `You have reached your admin limit (${company.maxAdmins} admins). Please upgrade your plan to add more administrators.`,
      currentCount: adminCount,
      limit: company.maxAdmins,
      limitReached: true
    };
  }

  return { 
    allowed: true, 
    currentCount: adminCount,
    limit: company.maxAdmins,
    remaining: company.maxAdmins - adminCount
  };
}

/**
 * Check if company can add more students to an exam
 */
export async function canAddStudents(companyId, additionalStudents = 0) {
  const company = await Company.findOne({ companyId });
  
  if (!company) {
    return { 
      allowed: false, 
      message: 'Company not found',
      currentCount: 0,
      limit: 0
    };
  }

  // Check subscription expiration first
  const subscriptionCheck = await isSubscriptionExpired(companyId);
  if (subscriptionCheck.expired) {
    return { 
      allowed: false, 
      message: subscriptionCheck.message,
      currentCount: 0,
      limit: company.maxStudents,
      subscriptionExpired: true
    };
  }

  // For now, we'll just check the limit
  // In a more complex system, you might track total students across all exams
  if (additionalStudents > company.maxStudents) {
    return { 
      allowed: false, 
      message: `You cannot add ${additionalStudents} students. Your plan allows up to ${company.maxStudents} students per exam.`,
      currentCount: 0,
      limit: company.maxStudents,
      limitReached: true
    };
  }

  return { 
    allowed: true, 
    limit: company.maxStudents
  };
}

/**
 * Get subscription status with detailed information
 */
export async function getSubscriptionStatus(companyId) {
  const company = await Company.findOne({ companyId });
  
  if (!company) {
    return null;
  }

  const now = new Date();
  const examCount = await Exam.countDocuments({ company: company._id });
  const adminCount = await User.countDocuments({ 
    companyId: companyId, 
    role: 'admin', 
    isActive: true 
  });

  let isExpired = false;
  let daysRemaining = 0;
  let expiryDate = null;

  if (company.subscriptionStatus === 'trial') {
    expiryDate = new Date(company.trialEndDate);
    const diffTime = expiryDate - now;
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isExpired = daysRemaining <= 0;
  } else if (company.subscriptionStatus === 'active' && company.subscriptionEndDate) {
    expiryDate = new Date(company.subscriptionEndDate);
    const diffTime = expiryDate - now;
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isExpired = daysRemaining <= 0;
  } else if (company.subscriptionStatus === 'expired' || company.subscriptionStatus === 'cancelled') {
    isExpired = true;
  }

  return {
    company: {
      name: company.name,
      companyId: company.companyId,
      subscriptionPlan: company.subscriptionPlan,
      subscriptionStatus: company.subscriptionStatus,
      isExpired,
      daysRemaining: Math.max(0, daysRemaining),
      expiryDate,
      limits: {
        maxAdmins: company.maxAdmins,
        maxExams: company.maxExams,
        maxStudents: company.maxStudents
      },
      usage: {
        admins: adminCount,
        exams: examCount
      },
      remaining: {
        admins: Math.max(0, company.maxAdmins - adminCount),
        exams: Math.max(0, company.maxExams - examCount)
      }
    }
  };
}
