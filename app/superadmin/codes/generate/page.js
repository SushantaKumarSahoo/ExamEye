'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function GenerateAdminCode() {
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    companyId: '',
    expiryDays: 30,
    quantity: 1
  });
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/superadmin/login');
      return;
    }

    // Pre-select company if provided in URL
    const companyParam = searchParams.get('company');
    if (companyParam) {
      setFormData(prev => ({ ...prev, companyId: companyParam }));
    }

    fetchCompanies(token);
  }, [router, searchParams]);

  const fetchCompanies = async (token) => {
    try {
      const response = await fetch('/api/superadmin/companies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies.filter(c => c.isActive) || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setGeneratedCodes([]);

    if (!formData.companyId) {
      setError('Please select a company');
      setLoading(false);
      return;
    }

    const token = Cookies.get('token');
    const codes = [];

    try {
      // Generate multiple codes if quantity > 1
      for (let i = 0; i < parseInt(formData.quantity); i++) {
        const response = await fetch('/api/superadmin/admin-codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            companyId: formData.companyId,
            expiryDays: parseInt(formData.expiryDays)
          })
        });

        const data = await response.json();

        if (response.ok) {
          codes.push(data.code);
        } else {
          setError(data.message);
          setLoading(false);
          return;
        }
      }

      setGeneratedCodes(codes);
      setSuccess(`Successfully generated ${codes.length} admin code${codes.length > 1 ? 's' : ''} and sent to company email!`);
      
      // Reset form
      setFormData({
        companyId: formData.companyId, // Keep company selected
        expiryDays: 30,
        quantity: 1
      });

    } catch (error) {
      setError('Failed to generate admin codes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  const selectedCompany = companies.find(c => c.companyId === formData.companyId);

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
              <Link href="/superadmin/codes" className="nav-link">All Codes</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: '#dc2626' }}>
              <span>🔑</span>
              Generate Admin Codes
            </h1>
            <p style={{ color: '#6b7280' }}>Create verification codes for admin registration</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚙️</span>
                Code Configuration
              </h3>

              <div className="form-group">
                <label className="form-label">Select Company *</label>
                <select
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="">Choose a company...</option>
                  {companies.map((company) => (
                    <option key={company._id} value={company.companyId}>
                      {company.name} ({company.companyId})
                    </option>
                  ))}
                </select>
                {selectedCompany && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f0f9ff', borderRadius: '6px', fontSize: '0.9rem' }}>
                    <div style={{ color: '#0369a1', fontWeight: '500' }}>Selected: {selectedCompany.name}</div>
                    <div style={{ color: '#0c4a6e', fontSize: '0.8rem' }}>
                      Plan: {selectedCompany.subscriptionPlan} | Max Admins: {selectedCompany.maxAdmins}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Expiry (Days)</label>
                  <select
                    name="expiryDays"
                    value={formData.expiryDays}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days (Default)</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <select
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value={1}>1 code</option>
                    <option value={2}>2 codes</option>
                    <option value={3}>3 codes</option>
                    <option value={5}>5 codes</option>
                    <option value={10}>10 codes</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span>💡</span>
                  <span style={{ fontWeight: '500', color: '#92400e' }}>Code Information</span>
                </div>
                <ul style={{ fontSize: '0.8rem', color: '#92400e', margin: 0, paddingLeft: '1.5rem' }}>
                  <li>Codes are unique and can only be used once</li>
                  <li>Each code allows one admin registration</li>
                  <li>Expired codes cannot be used for registration</li>
                  <li>Codes are tied to the selected company</li>
                </ul>
              </div>
            </div>

            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
            {success && <div className="success" style={{ marginBottom: '1rem' }}>{success}</div>}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginBottom: '2rem' }}>
              <Link href="/superadmin" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⏳</span>
                    Generating...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🔑</span>
                    Generate Code{formData.quantity > 1 ? 's' : ''}
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Generated Codes Display */}
          {generatedCodes.length > 0 && (
            <div className="card" style={{ padding: '2rem', border: '2px solid #10b981' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669' }}>
                <span>✅</span>
                Generated Admin Code{generatedCodes.length > 1 ? 's' : ''}
              </h3>

              <div style={{ marginBottom: '1rem', padding: '1rem', background: '#ecfdf5', borderRadius: '8px' }}>
                <div style={{ color: '#059669', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <strong>✅ Codes Generated & Email Sent!</strong>
                </div>
                <div style={{ color: '#047857', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  📧 Admin code{generatedCodes.length > 1 ? 's have' : ' has'} been automatically sent to: <strong>{selectedCompany?.email}</strong>
                </div>
                <div style={{ color: '#047857', fontSize: '0.8rem' }}>
                  Company employees can use {generatedCodes.length > 1 ? 'these codes' : 'this code'} to register as administrators.
                </div>
              </div>

              {generatedCodes.map((code, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1rem', 
                  background: '#f8fafc', 
                  borderRadius: '8px', 
                  marginBottom: '1rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: '600', color: '#1f2937' }}>
                      {code.code}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      Expires: {new Date(code.expiresAt).toLocaleDateString()} | Company: {code.companyId}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(code.code)}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    📋 Copy
                  </button>
                </div>
              ))}

              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <Link href="/superadmin/codes" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}>
                  <span>📊</span>
                  View All Codes
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}