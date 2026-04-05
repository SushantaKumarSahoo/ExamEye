'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { BarChart, LineChart, PieChart } from '../../components/SimpleChart';

export default function SuperAdminDashboard() {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [adminCodes, setAdminCodes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/superadmin/login');
      return;
    }

    // Verify token and get user info
    fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        if (data.user.role !== 'superadmin') {
          router.push('/');
          return;
        }
        setUser(data.user);
        fetchDashboardData(token);
      } else {
        router.push('/superadmin/login');
      }
    })
    .catch(() => router.push('/superadmin/login'));
  }, [router]);

  const fetchDashboardData = async (token) => {
    try {
      // Fetch companies
      const companiesResponse = await fetch('/api/superadmin/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        setCompanies(companiesData.companies || []);
      }

      // Fetch admins
      const adminsResponse = await fetch('/api/superadmin/admins', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (adminsResponse.ok) {
        const adminsData = await adminsResponse.json();
        setAdmins(adminsData.admins || []);
      }

      // Fetch admin codes
      const codesResponse = await fetch('/api/superadmin/admin-codes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (codesResponse.ok) {
        const codesData = await codesResponse.json();
        setAdminCodes(codesData.codes || []);
      }

      // Fetch analytics
      const analyticsResponse = await fetch('/api/superadmin/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData.analytics || null);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Cookies.remove('token');
    router.push('/');
  };

  if (loading) {
    return <div className="loading">Loading Super Admin Dashboard...</div>;
  }

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter(admin => admin.isActive).length;
  const pendingAdmins = admins.filter(admin => !admin.isApproved).length;
  const totalCodes = adminCodes.length;
  const usedCodes = adminCodes.filter(code => code.isUsed).length;
  const activeCodes = adminCodes.filter(code => !code.isUsed && code.isActive).length;

  return (
    <div className="admin-background">
      <header style={{
        background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
        color: 'white',
        padding: '1.5rem 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/superadmin" style={{ 
              color: 'white',
              fontSize: '2rem',
              fontWeight: '800',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '-0.02em',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span className="eye-blink" style={{ fontSize: '2rem' }}>👁️</span>
              ExamEye
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.5rem 1rem', 
                background: 'rgba(255, 255, 255, 0.2)', 
                color: 'white', 
                borderRadius: '20px', 
                fontSize: '0.875rem',
                fontWeight: '500',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                <span style={{ width: '8px', height: '8px', background: '#ffffff', borderRadius: '50%' }}></span>
                System Active
              </span>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>Welcome, {user?.email?.split('@')[0]}</span>
              <button onClick={handleLogout} style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: '#1f2937',
                textDecoration: 'none',
                padding: '0.75rem 1.75rem',
                borderRadius: '10px',
                background: 'white',
                border: 'none',
                transition: 'all 0.3s',
                fontSize: '0.95rem',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        {/* Page Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            Super Admin Dashboard
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
            System-wide administration and management
          </p>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid #e5e7eb' }}>
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'companies', label: 'Companies', icon: '🏢' },
            { id: 'admins', label: 'Administrators', icon: '👥' },
            { id: 'analytics', label: 'Analytics', icon: '📈' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 0',
                background: 'none',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '500',
                color: activeTab === tab.id ? '#dc2626' : '#6b7280',
                borderBottom: activeTab === tab.id ? '2px solid #dc2626' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Statistics Cards */}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Total Companies</span>
                  <span style={{ fontSize: '1.25rem' }}>🏢</span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937' }}>{companies.length}</div>
              </div>

              <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Total Admins</span>
                  <span style={{ fontSize: '1.25rem' }}>👥</span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937' }}>{totalAdmins}</div>
              </div>

              <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Active Admins</span>
                  <span style={{ fontSize: '1.25rem' }}>✅</span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#059669' }}>{activeAdmins}</div>
              </div>

              <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Active Codes</span>
                  <span style={{ fontSize: '1.25rem' }}>🔑</span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937' }}>{activeCodes}</div>
              </div>

              <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Used Codes</span>
                  <span style={{ fontSize: '1.25rem' }}>🔓</span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#6b7280' }}>{usedCodes}</div>
              </div>
            </div>

          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Company Management</h3>
            </div>
            
            <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
              <Link href="/superadmin/companies" className="card clickable" style={{ padding: '2rem', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>🏢</div>
                <h4 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>View All Companies</h4>
                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                  Manage organizations, subscriptions, and limits
                </p>
              </Link>
              
              <Link href="/superadmin/companies/create" className="card clickable" style={{ padding: '2rem', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>➕</div>
                <h4 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Add Company</h4>
                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                  Add new organizations to the platform
                </p>
              </Link>
            </div>

            <div className="card" style={{ padding: '2rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>Recent Companies</h4>
              {companies.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No companies created yet</p>
              ) : (
                <div>
                  {companies.slice(0, 3).map(company => (
                    <div key={company._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{company.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{company.companyId} • {company.subscriptionPlan}</div>
                      </div>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '20px', 
                        fontSize: '0.8rem',
                        background: company.isActive ? '#ecfdf5' : '#fef2f2',
                        color: company.isActive ? '#059669' : '#dc2626'
                      }}>
                        {company.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admins Tab */}
        {activeTab === 'admins' && (
          <div>
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0, color: '#1f2937' }}>Administrator Management</h3>
              <p style={{ color: '#6b7280', fontSize: '1rem', marginTop: '0.75rem' }}>
                Admins are created automatically when you add a company. Login credentials are sent via email.
              </p>
            </div>
            
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <Link href="/superadmin/admins" style={{ 
                display: 'block',
                padding: '3rem 2.5rem',
                textDecoration: 'none', 
                color: 'inherit',
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              }}
              >
                <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>👥</div>
                <h4 style={{ textAlign: 'center', marginBottom: '0.75rem', fontSize: '1.4rem', fontWeight: '600', color: '#1f2937' }}>
                  Manage Administrators
                </h4>
                <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '1.05rem', lineHeight: '1.7' }}>
                  View, monitor, and manage all administrators across companies
                </p>
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            {!analytics ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
                <h3>Loading Analytics...</h3>
              </div>
            ) : (
              <div>
                {/* Key Metrics */}
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div className="card" style={{ textAlign: 'center', padding: '1.5rem', background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', color: 'white' }}>
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.9 }}>Total Revenue</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>₹{analytics.overview.totalRevenue.toLocaleString()}</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>Monthly Recurring</div>
                  </div>

                  <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Active Companies</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#10b981' }}>{analytics.overview.activeCompanies}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>of {analytics.overview.totalCompanies} total</div>
                  </div>

                  <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Exams</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#3b82f6' }}>{analytics.overview.totalExams}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>System-wide</div>
                  </div>

                  <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Students</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#8b5cf6' }}>{analytics.overview.totalStudents}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>{analytics.overview.totalSubmissions} submissions</div>
                  </div>

                  <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Active Admins</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#f59e0b' }}>{analytics.overview.activeAdmins}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>of {analytics.overview.totalAdmins} total</div>
                  </div>
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                  {/* Subscription Distribution */}
                  <div className="card">
                    <PieChart
                      title="Subscription Distribution"
                      data={analytics.subscriptions.distribution.map(sub => ({
                        label: sub._id.charAt(0).toUpperCase() + sub._id.slice(1),
                        value: sub.count
                      }))}
                    />
                  </div>

                  {/* Revenue Breakdown */}
                  <div className="card">
                    <BarChart
                      title="Revenue by Plan (₹)"
                      color="#10b981"
                      data={analytics.subscriptions.revenueBreakdown.map(rev => ({
                        label: rev.plan.charAt(0).toUpperCase() + rev.plan.slice(1),
                        value: rev.revenue
                      }))}
                    />
                  </div>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                  {/* Exam Status Distribution */}
                  <div className="card">
                    <BarChart
                      title="Exams by Status"
                      color="#3b82f6"
                      data={analytics.exams.byStatus.map(status => ({
                        label: status._id ? status._id.charAt(0).toUpperCase() + status._id.slice(1) : 'Unknown',
                        value: status.count
                      }))}
                    />
                  </div>

                  {/* Recent Activity */}
                  <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: '600' }}>Recent Activity (30 Days)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>🏢</span>
                          <span style={{ fontWeight: '500' }}>New Companies</span>
                        </div>
                        <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>{analytics.recentActivity.companies}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>📝</span>
                          <span style={{ fontWeight: '500' }}>New Exams</span>
                        </div>
                        <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>{analytics.recentActivity.exams}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>✅</span>
                          <span style={{ fontWeight: '500' }}>New Submissions</span>
                        </div>
                        <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>{analytics.recentActivity.submissions}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Growth Charts */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                  <LineChart
                    title="Monthly Growth Trends (Last 6 Months)"
                    color="#dc2626"
                    data={analytics.growth.companies.map(item => ({
                      label: `${item._id.month}/${item._id.year}`,
                      value: item.count
                    }))}
                  />
                </div>

                {/* Top Companies */}
                {analytics.topCompanies && analytics.topCompanies.length > 0 && (
                  <div className="card" style={{ padding: '2rem' }}>
                    <h4 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>Top Companies by Exam Count</h4>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {analytics.topCompanies.map((company, index) => (
                        <div key={index} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '1rem', 
                          background: '#f9fafb', 
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ 
                              width: '40px', 
                              height: '40px', 
                              borderRadius: '50%', 
                              background: index === 0 ? '#fbbf24' : index === 1 ? '#d1d5db' : index === 2 ? '#f97316' : '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              color: 'white'
                            }}>
                              #{index + 1}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                                {company.company?.[0]?.name || 'Unknown Company'}
                              </div>
                              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                {company.company?.[0]?.subscriptionPlan || 'N/A'} Plan
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                              {company.examCount}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              exams
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}