'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function SuperAdminRegister() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organizationName: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const router = useRouter();

  const validateField = (name, value) => {
    const errors = { ...validationErrors };
    
    switch (name) {
      case 'username':
        if (value.length < 3) {
          errors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          errors.username = 'Username can only contain letters, numbers, and underscores';
        } else {
          delete errors.username;
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        break;
      case 'password':
        if (value.length < 12) {
          errors.password = 'Password must be at least 12 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(value)) {
          errors.password = 'Password must contain uppercase, lowercase, number, and special character';
        } else {
          delete errors.password;
        }
        break;
      case 'confirmPassword':
        if (value !== formData.password) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;

    }
    
    setValidationErrors(errors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    validateField(name, value);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const hasErrors = Object.keys(validationErrors).length > 0;
    if (hasErrors) {
      setError('Please fix all validation errors');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          role: 'superadmin'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Super Admin account created successfully! Redirecting...');
        
        Cookies.set('token', data.token, { expires: 7 });
        
        setTimeout(() => {
          router.push('/superadmin');
        }, 2000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <Link href="/" style={{ 
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
            <Link href="/" style={{
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
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingBottom: '2rem' }}>
        <div className="form-container" style={{ maxWidth: '500px', border: '2px solid #dc2626', marginBottom: '0' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛡️</div>
            <h2 style={{ marginBottom: '0.5rem', color: '#1f2937' }}>
              Super Admin Registration
            </h2>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              Highest level access - System Administration
            </p>
          </div>

          {/* Security Notice */}
          <div style={{ 
            padding: '1rem', 
            background: '#fef3c7', 
            border: '1px solid #f59e0b', 
            borderRadius: '8px', 
            marginBottom: '1.5rem' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span>🛡️</span>
              <h4 style={{ fontSize: '0.9rem', color: '#92400e', margin: 0 }}>
                Super Administrator Access
              </h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#92400e', margin: 0 }}>
              This role provides complete system access including company management and admin code generation.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Personal Information */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '1rem', color: '#374151', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>👤</span>
                Personal Information
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="John"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="superadmin_john"
                  required
                />
                {validationErrors.username && (
                  <div className="error">{validationErrors.username}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="superadmin@exameye.com"
                  required
                />
                {validationErrors.email && (
                  <div className="error">{validationErrors.email}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Organization Name</label>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="ExamEye Systems"
                />
              </div>
            </div>

            {/* Security */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '1rem', color: '#374151', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🔐</span>
                Account Security
              </h4>
              
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Create a very strong password"
                  required
                />
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Minimum 12 characters with uppercase, lowercase, number, and special character
                </div>
                {validationErrors.password && (
                  <div className="error">{validationErrors.password}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Confirm your password"
                  required
                />
                {validationErrors.confirmPassword && (
                  <div className="error">{validationErrors.confirmPassword}</div>
                )}
              </div>
            </div>

            {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}
            {success && <div className="success" style={{ marginBottom: '1rem' }}>{success}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}
              disabled={loading || Object.keys(validationErrors).length > 0}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>⏳</span>
                  Creating Super Admin Account...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>🛡️</span>
                  Create Super Admin Account
                </span>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', padding: '1.5rem', background: '#ffffff', borderRadius: '12px', border: '2px solid #dc2626' }}>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Already have a super admin account?
            </p>
            <Link href="/superadmin/login" className="btn btn-secondary">
              Super Admin Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}