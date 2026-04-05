'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import StudentCameraView from '../../../../components/StudentCameraView';
import WebRTCStudentView from '../../../../components/WebRTCStudentView';

export default function LiveMonitorPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId;
  
  const [exam, setExam] = useState(null);
  const [activeStudents, setActiveStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentLogs, setStudentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('webrtc'); // 'webrtc' or 'screenshot'

  useEffect(() => {
    fetchExamDetails();
    fetchActiveStudents();
    
    const interval = setInterval(() => {
      fetchActiveStudents();
      if (selectedStudent) {
        fetchStudentLogs(selectedStudent._id);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [examId]);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentLogs(selectedStudent._id);
    }
  }, [selectedStudent]);

  const fetchExamDetails = async () => {
    try {
      const token = Cookies.get('token');
      console.log('🔍 [Live Monitor] Fetching exam details...');
      console.log('📋 Exam ID:', examId);
      console.log('🔑 Token exists:', !!token);
      console.log('🔑 Token value:', token);
      
      if (!token || token === 'null' || token === 'undefined') {
        console.error('❌ No valid token found - redirecting to login');
        setError('Please log in to access this page');
        setTimeout(() => {
          router.push('/admin/login');
        }, 2000);
        return;
      }
      
      console.log('🔑 Token preview:', token.substring(0, 20) + '...');
      
      const response = await fetch(`/api/admin/exams/${examId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Exam data received:', data);
        setExam(data.exam);
      } else {
        const errorData = await response.json();
        console.error('❌ Exam fetch failed:', errorData);
        setError(errorData.message || 'Failed to fetch exam');
        
        if (response.status === 401) {
          console.error('❌ Unauthorized - redirecting to login');
          setTimeout(() => {
            router.push('/admin/login');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching exam:', error);
      setError('Network error fetching exam');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveStudents = async () => {
    try {
      const token = Cookies.get('token');
      console.log('🔍 [Live Monitor] Fetching active students...');
      console.log('📋 Exam ID:', examId);
      console.log('🔑 Token exists:', !!token);
      
      if (!token || token === 'null' || token === 'undefined') {
        console.error('❌ No valid token found');
        setError('Please log in to access this page');
        return;
      }
      
      const response = await fetch(`/api/admin/live-monitor/${examId}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('📡 Students API response status:', response.status);
      console.log('📡 Students API response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Students data received:', data);
        console.log('👥 Number of students:', data.students?.length || 0);
        setActiveStudents(data.students || []);
        setError(null);
      } else {
        const errorData = await response.json();
        console.error('❌ Students fetch failed:', errorData);
        setError(errorData.message);
        
        if (response.status === 401) {
          console.error('❌ Unauthorized - token may be invalid');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      setError('Network error');
    }
  };

  const fetchStudentLogs = async (studentId) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/admin/live-monitor/${examId}/student/${studentId}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStudentLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .student-card {
          padding: 1rem;
          cursor: pointer;
          border-left: 4px solid transparent;
          transition: all 0.2s;
        }
        .student-card:hover {
          background: #f9fafb;
        }
        .student-card.selected {
          background: #eff6ff;
          border-left-color: #3b82f6;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 0.5rem;
        }
        .status-active { background: #10b981; }
        .status-suspicious { background: #f59e0b; }
        .status-flagged { background: #ef4444; }
      `}</style>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Live Exam Monitor</h1>
            <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>{exam?.title}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#dcfce7', padding: '0.5rem 1rem', borderRadius: '9999px' }}>
              <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
              <span style={{ fontSize: '0.875rem', color: '#166534', fontWeight: '500' }}>Live</span>
            </div>
            <button
              onClick={() => router.push('/admin')}
              style={{ background: '#374151', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: '500' }}
            >
              ← Back to Admin
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ maxWidth: '1400px', margin: '1rem auto', padding: '0 2rem' }}>
          <div style={{ background: '#fee2e2', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: '0.5rem' }}>
            <p style={{ color: '#991b1b', margin: 0 }}>Error: {error}</p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        {/* Students List */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ background: '#3b82f6', color: 'white', padding: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Active Students</h2>
            <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0 0', opacity: 0.9 }}>{activeStudents.length} online</p>
          </div>
          
          <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            {activeStudents.length > 0 ? (
              activeStudents.map((student) => (
                <div
                  key={student._id}
                  onClick={() => setSelectedStudent(student)}
                  className={`student-card ${selectedStudent?._id === student._id ? 'selected' : ''}`}
                  style={{ borderBottom: '1px solid #e5e7eb' }}
                >
                  <h3 style={{ fontWeight: '600', margin: '0 0 0.25rem 0', fontSize: '0.95rem' }}>{student.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>{student.email}</p>
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
                    <span className={`status-dot status-${student.status}`}></span>
                    <span style={{ textTransform: 'capitalize' }}>{student.status}</span>
                    {student.alertCount > 0 && (
                      <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {student.alertCount}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                <p style={{ color: '#6b7280', fontWeight: '500' }}>No active students</p>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                  Students will appear when they join
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div>
          {selectedStudent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Student Info */}
              <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{selectedStudent.name}</h2>
                    <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>{selectedStudent.email}</p>
                  </div>
                  <span style={{ 
                    padding: '0.5rem 1rem', 
                    borderRadius: '9999px', 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    background: selectedStudent.status === 'active' ? '#dcfce7' : selectedStudent.status === 'suspicious' ? '#fef3c7' : '#fee2e2',
                    color: selectedStudent.status === 'active' ? '#166534' : selectedStudent.status === 'suspicious' ? '#92400e' : '#991b1b'
                  }}>
                    {selectedStudent.status?.toUpperCase()}
                  </span>
                </div>

                {/* System Checks */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  {[
                    { icon: '📹', label: 'Camera', key: 'camera' },
                    { icon: '🎤', label: 'Microphone', key: 'microphone' },
                    { icon: '🌐', label: 'Network', key: 'network' },
                    { icon: '🖥️', label: 'Screen', key: 'fullscreen' }
                  ].map(check => (
                    <div key={check.key} style={{ 
                      textAlign: 'center', 
                      padding: '1rem', 
                      borderRadius: '0.5rem',
                      background: selectedStudent.checks?.[check.key] ? '#f0fdf4' : '#fef2f2',
                      border: `2px solid ${selectedStudent.checks?.[check.key] ? '#86efac' : '#fecaca'}`
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{check.icon}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{check.label}</div>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: 'bold',
                        color: selectedStudent.checks?.[check.key] ? '#166534' : '#991b1b'
                      }}>
                        {selectedStudent.checks?.[check.key] ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Camera Feed with Mode Toggle */}
              <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>📸 Live Camera Feed</h3>
                  
                  {/* Toggle Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', background: '#f3f4f6', padding: '0.25rem', borderRadius: '0.5rem' }}>
                    <button
                      onClick={() => setViewMode('webrtc')}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.875rem',
                        background: viewMode === 'webrtc' ? '#3b82f6' : 'transparent',
                        color: viewMode === 'webrtc' ? 'white' : '#6b7280',
                        transition: 'all 0.2s'
                      }}
                    >
                      🎥 WebRTC (Live)
                    </button>
                    <button
                      onClick={() => setViewMode('screenshot')}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.875rem',
                        background: viewMode === 'screenshot' ? '#3b82f6' : 'transparent',
                        color: viewMode === 'screenshot' ? 'white' : '#6b7280',
                        transition: 'all 0.2s'
                      }}
                    >
                      📷 Screenshot
                    </button>
                  </div>
                </div>
                
                {/* Conditional Rendering */}
                {viewMode === 'webrtc' ? (
                  <WebRTCStudentView
                    key={`webrtc-${selectedStudent._id}`}
                    examId={examId}
                    studentId={selectedStudent._id}
                    studentName={selectedStudent.name}
                    studentEmail={selectedStudent.email}
                  />
                ) : (
                  <StudentCameraView
                    key={`screenshot-${selectedStudent._id}`}
                    examId={examId}
                    studentId={selectedStudent._id}
                    studentName={selectedStudent.name}
                    studentEmail={selectedStudent.email}
                  />
                )}
                
                <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem' }}>
                  {viewMode === 'webrtc' 
                    ? 'Real-time video stream via WebRTC' 
                    : 'Updates every 2 seconds • Stored in memory only'
                  }
                </p>
              </div>

              {/* Activity Logs */}
              <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ background: '#8b5cf6', color: 'white', padding: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>📊 Activity Logs & AI Alerts</h3>
                </div>
                <div style={{ padding: '1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                  {studentLogs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {studentLogs.map((log, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            borderLeft: '4px solid',
                            borderLeftColor: log.severity === 'high' ? '#ef4444' : log.severity === 'medium' ? '#f59e0b' : '#3b82f6',
                            background: log.severity === 'high' ? '#fef2f2' : log.severity === 'medium' ? '#fffbeb' : '#eff6ff'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                <span style={{
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  background: log.severity === 'high' ? '#fee2e2' : log.severity === 'medium' ? '#fef3c7' : '#dbeafe',
                                  color: log.severity === 'high' ? '#991b1b' : log.severity === 'medium' ? '#92400e' : '#1e40af'
                                }}>
                                  {log.severity?.toUpperCase()}
                                </span>
                                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{log.type}</span>
                              </div>
                              <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0.25rem 0' }}>{log.description}</p>
                              {log.details && (
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>{log.details}</p>
                              )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</div>
                      <p style={{ color: '#6b7280', fontWeight: '500' }}>No activity logs yet</p>
                      <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                        Logs will appear as the student takes the exam
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '4rem', textAlign: 'center' }}>
              <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>👥</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Select a Student</h3>
              <p style={{ color: '#6b7280' }}>Choose a student from the list to monitor their exam session</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
