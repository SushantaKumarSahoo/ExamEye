'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterApproval, setFilterApproval] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/superadmin/login');
      return;
    }

    fetchAdmins(token);
  }, [router]);

  const fetchAdmins = async (token) => {
    try {
      const response = await fetch('/api/superadmin/admins', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAdminStatus = async (adminId, action) => {
    const token = Cookies.get('token');
    try {
      const response = await fetch('/api/superadmin/admins', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adminId, action })
      });

      if (response.ok) {
        fetchAdmins(token);
      }
    } catch (error) {
      console.error('Error updating admin status:', error);
    }
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (admin.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && admin.isActive) ||
                         (filterStatus === 'inactive' && !admin.isActive);
    
    const matchesApproval = filterApproval === 'all' ||
                           (filterApproval === 'approved' && admin.isApproved) ||
                           (filterApproval === 'pending' && !admin.isApproved);
    
    return matchesSearch && matchesStatus && matchesApproval;
  });

  const getAdminStatusColor = (admin) => {
    if (!admin.isApproved) return { bg: '#fef3c7', color: '#92400e', text: 'Pending Approval' };
    if (!admin.isActive) return { bg: '#fef2f2', color: '#dc2626', text: 'Inactive' };
    return { bg: '#ecfdf5', color: '#059669', text: 'Active' };
  };

  if (loading) {
    return <div className="loading">Loading administrators...</div>;
  }

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
            <Link href="/superadmin" style={{
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
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: '#1f2937' }}>
            <span>👥</span>
            Administrator Management
          </h1>
          <p style={{ color: '#6b7280' }}>Manage and monitor admin accounts. Codes are generated automatically when creating companies.</p>
        </div>

        {/* Search and Filter */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search admins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ flex: 1, minWidth: '300px' }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-input"
              style={{ minWidth: '150px' }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={filterApproval}
              onChange={(e) => setFilterApproval(e.target.value)}
              className="form-input"
              style={{ minWidth: '150px' }}
            >
              <option value="all">All Approvals</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              {filteredAdmins.length} of {admins.length} admins
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>
              {admins.length}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Total Admins</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669' }}>
              {admins.filter(a => a.isActive && a.isApproved).length}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Active Admins</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
              {admins.filter(a => !a.isApproved).length}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Pending Approval</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#dc2626' }}>
              {admins.filter(a => !a.isActive).length}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Inactive Admins</div>
          </div>
        </div>

        {/* Admins List */}
        {filteredAdmins.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <h3 style={{ marginBottom: '0.5rem' }}>No administrators found</h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              {admins.length === 0 ? 'No admin registrations yet' : 'Try adjusting your search criteria'}
            </p>
          </div>
        ) : (
          <div className="grid grid-2" style={{ gap: '1.5rem' }}>
            {filteredAdmins.map((admin) => {
              const statusInfo = getAdminStatusColor(admin);
              return (
                <div key={admin._id} className="card" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>👤</span>
                        {admin.getFullName ? admin.getFullName() : admin.username}
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>@{admin.username}</p>
                    </div>
                    <span 
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        background: statusInfo.bg,
                        color: statusInfo.color
                      }}
                    >
                      {statusInfo.text}
                    </span>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                      <div>
                        <span style={{ color: '#6b7280' }}>Email:</span>
                        <div style={{ fontWeight: '500' }}>{admin.email}</div>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Company:</span>
                        <div style={{ fontWeight: '500' }}>{admin.companyName || 'Not specified'}</div>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Company ID:</span>
                        <div style={{ fontWeight: '500', fontFamily: 'monospace' }}>{admin.companyId || 'Not specified'}</div>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>Registered:</span>
                        <div style={{ fontWeight: '500' }}>{new Date(admin.createdAt).toLocaleDateString()}</div>
                      </div>
                      {admin.lastLogin && (
                        <div>
                          <span style={{ color: '#6b7280' }}>Last Login:</span>
                          <div style={{ fontWeight: '500' }}>{new Date(admin.lastLogin).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {!admin.isApproved && (
                      <>
                        <button
                          onClick={() => updateAdminStatus(admin._id, 'approve')}
                          className="btn btn-primary"
                          style={{ 
                            flex: 1,
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            borderColor: '#059669'
                          }}
                        >
                          <span>✅</span>
                          Approve
                        </button>
                        <button
                          onClick={() => updateAdminStatus(admin._id, 'reject')}
                          className="btn btn-secondary"
                          style={{ 
                            background: '#fef2f2',
                            color: '#dc2626',
                            borderColor: '#fecaca'
                          }}
                        >
                          <span>❌</span>
                          Reject
                        </button>
                      </>
                    )}
                    
                    {admin.isApproved && (
                      <button
                        onClick={() => updateAdminStatus(admin._id, admin.isActive ? 'deactivate' : 'activate')}
                        className="btn btn-secondary"
                        style={{ 
                          flex: 1,
                          background: admin.isActive ? '#fef2f2' : '#ecfdf5',
                          color: admin.isActive ? '#dc2626' : '#059669',
                          borderColor: admin.isActive ? '#fecaca' : '#a7f3d0'
                        }}
                      >
                        <span>{admin.isActive ? '🔴' : '🟢'}</span>
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}