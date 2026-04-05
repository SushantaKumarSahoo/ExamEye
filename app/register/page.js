'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const role = searchParams.get('role');
    if (role === 'student') {
      alert('Student registration is not available on the website. Students will receive exam credentials from their administrators.');
      router.push('/');
    } else if (role === 'admin') {
      alert('Admin registration is managed by super administrators. Please contact your super admin for access.');
      router.push('/');
    } else {
      router.push('/auth');
    }
  }, [router, searchParams]);

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
            We're taking you to the registration selection page
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth" className="btn btn-secondary">
              Back to Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}