'use client';

import Link from 'next/link';

export default function AuthSelection() {
  return (
    <div className="page-background-alt">
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
            <nav>
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
            </nav>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '4rem 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#1f2937' }}>
            Choose Your Access Type
          </h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '3rem', color: '#6b7280' }}>
            Select whether you're a student or administrator to continue
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '2.5rem', 
            maxWidth: '1400px', 
            margin: '0 auto'
          }}>
            {/* Student Access */}
            <div className="card" style={{ textAlign: 'center', padding: '3rem 2.5rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎓</div>
              <h3 style={{ fontSize: '1.6rem', marginBottom: '1rem', color: '#1f2937', fontWeight: '700' }}>
                Student Access
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: '1.7', fontSize: '1.05rem' }}>
                Access exams using credentials sent to your email address
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ 
                  padding: '1rem', 
                  background: '#f0f9ff', 
                  borderRadius: '8px', 
                  border: '1px solid #bae6fd',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#0369a1', fontWeight: '500', marginBottom: '0.5rem' }}>
                    🔒 Students: Use Secure Browser
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#0c4a6e' }}>
                    Student login is only available through the ExamEye Secure Browser application.
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', fontSize: '0.9rem', color: '#6b7280' }}>
                  <strong>Note:</strong> Students receive login credentials via email for each exam
                </div>
              </div>
            </div>

            {/* Admin Access */}
            <div className="card" style={{ textAlign: 'center', padding: '3rem 2.5rem', border: '2px solid #374151' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔐</div>
              <h3 style={{ fontSize: '1.6rem', marginBottom: '1rem', color: '#1f2937', fontWeight: '700' }}>
                Administrator Access
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: '1.7', fontSize: '1.05rem' }}>
                Create exams, manage students, and monitor exam sessions
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '140px' }}>
                <Link href="/admin/login" className="btn btn-primary">
                  Admin Login
                </Link>
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', fontSize: '0.9rem', color: '#6b7280', textAlign: 'left' }}>
                  <strong>Note:</strong> For login credentials, check your company-provided email or contact the super administrator
                </div>
              </div>
            </div>

            {/* Super Admin Access */}
            <div className="card" style={{ textAlign: 'center', padding: '3rem 2.5rem', border: '2px solid #dc2626' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🛡️</div>
              <h3 style={{ fontSize: '1.6rem', marginBottom: '1rem', color: '#dc2626', fontWeight: '700' }}>
                Super Admin Access
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: '1.7', fontSize: '1.05rem' }}>
                System administration, manage companies and generate admin codes
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '140px' }}>
                <Link href="/superadmin/login" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}>
                  Super Admin Login
                </Link>
                <Link href="/superadmin/register" className="btn btn-secondary" style={{ borderColor: '#dc2626', color: '#dc2626' }}>
                  Register as Super Admin
                </Link>
              </div>
            </div>
          </div>


        </div>
      </main>
    </div>
  );
}