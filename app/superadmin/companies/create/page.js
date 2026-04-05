'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function CreateCompany() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    industry: 'education',
    subscriptionPlan: 'free_trial',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [createdCompany, setCreatedCompany] = useState(null);
  const router = useRouter();

  const subscriptionPlans = {
    free_trial: {
      name: 'Free Trial',
      description: '30-day trial with basic features',
      price: 'Free for 30 days',
      features: ['2 Admins', '5 Exams', '50 Students', 'Basic Support'],
      color: '#059669'
    },
    basic: {
      name: 'Basic Plan',
      description: 'Perfect for small organizations',
      price: '₹2,499/month',
      features: ['5 Admins', '50 Exams', '1,000 Students', 'Email Support'],
      color: '#3b82f6'
    },
    premium: {
      name: 'Premium Plan',
      description: 'Advanced features for growing organizations',
      price: '₹8,499/month',
      features: ['15 Admins', '200 Exams', '5,000 Students', 'Priority Support', 'Advanced Analytics'],
      color: '#8b5cf6'
    },
    enterprise: {
      name: 'Enterprise Plan',
      description: 'Full-scale solution for large organizations',
      price: '₹24,999/month',
      features: ['50 Admins', '1,000 Exams', '25,000 Students', '24/7 Support', 'Custom Features'],
      color: '#dc2626'
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/superadmin/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Company created successfully!');
        setCreatedCompany(data.company);
        // Generate admin credentials
        await generateAdminCredentials(data.company);
      } else {
        setMessage(data.message || 'Failed to create company');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateAdminCredentials = async (company) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/superadmin/generate-admin-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: company.companyId,
          companyName: company.name,
          companyEmail: company.email
        })
      });

      const data = await response.json();
      if (response.ok) {
        setCreatedCompany(prev => ({
          ...prev,
          adminCredentials: data.credentials
        }));
      }
    } catch (error) {
      console.error('Error generating admin credentials:', error);
    }
  };

  if (createdCompany) {
    return (
      <div className="admin-background">
        <header className="admin-header" style={{ borderBottom: '2px solid #dc2626' }}>
          <div className="container">
            <div className="header-content">
              <Link href="/superadmin" className="logo" style={{ color: '#dc2626' }}>
                🛡️ ExamEye Super Admin
              </Link>
            </div>
          </div>
        </header>

        <main className="container" style={{ padding: '2rem 20px' }}>
          <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <h2 style={{ color: '#059669', marginBottom: '0.5rem' }}>Company Created Successfully!</h2>
              <p style={{ color: '#6b7280' }}>The company has been set up with admin credentials</p>
            </div>

            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🏢</span>
                Company Details
              </h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div><strong>Name:</strong> {createdCompany.name}</div>
                <div><strong>Company ID:</strong> <code>{createdCompany.companyId}</code></div>
                <div><strong>Email:</strong> {createdCompany.email}</div>
                <div><strong>Subscription:</strong> 
                  <span style={{ 
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    background: subscriptionPlans[createdCompany.subscriptionPlan].color + '20',
                    color: subscriptionPlans[createdCompany.subscriptionPlan].color
                  }}>
                    {subscriptionPlans[createdCompany.subscriptionPlan].name}
                  </span>
                </div>
              </div>
            </div>

            {createdCompany.adminCredentials && (
              <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #f59e0b' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e' }}>
                  <span>🔑</span>
                  Admin Credentials (Share with Company)
                </h3>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                  <div><strong>Username:</strong> {createdCompany.adminCredentials.username}</div>
                  <div><strong>Email:</strong> {createdCompany.adminCredentials.email}</div>
                  <div><strong>Password:</strong> {createdCompany.adminCredentials.password}</div>
                  <div><strong>Admin Code:</strong> {createdCompany.adminCredentials.adminCode}</div>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#92400e', marginTop: '1rem', marginBottom: 0 }}>
                  ⚠️ Please share these credentials securely with the company. The admin can change the password after first login.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/superadmin" className="btn btn-primary">
                Back to Dashboard
              </Link>
              <button 
                onClick={() => {
                  setCreatedCompany(null);
                  setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    website: '',
                    industry: 'education',
                    subscriptionPlan: 'free_trial',
                    address: { street: '', city: '', state: '', country: '', zipCode: '' }
                  });
                }}
                className="btn btn-secondary"
              >
                Create Another Company
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-background">
      <header className="admin-header" style={{ borderBottom: '2px solid #dc2626' }}>
        <div className="container">
          <div className="header-content">
            <Link href="/superadmin" className="logo" style={{ color: '#dc2626' }}>
              🛡️ ExamEye Super Admin
            </Link>
            <nav className="nav-links">
              <Link href="/superadmin" className="btn btn-secondary">Back to Dashboard</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, fontSize: '2rem', fontWeight: '700', color: '#dc2626' }}>
              <span>🏢</span>
              Create New Company
            </h1>
            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Add a new organization to the ExamEye platform</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-2" style={{ gap: '2rem' }}>
              {/* Company Information */}
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📋</span>
                  Company Information
                </h3>
                
                <div className="form-group">
                  <label htmlFor="name" className="form-label">Company Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter company name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">Company Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="company@example.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="form-input"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="website" className="form-label">Website</label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    className="form-input"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://company.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="industry" className="form-label">Industry</label>
                  <select
                    id="industry"
                    name="industry"
                    className="form-input"
                    value={formData.industry}
                    onChange={handleInputChange}
                  >
                    <option value="education">Education</option>
                    <option value="technology">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="finance">Finance</option>
                    <option value="government">Government</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Subscription Plan */}
              <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>💳</span>
                  Subscription Plan
                </h3>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {Object.entries(subscriptionPlans).map(([key, plan]) => (
                    <label 
                      key={key}
                      style={{ 
                        display: 'block',
                        padding: '1rem',
                        border: formData.subscriptionPlan === key ? `2px solid ${plan.color}` : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: formData.subscriptionPlan === key ? `${plan.color}10` : 'white'
                      }}
                    >
                      <input
                        type="radio"
                        name="subscriptionPlan"
                        value={key}
                        checked={formData.subscriptionPlan === key}
                        onChange={handleInputChange}
                        style={{ marginRight: '0.75rem' }}
                      />
                      <div style={{ display: 'inline-block' }}>
                        <div style={{ fontWeight: '600', color: plan.color, marginBottom: '0.25rem' }}>
                          {plan.name} - {plan.price}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                          {plan.description}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          {plan.features.join(' • ')}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="card" style={{ padding: '2rem', marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📍</span>
                Address Information (Optional)
              </h3>
              
              <div className="grid grid-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="address.street" className="form-label">Street Address</label>
                  <input
                    type="text"
                    id="address.street"
                    name="address.street"
                    className="form-input"
                    value={formData.address.street}
                    onChange={handleInputChange}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="address.city" className="form-label">City</label>
                  <input
                    type="text"
                    id="address.city"
                    name="address.city"
                    className="form-input"
                    value={formData.address.city}
                    onChange={handleInputChange}
                    placeholder="New York"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="address.state" className="form-label">State/Province</label>
                  <input
                    type="text"
                    id="address.state"
                    name="address.state"
                    className="form-input"
                    value={formData.address.state}
                    onChange={handleInputChange}
                    placeholder="NY"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="address.country" className="form-label">Country</label>
                  <input
                    type="text"
                    id="address.country"
                    name="address.country"
                    className="form-input"
                    value={formData.address.country}
                    onChange={handleInputChange}
                    placeholder="United States"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="address.zipCode" className="form-label">ZIP/Postal Code</label>
                  <input
                    type="text"
                    id="address.zipCode"
                    name="address.zipCode"
                    className="form-input"
                    value={formData.address.zipCode}
                    onChange={handleInputChange}
                    placeholder="10001"
                  />
                </div>
              </div>
            </div>

            {message && (
              <div style={{ 
                padding: '1rem', 
                marginTop: '1rem',
                borderRadius: '8px',
                background: message.includes('success') ? '#ecfdf5' : '#fef2f2',
                color: message.includes('success') ? '#059669' : '#dc2626',
                border: `1px solid ${message.includes('success') ? '#10b981' : '#ef4444'}`
              }}>
                {message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
              <Link href="/superadmin" className="btn btn-secondary">
                Cancel
              </Link>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}
              >
                {loading ? 'Creating Company...' : 'Create Company'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}