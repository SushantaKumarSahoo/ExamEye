'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function CompanyDetails() {
  const [company, setCompany] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();
  const companyId = params.id;

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/superadmin/login');
      return;
    }

    if (companyId) {
      console.log('Fetching company with ID:', companyId);
      fetchCompanyDetails(token);
    } else {
      console.error('No company ID provided');
      setError('No company ID provided');
      setLoading(false);
    }
  }, [router, companyId]);

  const fetchCompanyDetails = async (token) => {
    try {
      // Fetch company details
      const companyResponse = await fetch(`/api/superadmin/companies/${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        setCompany(companyData.company);
        
        // Fetch admins for this company
        const adminsResponse = await fetch('/api/superadmin/admins', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (adminsResponse.ok) {
          const adminsData = await adminsResponse.json();
          const companyAdmins = adminsData.admins.filter(admin => admin.companyId === companyData.company?.companyId);
          setAdmins(companyAdmins);
        }
      } else {
        const errorData = await companyResponse.json();
        console.error('Error response:', errorData);
        setError(errorData.message || 'Company not found');
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
      setError('Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanyStatus = async () => {
    const token = Cookies.get('token');
    try {
      const response = await fetch(`/api/superadmin/companies/${companyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: company.isActive ? 'deactivate' : 'activate' 
        })
      });

      if (response.ok) {
        fetchCompanyDetails(token);
      }
    } catch (error) {
      console.error('Error updating company status:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading company details...</div>;
  }

  if (error || !company) {
    return (
      <div className="admin-background">
        <div className="container" style={{ padding: '4rem 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2>{error || 'Company not found'}</h2>
          <Link href="/superadmin/companies" className="btn btn-primary" style={{ marginTop: '2rem' }}>
            Back to Companies
          </Link>
        </div>
      </div>
    );
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
            <Link href="/superadmin/companies" style={{
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
              Back to Companies
            </Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        {/* Company Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: '#1f2937' }}>
                <span style={{ fontSize: '2rem' }}>🏢</span>
                {company.name}
              </h1>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>Company ID: {company.companyId}</p>
            </div>
            <span 
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '25px',
                fontSize: '0.9rem',
                fontWeight: '600',
                background: company.isActive ? '#ecfdf5' : '#fef2f2',
                color: company.isActive ? '#059669' : '#dc2626'
              }}
            >
              {company.isActive ? '✅ Active' : '🔴 Inactive'}
            </span>
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: '2rem', marginBottom: '2rem' }}>
          {/* Company Information */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📋</span>
              Company Information
            </h3>
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Company Name</label>
                <div style={{ fontWeight: '500', fontSize: '1rem' }}>{company.name}</div>
              </div>
              <div>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Email</label>
                <div style={{ fontWeight: '500', fontSize: '1rem' }}>{company.email}</div>
              </div>
              <div>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Industry</label>
                <div style={{ fontWeight: '500', fontSize: '1rem', textTransform: 'capitalize' }}>{company.industry}</div>
              </div>
              <div>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Created Date</label>
                <div style={{ fontWeight: '500', fontSize: '1rem' }}>{new Date(company.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>💳</span>
              Subscription Details
            </h3>
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Plan</label>
                <div style={{ fontWeight: '600', fontSize: '1.1rem', textTransform: 'capitalize', color: '#1f2937' }}>{company.subscriptionPlan}</div>
              </div>
              <div>
                <label style={{ display: 'block', color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Status</label>
                <div style={{ fontWeight: '500', fontSize: '1rem', color: company.isActive ? '#059669' : '#dc2626' }}>
                  {company.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              {company.subscriptionStartDate && (
                <div>
                  <label style={{ display: 'block', color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Start Date</label>
                  <div style={{ fontWeight: '500', fontSize: '1rem' }}>{new Date(company.subscriptionStartDate).toLocaleDateString()}</div>
                </div>
              )}
              {company.subscriptionEndDate && (
                <div>
                  <label style={{ display: 'block', color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.25rem' }}>End Date</label>
                  <div style={{ fontWeight: '500', fontSize: '1rem' }}>{new Date(company.subscriptionEndDate).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Limits & Quotas */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📊</span>
            Limits & Quotas
          </h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>{company.maxAdmins}</div>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Maximum Admins</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>{company.maxExams}</div>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Maximum Exams</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>{company.maxStudents}</div>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Maximum Students</div>
            </div>
          </div>
        </div>

        {/* Administrators */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>👥</span>
            Administrators ({admins.length})
          </h3>
          {admins.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No administrators for this company yet</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {admins.map((admin) => (
                <div key={admin._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{admin.username}</div>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>{admin.email}</div>
                  </div>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '20px', 
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    background: admin.isActive ? '#ecfdf5' : '#fef2f2',
                    color: admin.isActive ? '#059669' : '#dc2626'
                  }}>
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={toggleCompanyStatus}
            className="btn"
            style={{ 
              padding: '1rem 2rem',
              background: company.isActive ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
          >
            {company.isActive ? '🔴 Deactivate Company' : '🟢 Activate Company'}
          </button>
        </div>
      </main>
    </div>
  );
}
