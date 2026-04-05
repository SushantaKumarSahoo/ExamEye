'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/superadmin/login');
      return;
    }

    fetchCompanies(token);
  }, [router]);

  const fetchCompanies = async (token) => {
    try {
      const response = await fetch('/api/superadmin/companies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanyStatus = async (companyId, currentStatus) => {
    const token = Cookies.get('token');
    try {
      const response = await fetch(`/api/superadmin/companies/${companyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: currentStatus ? 'deactivate' : 'activate' 
        })
      });

      if (response.ok) {
        fetchCompanies(token);
      }
    } catch (error) {
      console.error('Error updating company status:', error);
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.companyId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && company.isActive) ||
                         (filterStatus === 'inactive' && !company.isActive);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="loading">Loading companies...</div>;
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
              <Link href="/superadmin/companies/create" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}>
                <span>➕</span>
                Add Company
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: '#dc2626' }}>
            <span>🏢</span>
            Company Management
          </h1>
          <p style={{ color: '#6b7280' }}>Manage organizations and their subscriptions</p>
        </div>

        {/* Search and Filter */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search companies..."
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
              <option value="all">All Companies</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              {filteredCompanies.length} of {companies.length} companies
            </div>
          </div>
        </div>

        {/* Companies List */}
        {filteredCompanies.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
            <h3 style={{ marginBottom: '0.5rem' }}>No companies found</h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              {companies.length === 0 ? 'Create your first company to get started' : 'Try adjusting your search criteria'}
            </p>
            <Link href="/superadmin/companies/create" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}>
              <span>🏢</span>
              Create First Company
            </Link>
          </div>
        ) : (
          <div className="grid grid-2" style={{ gap: '1.5rem' }}>
            {filteredCompanies.map((company) => (
              <div key={company._id} className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🏢</span>
                      {company.name}
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>ID: {company.companyId}</p>
                  </div>
                  <span 
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      background: company.isActive ? '#ecfdf5' : '#fef2f2',
                      color: company.isActive ? '#059669' : '#dc2626'
                    }}
                  >
                    {company.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                    <div>
                      <span style={{ color: '#6b7280' }}>Email:</span>
                      <div style={{ fontWeight: '500' }}>{company.email}</div>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Industry:</span>
                      <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{company.industry}</div>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Plan:</span>
                      <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>{company.subscriptionPlan}</div>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Created:</span>
                      <div style={{ fontWeight: '500' }}>{new Date(company.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#374151' }}>Limits & Usage</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.8rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>{company.maxAdmins}</div>
                      <div style={{ color: '#6b7280' }}>Max Admins</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>{company.maxExams}</div>
                      <div style={{ color: '#6b7280' }}>Max Exams</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>{company.maxStudents}</div>
                      <div style={{ color: '#6b7280' }}>Max Students</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Link 
                    href={`/superadmin/companies/${company._id}`}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    <span>👁️</span>
                    View Details
                  </Link>
                  <button
                    onClick={() => toggleCompanyStatus(company._id, company.isActive)}
                    className="btn btn-secondary"
                    style={{ 
                      flex: 1,
                      background: company.isActive ? '#fef2f2' : '#ecfdf5',
                      color: company.isActive ? '#dc2626' : '#059669',
                      borderColor: company.isActive ? '#fecaca' : '#a7f3d0'
                    }}
                  >
                    <span>{company.isActive ? '🔴' : '🟢'}</span>
                    {company.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}