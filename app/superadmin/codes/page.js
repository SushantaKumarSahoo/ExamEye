'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function AdminCodesManagement() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/superadmin/login');
      return;
    }

    fetchCodes(token);
  }, [router]);

  const fetchCodes = async (token) => {
    try {
      const response = await fetch('/api/superadmin/admin-codes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes || []);
      }
    } catch (error) {
      console.error('Error fetching codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const deactivateCode = async (codeId) => {
    const token = Cookies.get('token');
    try {
      const response = await fetch(`/api/superadmin/admin-codes/${codeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'deactivate' })
      });

      if (response.ok) {
        fetchCodes(token);
      }
    } catch (error) {
      console.error('Error deactivating code:', error);
    }
  };

  const filteredCodes = codes.filter(code => {
    const matchesSearch = code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         code.companyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (code.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && code.isActive && !code.isUsed && new Date(code.expiresAt) > new Date()) ||
                         (filterStatus === 'used' && code.isUsed) ||
                         (filterStatus === 'expired' && new Date(code.expiresAt) <= new Date()) ||
                         (filterStatus === 'inactive' && !code.isActive);
    
    const matchesCompany = filterCompany === 'all' || code.companyId === filterCompany;
    
    return matchesSearch && matchesStatus && matchesCompany;
  });

  const getCodeStatus = (code) => {
    if (!code.isActive) return { status: 'inactive', color: '#6b7280', bg: '#f3f4f6' };
    if (code.isUsed) return { status: 'used', color: '#059669', bg: '#ecfdf5' };
    if (new Date(code.expiresAt) <= new Date()) return { status: 'expired', color: '#dc2626', bg: '#fef2f2' };
    return { status: 'active', color: '#f59e0b', bg: '#fef3c7' };
  };

  const uniqueCompanies = [...new Set(codes.map(code => code.companyId))];

  if (loading) {
    return <div className="loading">Loading admin codes...</div>;
  }

  return (
    <div className="admin-background">
      <header className="admin-header" style={{ borderBottom: '2px solid #dc2626' }}>
        <div className="container">
          <div className="header-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🛡️</span>
              <Link href="/superadmin" className="logo" style={{ color: '#dc2626' }}>ExamEye Super Admin</Link>
            </div>
            <nav className="nav-links">
              <Link href="/superadmin" className="nav-link">Dashboard</Link>
              <Link href="/superadmin/codes/generate" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}>
                <span>➕</span>
                Generate Code
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: '#dc2626' }}>
            <span>🔑</span>
            Admin Code Management
          </h1>
          <p style={{ color: '#6b7280' }}>Monitor and manage admin verification codes</p>
        </div>

        {/* Search and Filter */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search codes, companies..."
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
              <option value="used">Used</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="form-input"
              style={{ minWidth: '200px' }}
            >
              <option value="all">All Companies</option>
              {uniqueCompanies.map(companyId => (
                <option key={companyId} value={companyId}>{companyId}</option>
              ))}
            </select>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              {filteredCodes.length} of {codes.length} codes
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>
              {codes.filter(c => c.isActive && !c.isUsed && new Date(c.expiresAt) > new Date()).length}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Active Codes</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669' }}>
              {codes.filter(c => c.isUsed).length}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Used Codes</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#dc2626' }}>
              {codes.filter(c => new Date(c.expiresAt) <= new Date()).length}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Expired Codes</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>
              {codes.length}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Total Codes</div>
          </div>
        </div>

        {/* Codes List */}
        {filteredCodes.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔑</div>
            <h3 style={{ marginBottom: '0.5rem' }}>No codes found</h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              {codes.length === 0 ? 'Generate your first admin code to get started' : 'Try adjusting your search criteria'}
            </p>
            <Link href="/superadmin/codes/generate" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}>
              <span>🔑</span>
              Generate First Code
            </Link>
          </div>
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: '#374151' }}>Code</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: '#374151' }}>Company</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: '#374151' }}>Generated</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: '#374151' }}>Expires</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: '#374151' }}>Used By</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600', color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map((code) => {
                    const statusInfo = getCodeStatus(code);
                    return (
                      <tr key={code._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontFamily: 'monospace', fontWeight: '600', color: '#1f2937' }}>
                            {code.code}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: '500', color: '#1f2937' }}>
                            {code.company?.name || 'Unknown'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            {code.companyId}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            background: statusInfo.bg,
                            color: statusInfo.color,
                            textTransform: 'capitalize'
                          }}>
                            {statusInfo.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                          {new Date(code.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                          {new Date(code.expiresAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {code.usedBy ? (
                            <div>
                              <div style={{ fontWeight: '500', color: '#1f2937' }}>
                                {code.usedBy.username}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                {new Date(code.usedAt).toLocaleDateString()}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#6b7280' }}>Not used</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {code.isActive && !code.isUsed && (
                            <button
                              onClick={() => deactivateCode(code._id)}
                              className="btn btn-secondary"
                              style={{ 
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.8rem',
                                background: '#fef2f2',
                                color: '#dc2626',
                                borderColor: '#fecaca'
                              }}
                            >
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}