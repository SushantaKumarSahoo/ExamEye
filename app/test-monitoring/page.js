'use client';

import { useState, useEffect } from 'react';
import CameraMonitoring from '../../components/CameraMonitoring';

export default function TestMonitoringPage() {
  const [examId, setExamId] = useState('');
  const [token, setToken] = useState('');
  const [monitoring, setMonitoring] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Get token from localStorage
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const startMonitoring = async () => {
    if (!examId) {
      alert('Please enter Exam ID');
      return;
    }

    if (!token) {
      alert('Please login first');
      return;
    }

    try {
      // Start activity tracking
      const response = await fetch('/api/student/activity/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          examId,
          systemChecks: {
            camera: true,
            microphone: false,
            network: true,
            fullscreen: false,
            secureBrowser: false
          },
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent
        })
      });

      if (response.ok) {
        setMonitoring(true);
        addLog('✅ Monitoring started successfully');
        
        // Setup event listeners
        setupEventListeners();
      } else {
        const data = await response.json();
        alert('Failed to start monitoring: ' + data.message);
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
      alert('Error starting monitoring');
    }
  };

  const setupEventListeners = () => {
    // Tab visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        logEvent('tab_switch', 'Tab switch detected', 'Student switched to another tab', 'high');
        addLog('🚨 Tab switch detected');
      }
    });

    // Window blur
    window.addEventListener('blur', () => {
      logEvent('window_blur', 'Window lost focus', 'Student may have switched windows', 'medium');
      addLog('⚠️ Window blur detected');
    });

    // Copy event
    document.addEventListener('copy', () => {
      logEvent('copy_paste_detected', 'Copy action detected', 'Student copied text', 'medium');
      addLog('📋 Copy detected');
    });

    // Paste event
    document.addEventListener('paste', () => {
      logEvent('copy_paste_detected', 'Paste action detected', 'Student pasted content', 'high');
      addLog('📋 Paste detected');
    });

    // Right click
    document.addEventListener('contextmenu', (e) => {
      logEvent('right_click_detected', 'Right click detected', `Target: ${e.target.tagName}`, 'low');
      addLog('🖱️ Right click detected');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (['c', 'v', 'x', 'a', 'f', 'p'].includes(key)) {
          logEvent('keyboard_shortcut', `Keyboard shortcut: Ctrl+${key.toUpperCase()}`, '', 'medium');
          addLog(`⌨️ Keyboard shortcut: Ctrl+${key.toUpperCase()}`);
        }
      }
    });
  };

  const logEvent = async (type, description, details, severity) => {
    try {
      await fetch('/api/student/activity/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          examId,
          type,
          description,
          details,
          severity
        })
      });
    } catch (error) {
      console.error('Error logging event:', error);
    }
  };

  const addLog = (message) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message }]);
  };

  const stopMonitoring = async () => {
    try {
      await fetch('/api/student/activity/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          examId,
          type: 'exam_completed',
          description: 'Test monitoring stopped',
          details: 'Manual stop',
          severity: 'low'
        })
      });
      
      setMonitoring(false);
      addLog('🛑 Monitoring stopped');
    } catch (error) {
      console.error('Error stopping monitoring:', error);
    }
  };

  const triggerTestEvent = async (type) => {
    const events = {
      tab_switch: { desc: 'Tab switch detected', details: 'Test event', severity: 'high' },
      face_not_detected: { desc: 'Face not detected', details: 'Test event', severity: 'medium' },
      multiple_faces: { desc: 'Multiple faces detected', details: 'Count: 2 faces', severity: 'high' },
      copy_paste: { desc: 'Copy/paste detected', details: 'Test event', severity: 'high' },
      suspicious_behavior: { desc: 'Suspicious behavior', details: 'Test event', severity: 'medium' }
    };

    const event = events[type];
    if (event) {
      await logEvent(type, event.desc, event.details, event.severity);
      addLog(`🧪 Test event: ${event.desc}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            🧪 Test Monitoring System
          </h1>
          <p style={{ color: '#6b7280' }}>
            Test the AI monitoring and logging system without the secure browser
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Left Column - Setup */}
          <div>
            {/* Setup Card */}
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                Setup
              </h2>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Exam ID
                </label>
                <input
                  type="text"
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  placeholder="Enter exam ID from database"
                  disabled={monitoring}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Token Status
                </label>
                <div style={{
                  padding: '0.75rem',
                  background: token ? '#d1fae5' : '#fee2e2',
                  color: token ? '#065f46' : '#991b1b',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}>
                  {token ? '✅ Logged in' : '❌ Not logged in - Please login first'}
                </div>
              </div>

              {!monitoring ? (
                <button
                  onClick={startMonitoring}
                  disabled={!token || !examId}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: (!token || !examId) ? '#d1d5db' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: (!token || !examId) ? 'not-allowed' : 'pointer'
                  }}
                >
                  🚀 Start Monitoring
                </button>
              ) : (
                <button
                  onClick={stopMonitoring}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🛑 Stop Monitoring
                </button>
              )}
            </div>

            {/* Test Actions Card */}
            {monitoring && (
              <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                  Test Actions
                </h2>
                
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                    Automatic Detection (Try these):
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                    <li style={{ marginBottom: '0.5rem' }}>• Switch to another tab (Alt+Tab)</li>
                    <li style={{ marginBottom: '0.5rem' }}>• Click outside this window</li>
                    <li style={{ marginBottom: '0.5rem' }}>• Copy text (Ctrl+C)</li>
                    <li style={{ marginBottom: '0.5rem' }}>• Paste text (Ctrl+V)</li>
                    <li style={{ marginBottom: '0.5rem' }}>• Right-click anywhere</li>
                    <li style={{ marginBottom: '0.5rem' }}>• Press Ctrl+F, Ctrl+A, etc.</li>
                  </ul>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                    Manual Test Events:
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button onClick={() => triggerTestEvent('tab_switch')} style={{ padding: '0.5rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '4px', cursor: 'pointer' }}>
                      🚨 Tab Switch (HIGH)
                    </button>
                    <button onClick={() => triggerTestEvent('face_not_detected')} style={{ padding: '0.5rem', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '4px', cursor: 'pointer' }}>
                      👤 Face Not Detected (MEDIUM)
                    </button>
                    <button onClick={() => triggerTestEvent('multiple_faces')} style={{ padding: '0.5rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer' }}>
                      👥 Multiple Faces (HIGH)
                    </button>
                    <button onClick={() => triggerTestEvent('copy_paste')} style={{ padding: '0.5rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '4px', cursor: 'pointer' }}>
                      📋 Copy/Paste (HIGH)
                    </button>
                    <button onClick={() => triggerTestEvent('suspicious_behavior')} style={{ padding: '0.5rem', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '4px', cursor: 'pointer' }}>
                      ⚠️ Suspicious Behavior (MEDIUM)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Logs */}
          <div>
            {/* Activity Log Card */}
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                Activity Log
              </h2>
              
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                background: '#f9fafb',
                padding: '1rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontFamily: 'monospace'
              }}>
                {logs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                    No events yet. Start monitoring to see logs.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} style={{ marginBottom: '0.5rem', color: '#374151' }}>
                      <span style={{ color: '#6b7280' }}>[{log.time}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Instructions Card */}
            <div style={{ background: '#e0f2fe', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#0c4a6e' }}>
                📖 How to Check Logs
              </h3>
              <ol style={{ margin: 0, paddingLeft: '1.5rem', color: '#0c4a6e', fontSize: '0.875rem', lineHeight: '1.8' }}>
                <li>Start monitoring with a valid exam ID</li>
                <li>Trigger events (automatic or manual)</li>
                <li>Open Admin Dashboard → Analytics tab</li>
                <li>Or go to Live Monitor → Select student</li>
                <li>See all events in real-time!</li>
              </ol>
              
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'white', borderRadius: '4px' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Quick Links:</div>
                <a href="/admin" target="_blank" style={{ display: 'block', color: '#0284c7', marginBottom: '0.25rem' }}>
                  → Admin Dashboard
                </a>
                <a href={`/admin/live-monitor/${examId}`} target="_blank" style={{ display: 'block', color: '#0284c7' }}>
                  → Live Monitor
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Camera Monitoring */}
        {monitoring && (
          <CameraMonitoring examId={examId} enabled={true} />
        )}
      </div>
    </div>
  );
}
