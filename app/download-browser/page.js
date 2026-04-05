'use client';

import { useState, useEffect } from 'react';

export default function DownloadBrowser() {
  const [detectedOS, setDetectedOS] = useState('windows');

  useEffect(() => {
    const detectOS = () => {
      const userAgent = window.navigator.userAgent;
      if (userAgent.indexOf('Win') !== -1) return 'windows';
      if (userAgent.indexOf('Mac') !== -1) return 'mac';
      if (userAgent.indexOf('Linux') !== -1) return 'linux';
      return 'windows';
    };
    setDetectedOS(detectOS());
  }, []);

  const handleDownload = (os) => {
    const downloads = {
      windows: 'https://github.com/SushantaKumarSahoo/ExamEye/releases/download/First/ExamEye.Secure.Browser.Setup.1.0.0.exe',
      mac: 'https://github.com/SushantaKumarSahoo/ExamEye/releases/download/First/ExamEye-Secure-Browser.dmg',
      linux: 'https://github.com/SushantaKumarSahoo/ExamEye/releases/download/First/ExamEye-Secure-Browser.AppImage'
    };
    
    window.location.href = downloads[os];
  };

  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '1000px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '10px' }}>
          📥 Download ExamEye Secure Browser
        </h1>
        <p style={{ fontSize: '18px', color: '#666' }}>
          Required for taking secure examinations
        </p>
      </div>
      
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: '30px', 
        borderRadius: '15px', 
        margin: '30px 0',
        color: 'white'
      }}>
        <h2 style={{ marginTop: 0 }}>🔒 Why use the Secure Browser?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h3>✅ Security Features</h3>
            <ul style={{ lineHeight: '1.8' }}>
              <li>Full-screen lockdown mode</li>
              <li>Prevents unauthorized access</li>
              <li>Blocks screen capture</li>
              <li>Disables keyboard shortcuts</li>
            </ul>
          </div>
          <div>
            <h3>🎯 Exam Integrity</h3>
            <ul style={{ lineHeight: '1.8' }}>
              <li>Monitors exam activity</li>
              <li>Prevents cheating attempts</li>
              <li>Required for all examinations</li>
              <li>Ensures fair assessment</li>
            </ul>
          </div>
        </div>
      </div>

      <h2 style={{ textAlign: 'center', margin: '40px 0 30px' }}>
        Choose Your Platform
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginTop: '30px' 
      }}>
        <button 
          onClick={() => handleDownload('windows')}
          style={{
            padding: '40px 20px',
            background: detectedOS === 'windows' ? '#0078D4' : '#f0f0f0',
            color: detectedOS === 'windows' ? 'white' : '#333',
            border: detectedOS === 'windows' ? '3px solid #005a9e' : '2px solid #ddd',
            borderRadius: '15px',
            cursor: 'pointer',
            fontSize: '18px',
            transition: 'all 0.3s',
            fontWeight: 'bold'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '10px' }}>🪟</div>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>Windows</div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>Windows 10/11</div>
          {detectedOS === 'windows' && (
            <div style={{ 
              marginTop: '10px', 
              padding: '5px 10px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '5px',
              fontSize: '12px'
            }}>
              ✓ Recommended for your system
            </div>
          )}
        </button>

        <button 
          onClick={() => handleDownload('mac')}
          style={{
            padding: '40px 20px',
            background: detectedOS === 'mac' ? '#000000' : '#f0f0f0',
            color: detectedOS === 'mac' ? 'white' : '#333',
            border: detectedOS === 'mac' ? '3px solid #333' : '2px solid #ddd',
            borderRadius: '15px',
            cursor: 'pointer',
            fontSize: '18px',
            transition: 'all 0.3s',
            fontWeight: 'bold'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '10px' }}>🍎</div>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>macOS</div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>macOS 10.14+</div>
          {detectedOS === 'mac' && (
            <div style={{ 
              marginTop: '10px', 
              padding: '5px 10px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '5px',
              fontSize: '12px'
            }}>
              ✓ Recommended for your system
            </div>
          )}
        </button>

        <button 
          onClick={() => handleDownload('linux')}
          style={{
            padding: '40px 20px',
            background: detectedOS === 'linux' ? '#FCC624' : '#f0f0f0',
            color: detectedOS === 'linux' ? 'black' : '#333',
            border: detectedOS === 'linux' ? '3px solid #e0a800' : '2px solid #ddd',
            borderRadius: '15px',
            cursor: 'pointer',
            fontSize: '18px',
            transition: 'all 0.3s',
            fontWeight: 'bold'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '10px' }}>🐧</div>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>Linux</div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>Ubuntu 18.04+</div>
          {detectedOS === 'linux' && (
            <div style={{ 
              marginTop: '10px', 
              padding: '5px 10px', 
              background: 'rgba(0,0,0,0.1)', 
              borderRadius: '5px',
              fontSize: '12px'
            }}>
              ✓ Recommended for your system
            </div>
          )}
        </button>
      </div>

      <div style={{ 
        marginTop: '50px', 
        padding: '30px', 
        background: '#fff3cd', 
        borderRadius: '15px',
        borderLeft: '5px solid #ffc107'
      }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>📋</span> Installation Instructions
        </h3>
        <ol style={{ lineHeight: '2', fontSize: '16px' }}>
          <li><strong>Download</strong> the installer for your operating system above</li>
          <li><strong>Run</strong> the installer and follow the installation prompts</li>
          <li><strong>Allow</strong> the app to register the <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '3px' }}>exameye://</code> protocol</li>
          <li><strong>Check your email</strong> for the exam invitation</li>
          <li><strong>Click</strong> the "Launch Secure Browser" button in the email</li>
          <li>The browser will <strong>open automatically</strong> with your exam loaded</li>
        </ol>
      </div>

      <div style={{ 
        marginTop: '30px', 
        padding: '30px', 
        background: '#e3f2fd', 
        borderRadius: '15px',
        borderLeft: '5px solid #2196F3'
      }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>💡</span> How It Works
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📧</div>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>1. Receive Email</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Get exam invitation in your inbox</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🖱️</div>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>2. Click Link</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Click "Launch Secure Browser"</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🚀</div>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>3. Auto Launch</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Browser opens automatically</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>✍️</div>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>4. Take Exam</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Complete your examination</div>
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        background: '#ffebee', 
        borderRadius: '15px',
        borderLeft: '5px solid #f44336'
      }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>⚠️</span> Important Notes
        </h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>Install the browser <strong>before</strong> your exam day</li>
          <li>Test the installation by clicking a test link if provided</li>
          <li>Ensure you have a <strong>stable internet connection</strong></li>
          <li>Close all other applications before starting the exam</li>
          <li>The browser will run in <strong>full-screen lockdown mode</strong></li>
          <li>Do not attempt to exit the browser during the exam</li>
        </ul>
      </div>

      <div style={{ textAlign: 'center', marginTop: '50px', padding: '30px' }}>
        <h3>Need Help?</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Contact your exam administrator or visit our support page
        </p>
        <a 
          href="/" 
          style={{
            display: 'inline-block',
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
      </div>
    </div>
  );
}
