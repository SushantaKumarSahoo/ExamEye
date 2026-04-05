'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function ExamCredentials() {
  const [exam, setExam] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchCredentials(token);
  }, [params.id, router]);

  const fetchCredentials = async (token) => {
    try {
      const response = await fetch(`/api/admin/temp-credentials/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setExam(data.exam);
        setCredentials(data.credentials);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error fetching credentials');
      console.error('Error fetching credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '2rem' }}>🔑</div>
        <div>Loading credentials...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '2rem' }}>❌</div>
        <div>{error}</div>
        <Link href={`/admin/exam/${params.id}`} className="btn btn-primary">Back to Exam</Link>
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <div className="container">
          <div className="header-content">
            <Link href="/admin" className="logo">ExamEye Admin</Link>
            <nav className="nav-links">
              <Link href="/admin" className="nav-link">Dashboard</Link>
              <Link href={`/admin/exam/${params.id}`} className="nav-link">Back to Exam</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1>🔑 Student Login Credentials</h1>
          <p style={{ color: '#6b7280' }}>
            Temporary credentials for exam: <strong>{exam?.title}</strong>
          </p>
        </div>

        {/* Instructions */}
        <div className="card" style={{ marginBottom: '2rem', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <h3 style={{ color: '#0369a1', marginBottom: '1rem' }}>📋 How to Test Student Login</h3>
          <ol style={{ color: '#0c4a6e', paddingLeft: '1.5rem' }}>
            <li>Copy any username and password from the table below</li>
            <li>Open the <strong>ExamEye Secure Browser</strong> application</li>
            <li>Select "Username (Exam Credentials)" as login type</li>
            <li>Enter the copied username and password</li>
            <li>Click "Sign In" to access the student dashboard</li>
          </ol>
        </div>

        {/* Credentials Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Generated Credentials ({credentials.length})</h3>
            <div style={{ 
              padding: '1rem', 
              background: '#f0f9ff', 
              borderRadius: '8px', 
              border: '1px solid #bae6fd',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#0369a1', fontWeight: '500', marginBottom: '0.5rem' }}>
                🔒 Students must use the ExamEye Secure Browser
              </div>
              <div style={{ fontSize: '0.85rem', color: '#0c4a6e' }}>
                These credentials can only be used in the secure browser application, not on this website.
              </div>
            </div>
            <button 
              onClick={() => alert('Students must download and install the ExamEye Secure Browser application to use these credentials.')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>🚀</span>
              Open Student Login
            </button>
          </div>

          {credentials.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem', 
              color: '#6b7280',
              background: '#f9fafb',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <h3>No Active Credentials</h3>
              <p>No temporary credentials found for this exam.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600' }}>Username</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600' }}>Password</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((cred, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{cred.email}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ 
                          fontFamily: 'monospace', 
                          background: '#f3f4f6', 
                          padding: '0.5rem', 
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          {cred.username}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ 
                          fontFamily: 'monospace', 
                          background: '#f3f4f6', 
                          padding: '0.5rem', 
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          {cred.password}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          background: cred.isUsed ? '#ecfdf5' : '#fef3c7',
                          color: cred.isUsed ? '#059669' : '#d97706'
                        }}>
                          {cred.isUsed ? '✅ Used' : '⏳ Unused'}
                        </span>
                        {cred.loginTime && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            Last login: {new Date(cred.loginTime).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => copyToClipboard(cred.username)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#374151',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Copy Username
                          </button>
                          <button
                            onClick={() => copyToClipboard(cred.password)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#374151',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Copy Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Email Status */}
        <div className="card" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
          <h3 style={{ color: '#92400e', marginBottom: '1rem' }}>📧 Email Status</h3>
          <p style={{ color: '#92400e', marginBottom: '1rem' }}>
            <strong>Email credentials are not configured.</strong> The system is logging credentials to the console instead of sending emails.
          </p>
          <div style={{ fontSize: '0.9rem', color: '#92400e' }}>
            <p><strong>To enable email sending:</strong></p>
            <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Configure EMAIL_USER and EMAIL_PASS in your .env file</li>
              <li>For Gmail: Use your email and app password</li>
              <li>Restart the development server</li>
              <li>Check the EMAIL_SETUP.md file for detailed instructions</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}