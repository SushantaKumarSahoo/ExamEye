import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Company from '../../../../models/Company';
import Exam from '../../../../models/Exam';
import Submission from '../../../../models/Submission';
import TempStudent from '../../../../models/TempStudent';

export async function GET(request) {
  try {
    // Verify superadmin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get total counts
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ isActive: true });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true });
    const totalExams = await Exam.countDocuments();
    const totalSubmissions = await Submission.countDocuments();
    const totalStudents = await TempStudent.countDocuments();

    // Get subscription distribution
    const subscriptionStats = await Company.aggregate([
      {
        $group: {
          _id: '$subscriptionPlan',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get monthly revenue (from subscription plans)
    const revenueByPlan = {
      free: 0,
      basic: 499,
      pro: 999,
      enterprise: 2499
    };

    let totalRevenue = 0;
    const revenueBreakdown = subscriptionStats.map(stat => {
      const revenue = (revenueByPlan[stat._id] || 0) * stat.count;
      totalRevenue += revenue;
      return {
        plan: stat._id,
        count: stat.count,
        revenue: revenue
      };
    });

    // Get exam statistics by status
    const examsByStatus = await Exam.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCompanies = await Company.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const recentExams = await Exam.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const recentSubmissions = await Submission.countDocuments({
      submittedAt: { $gte: thirtyDaysAgo }
    });

    // Get monthly growth data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyCompanies = await Company.aggregate([
      {
        $match: { createdAt: { $gte: sixMonthsAgo } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthlyExams = await Exam.aggregate([
      {
        $match: { createdAt: { $gte: sixMonthsAgo } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthlySubmissions = await Submission.aggregate([
      {
        $match: { submittedAt: { $gte: sixMonthsAgo } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$submittedAt' },
            month: { $month: '$submittedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get top companies by exam count
    const topCompanies = await Exam.aggregate([
      {
        $group: {
          _id: '$createdBy',
          examCount: { $sum: 1 }
        }
      },
      { $sort: { examCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'admin'
        }
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'admin.companyId',
          foreignField: 'companyId',
          as: 'company'
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalCompanies,
          activeCompanies,
          totalAdmins,
          activeAdmins,
          totalExams,
          totalSubmissions,
          totalStudents,
          totalRevenue
        },
        subscriptions: {
          distribution: subscriptionStats,
          revenueBreakdown
        },
        exams: {
          byStatus: examsByStatus,
          total: totalExams
        },
        recentActivity: {
          companies: recentCompanies,
          exams: recentExams,
          submissions: recentSubmissions
        },
        growth: {
          companies: monthlyCompanies,
          exams: monthlyExams,
          submissions: monthlySubmissions
        },
        topCompanies
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { message: 'Error fetching analytics', error: error.message },
      { status: 500 }
    );
  }
}
