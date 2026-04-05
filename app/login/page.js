'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to auth selection page
    router.push('/auth');
  }, [router]);

  return (
    <div className="page-background-subtle">
      <header className="header">
        <div className="container">
          <div className="header-content">
            <Link href="/" className="logo">ExamEye</Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '4rem 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
          <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>Redirecting...</h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            We're taking you to the login selection page
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/admin/login" className="btn btn-secondary">
              Admin Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}