'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function LaunchExam() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('launching');
  const [examUrl, setExamUrl] = useState('');

  useEffect(() => {
    const examId = searchParams.get('examId');
    const username = searchParams.get('username');
    const password = searchParams.get('password');

    if (examId && username && password) {
      const deepLink = `exameye://exam/${examId}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      setExamUrl(deepLink);

      // Attempt to launch the secure browser
      window.location.href = deepLink;

      // Set a timeout to show instructions if the app doesn't open
      setTimeout(() => {
        setStatus('waiting');
      }, 2000);
    } else {
      setStatus('error');
    }
  }, [searchParams]);

  const handleManualLaunch = () => {
    if (examUrl) {
      window.location.href = examUrl;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(examUrl);
    alert('Link copied to clipboard! Paste it in your browser address bar.');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        background: 'white',
        borderRadius: '15px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        {status === 'launching' && (
          <>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚀</div>
            <h1 style={{ fontSize: '28px', marginBottom: '15px', color: '#1f2937' }}>
              Launching Secure Browser...
            </h1>
            <p style={{ color: '#6b7280', fontSize: '16px', lineHeight: '1.6' }}>
              The ExamEye Secure Browser should open automatically in a moment.
            </p>
            <div style={{
              margin: '30px auto',
              width: '50px',
              height: '50px',
              border: '5px solid #f3f4f6',
              borderTop: '5px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </>
        )}

        {status === 'waiting' && (
          <>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
            <h1 style={{ fontSize: '28px', marginBottom: '15px', color: '#1f2937' }}>
              Launch ExamEye Secure Browser
            </h1>
            
            <div style={{
              background: '#fef3c7',
              borderLeft: '4px solid #f59e0b',
              padding: '15px',
              margin: '20px 0',
              textAlign: 'left',
              borderRadius: '5px'
            }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>⚠️ Browser didn't open?</p>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Make sure you have the ExamEye Secure Browser installed on your computer.
              </p>
            </div>

            <button
              onClick={handleManualLaunch}
              style={{
                width: '100%',
                padding: '15px 30px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '15px'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#b91c1c'}
              onMouseOut={(e) => e.currentTarget.style.background = '#dc2626'}
            >
              🚀 Try Again
            </button>

            <button
              onClick={copyToClipboard}
              style={{
                width: '100%',
                padding: '12px 30px',
                background: '#f3f4f6',
                color: '#1f2937',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
            >
              📋 Copy Launch Link
            </button>

            <div style={{
              background: '#e0f2fe',
              borderLeft: '4px solid #0284c7',
              padding: '15px',
              margin: '20px 0',
              textAlign: 'left',
              borderRadius: '5px',
              fontSize: '14px'
            }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>📥 Don't have the Secure Browser?</p>
              <a
                href="https://github.com/SushantaKumarSahoo/ExamEye/releases/download/First/ExamEye.Secure.Browser.Setup.1.0.0.exe"
                style={{
                  color: '#dc2626',
                  fontWeight: 'bold',
                  textDecoration: 'none'
                }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download it here →
              </a>
            </div>

            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#6b7280' }}>
                Manual Launch Instructions
              </summary>
              <div style={{
                marginTop: '10px',
                padding: '15px',
                background: '#f9fafb',
                borderRadius: '5px',
                fontSize: '14px'
              }}>
                <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                  <li>Click "Copy Launch Link" above</li>
                  <li>Open your browser's address bar</li>
                  <li>Paste the link and press Enter</li>
                  <li>Allow the browser to open ExamEye</li>
                </ol>
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  background: 'white',
                  borderRadius: '3px',
                  wordBreak: 'break-all',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>
                  {examUrl}
                </div>
              </div>
            </details>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>❌</div>
            <h1 style={{ fontSize: '28px', marginBottom: '15px', color: '#dc2626' }}>
              Invalid Launch Link
            </h1>
            <p style={{ color: '#6b7280', fontSize: '16px', lineHeight: '1.6' }}>
              This link appears to be invalid or incomplete. Please check your email for the correct link.
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                marginTop: '20px',
                padding: '12px 30px',
                background: '#667eea',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}
            >
              ← Back to Home
            </a>
          </>
        )}
      </div>
    </div>
  );
}
