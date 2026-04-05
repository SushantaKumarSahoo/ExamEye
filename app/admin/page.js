'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { formatDateTimeIST, getExamStatus, canDeleteExam, canEndExam, canRemoveExam, getTimeUntilStart, getTimeRemaining } from '../../lib/examUtils';

// Analytics Tab Component
function AnalyticsTab() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState('all');

  useEffect(() => {
    fetchAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/admin/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
        <h3>No Analytics Data</h3>
        <p style={{ color: '#6b7280' }}>Start monitoring exams to see analytics</p>
      </div>
    );
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'critical': return '#fee2e2';
      case 'high': return '#fef3c7';
      case 'medium': return '#dbeafe';
      case 'low': return '#d1fae5';
      default: return '#f3f4f6';
    }
  };

  const formatEventType = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const filteredEvents = selectedEventType === 'all' 
    ? analytics.recentEvents 
    : analytics.recentEvents.filter(e => e.type === selectedEventType);

  return (
    <div>
      {/* Overview Cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ 
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          border: '1px solid #bae6fd'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0369a1', marginBottom: '0.25rem' }}>
            {analytics.overview.totalActivities}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#0c4a6e', fontWeight: '500' }}>Total Sessions</div>
        </div>

        <div className="card" style={{ 
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          border: '1px solid #a7f3d0'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🟢</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669', marginBottom: '0.25rem' }}>
            {analytics.overview.activeNow}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#065f46', fontWeight: '500' }}>Active Now</div>
        </div>

        <div className="card" style={{ 
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '1px solid #fcd34d'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#d97706', marginBottom: '0.25rem' }}>
            {analytics.overview.suspiciousStudents}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '500' }}>Suspicious</div>
        </div>

        <div className="card" style={{ 
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
          border: '1px solid #fca5a5'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚨</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#dc2626', marginBottom: '0.25rem' }}>
            {analytics.overview.flaggedStudents}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#991b1b', fontWeight: '500' }}>Flagged</div>
        </div>

        <div className="card" style={{ 
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
          border: '1px solid #d8b4fe'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#9333ea', marginBottom: '0.25rem' }}>
            {analytics.overview.totalAlerts}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b21a8', fontWeight: '500' }}>Total Alerts</div>
        </div>
      </div>

      {/* System Checks Statistics */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔧</span> System Checks Overview
        </h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📷</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                {analytics.systemCheckStats.total > 0 
                  ? Math.round((analytics.systemCheckStats.cameraEnabled / analytics.systemCheckStats.total) * 100)
                  : 0}%
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Camera Enabled</div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              {analytics.systemCheckStats.cameraEnabled} / {analytics.systemCheckStats.total} students
            </div>
          </div>

          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎤</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                {analytics.systemCheckStats.total > 0 
                  ? Math.round((analytics.systemCheckStats.microphoneEnabled / analytics.systemCheckStats.total) * 100)
                  : 0}%
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Microphone Enabled</div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              {analytics.systemCheckStats.microphoneEnabled} / {analytics.systemCheckStats.total} students
            </div>
          </div>

          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⛶</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                {analytics.systemCheckStats.total > 0 
                  ? Math.round((analytics.systemCheckStats.fullscreenEnabled / analytics.systemCheckStats.total) * 100)
                  : 0}%
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Fullscreen Mode</div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              {analytics.systemCheckStats.fullscreenEnabled} / {analytics.systemCheckStats.total} students
            </div>
          </div>

          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🌐</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                {analytics.systemCheckStats.total > 0 
                  ? Math.round((analytics.systemCheckStats.networkConnected / analytics.systemCheckStats.total) * 100)
                  : 0}%
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>Network Connected</div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              {analytics.systemCheckStats.networkConnected} / {analytics.systemCheckStats.total} students
            </div>
          </div>
        </div>
      </div>

      {/* Event Distribution */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📊</span> Top Event Types
          </h3>
          {analytics.eventDistribution.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>No events yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analytics.eventDistribution.map((event, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
                    {formatEventType(event._id)}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1f2937', padding: '0.25rem 0.75rem', background: '#e5e7eb', borderRadius: '12px' }}>
                    {event.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚡</span> Severity Distribution
          </h3>
          {analytics.severityDistribution.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>No events yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analytics.severityDistribution.map((severity, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.75rem', 
                  background: getSeverityBg(severity._id), 
                  borderRadius: '6px',
                  border: `1px solid ${getSeverityColor(severity._id)}33`
                }}>
                  <span style={{ fontSize: '0.875rem', color: getSeverityColor(severity._id), fontWeight: '600', textTransform: 'uppercase' }}>
                    {severity._id}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '700', color: getSeverityColor(severity._id), padding: '0.25rem 0.75rem', background: 'white', borderRadius: '12px' }}>
                    {severity.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Flagged Students */}
      {analytics.topFlaggedStudents.length > 0 && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🚩</span> Top Flagged Students
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Student</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Exam</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Alerts</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: '600', color: '#374151', fontSize: '0.875rem' }}>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topFlaggedStudents.map((student, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>{student.studentName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{student.studentEmail}</div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>{student.examTitle}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        background: '#fee2e2', 
                        color: '#dc2626', 
                        borderRadius: '12px', 
                        fontSize: '0.875rem', 
                        fontWeight: '700' 
                      }}>
                        {student.alertCount}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        background: student.status === 'flagged' ? '#fee2e2' : student.status === 'suspicious' ? '#fef3c7' : '#d1fae5',
                        color: student.status === 'flagged' ? '#dc2626' : student.status === 'suspicious' ? '#d97706' : '#059669',
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {student.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {new Date(student.lastActivity).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent AI Events */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🤖</span> Recent AI Events & Logs
          </h3>
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.875rem',
              background: 'white'
            }}
          >
            <option value="all">All Events</option>
            {analytics.eventDistribution.map((event, index) => (
              <option key={index} value={event._id}>{formatEventType(event._id)}</option>
            ))}
          </select>
        </div>

        {filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p>No events to display</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '600px', overflowY: 'auto' }}>
            {filteredEvents.map((event, index) => (
              <div 
                key={index} 
                style={{ 
                  padding: '1rem', 
                  background: getSeverityBg(event.severity),
                  border: `1px solid ${getSeverityColor(event.severity)}33`,
                  borderRadius: '8px',
                  borderLeft: `4px solid ${getSeverityColor(event.severity)}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        color: getSeverityColor(event.severity),
                        textTransform: 'uppercase',
                        padding: '0.125rem 0.5rem',
                        background: 'white',
                        borderRadius: '4px'
                      }}>
                        {event.severity}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                        {formatEventType(event.type)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>
                      {event.description}
                    </div>
                    {event.details && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {event.details}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '150px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      {event.examTitle}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>👤</span>
                  <span>{event.studentEmail}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('manage');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Verify token and get user info
    fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        if (data.user.role !== 'admin') {
          router.push('/student');
          return;
        }
        setUser(data.user);
        fetchData(token);
      } else {
        router.push('/login');
      }
    })
    .catch(() => router.push('/login'));
  }, [router]);

  const fetchData = async (token) => {
    try {
      // Fetch exams
      const examResponse = await fetch('/api/exams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const examData = await examResponse.json();
      if (examResponse.ok) {
        setExams(examData.exams);
      }

      // Fetch submissions
      const submissionResponse = await fetch('/api/admin/submissions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const submissionData = await submissionResponse.json();
      if (submissionResponse.ok) {
        setSubmissions(submissionData.submissions || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateExamStatus = async (examId, status) => {
    const token = Cookies.get('token');
    try {
      const response = await fetch(`/api/admin/exams/${examId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchData(token);
      }
    } catch (error) {
      console.error('Error updating exam status:', error);
    }
  };

  const handleLogout = () => {
    Cookies.remove('token');
    router.push('/');
  };

  const handleRefresh = () => {
    const token = Cookies.get('token');
    if (token) {
      fetchData(token);
    }
  };

  const handleQuickDelete = async (examId, examTitle) => {
    if (!confirm(`Are you sure you want to delete "${examTitle}"? This action cannot be undone.`)) {
      return;
    }

    const token = Cookies.get('token');
    try {
      const response = await fetch(`/api/admin/exams/${examId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert('Exam deleted successfully');
        // Refresh exams list
        fetchData(token);
      } else {
        alert(data.message || 'Failed to delete exam');
      }
    } catch (error) {
      alert('Error deleting exam');
      console.error('Error deleting exam:', error);
    }
  };

  const handleQuickEnd = async (examId, examTitle) => {
    if (!confirm(`Are you sure you want to end "${examTitle}"? Students will no longer be able to submit answers.`)) {
      return;
    }

    const token = Cookies.get('token');
    try {
      const response = await fetch(`/api/admin/exams/${examId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert('Exam ended successfully');
        // Refresh exams list
        fetchData(token);
      } else {
        alert(data.message || 'Failed to end exam');
      }
    } catch (error) {
      alert('Error ending exam');
      console.error('Error ending exam:', error);
    }
  };

  const handleQuickRemove = async (examId, examTitle) => {
    if (!confirm(`Are you sure you want to PERMANENTLY REMOVE "${examTitle}"? This will delete the exam and ALL related data including submissions. This action cannot be undone.`)) {
      return;
    }

    const token = Cookies.get('token');
    try {
      const response = await fetch(`/api/admin/exams/${examId}/remove`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert('Exam removed completely');
        // Refresh exams list
        fetchData(token);
      } else {
        alert(data.message || 'Failed to remove exam');
      }
    } catch (error) {
      alert('Error removing exam');
      console.error('Error removing exam:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Calculate statistics
  const totalExams = exams.length;
  const activeExams = exams.filter(exam => exam.status === 'active').length;
  const totalSubmissions = submissions.length;
  const publishedExams = exams.filter(exam => exam.status === 'ended').length;

  // Filter exams based on search and status
  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || exam.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
            <Link href="/admin" style={{ 
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.5rem 1rem', 
                background: 'rgba(16, 185, 129, 0.2)', 
                color: 'white', 
                borderRadius: '20px', 
                fontSize: '0.875rem',
                fontWeight: '500',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
                Live
              </span>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>Welcome, {user?.username}</span>
            </div>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link href="/admin/subscription" className="btn" style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'all 0.3s',
                fontSize: '0.9rem'
              }}>
                💳 Subscription
              </Link>
              <Link href="/admin/create-exam" className="btn" style={{
                background: 'white',
                color: '#1f2937',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'all 0.3s',
                fontSize: '0.9rem'
              }}>
                ➕ Create Exam
              </Link>
              <button onClick={handleLogout} className="btn" style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '0.9rem'
              }}>
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        {/* Page Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
            Manage exams, monitor submissions, and track performance
          </p>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveTab('manage')}
            style={{
              padding: '1rem 0',
              background: 'none',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '500',
              color: activeTab === 'manage' ? '#000000' : '#6b7280',
              borderBottom: activeTab === 'manage' ? '2px solid #000000' : 'none',
              cursor: 'pointer'
            }}
          >
            Manage Exams
          </button>
          <button
            onClick={() => setActiveTab('results')}
            style={{
              padding: '1rem 0',
              background: 'none',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '500',
              color: activeTab === 'results' ? '#000000' : '#6b7280',
              borderBottom: activeTab === 'results' ? '2px solid #000000' : 'none',
              cursor: 'pointer'
            }}
          >
            Results
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '1rem 0',
              background: 'none',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '500',
              color: activeTab === 'analytics' ? '#000000' : '#6b7280',
              borderBottom: activeTab === 'analytics' ? '2px solid #000000' : 'none',
              cursor: 'pointer'
            }}
          >
            Analytics
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ 
            padding: '2rem',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #bae6fd',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '';
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', textAlign: 'center' }}>📚</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#0369a1', textAlign: 'center', marginBottom: '0.5rem' }}>{totalExams}</div>
            <div style={{ fontSize: '0.95rem', color: '#0c4a6e', fontWeight: '600', textAlign: 'center' }}>Total Exams</div>
          </div>

          <div className="card" style={{ 
            padding: '2rem',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '1px solid #a7f3d0',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '';
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', textAlign: 'center' }}>▶️</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#059669', textAlign: 'center', marginBottom: '0.5rem' }}>{activeExams}</div>
            <div style={{ fontSize: '0.95rem', color: '#065f46', fontWeight: '600', textAlign: 'center' }}>Active Exams</div>
          </div>

          <div className="card" style={{ 
            padding: '2rem',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1px solid #fcd34d',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '';
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', textAlign: 'center' }}>✅</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#d97706', textAlign: 'center', marginBottom: '0.5rem' }}>{totalSubmissions}</div>
            <div style={{ fontSize: '0.95rem', color: '#92400e', fontWeight: '600', textAlign: 'center' }}>Total Submissions</div>
          </div>

          <div className="card" style={{ 
            padding: '2rem',
            background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
            border: '1px solid #d8b4fe',
            transition: 'transform 0.3s, box-shadow 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '';
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', textAlign: 'center' }}>📅</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#9333ea', textAlign: 'center', marginBottom: '0.5rem' }}>{publishedExams}</div>
            <div style={{ fontSize: '0.95rem', color: '#6b21a8', fontWeight: '600', textAlign: 'center' }}>Published Exams</div>
          </div>
        </div>

        {/* Manage Exams Section */}
        {activeTab === 'manage' && (
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Manage Exams</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>View, edit, and manage all exams in the system</p>
              <div style={{ float: 'right', marginTop: '-2.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                {filteredExams.length} of {totalExams} exams
              </div>
            </div>

            {/* Search and Filter */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search exams by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '300px',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  minWidth: '150px'
                }}
              >
                <option value="all">All Exams</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </select>
            </div>

            {/* Exams Table */}
            {filteredExams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                <h4 style={{ marginBottom: '0.5rem' }}>No exams created yet</h4>
                <p>Click "Create Exam" to get started</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Title</th>
                      <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Duration</th>
                      <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Start Time</th>
                      <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>End Time</th>
                      <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Submissions</th>
                      <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Questions</th>
                      <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExams.map((exam) => {
                      const examSubmissions = submissions.filter(sub => sub.exam === exam._id).length;
                      const currentStatus = getExamStatus(exam);
                      const timeUntilStart = getTimeUntilStart(exam);
                      const timeRemaining = getTimeRemaining(exam);
                      
                      return (
                        <tr key={exam._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            <div>
                              <div style={{ fontWeight: '500', color: '#1f2937' }}>{exam.title}</div>
                              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{exam.description}</div>
                              {timeUntilStart && (
                                <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                                  ⏰ Starts in: {timeUntilStart}
                                </div>
                              )}
                              {timeRemaining && currentStatus === 'active' && (
                                <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>
                                  ⏱️ Time left: {timeRemaining}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '1rem 0.5rem', color: '#6b7280' }}>{exam.duration} min</td>
                          <td style={{ padding: '1rem 0.5rem', color: '#6b7280' }}>
                            {exam.startTime ? formatDateTimeIST(exam.startTime) : '-'}
                          </td>
                          <td style={{ padding: '1rem 0.5rem', color: '#6b7280' }}>
                            {exam.endTime ? formatDateTimeIST(exam.endTime) : '-'}
                          </td>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            <span className={`status-badge status-${currentStatus}`}>
                              {currentStatus === 'scheduled' ? 'Scheduled' : 
                               currentStatus === 'active' ? 'Active' : 'Ended'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 0.5rem', color: '#6b7280' }}>{examSubmissions}</td>
                          <td style={{ padding: '1rem 0.5rem', color: '#6b7280' }}>{exam.questions.length}</td>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {currentStatus === 'active' && (
                                <Link 
                                  href={`/admin/live-monitor/${exam._id}`}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                >
                                  <span>📹</span> Live Monitor
                                </Link>
                              )}
                              {canDeleteExam(exam) && (
                                <button 
                                  onClick={() => handleQuickDelete(exam._id, exam.title)}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    background: 'transparent',
                                    color: '#dc2626',
                                    border: '1px solid #dc2626',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                              {canEndExam(exam) && (
                                <button 
                                  onClick={() => handleQuickEnd(exam._id, exam.title)}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    background: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  End
                                </button>
                              )}
                              {canRemoveExam(exam) && (
                                <button 
                                  onClick={() => handleQuickRemove(exam._id, exam.title)}
                                  style={{
                                    padding: '0.375rem 0.75rem',
                                    background: 'transparent',
                                    color: '#dc2626',
                                    border: '1px solid #dc2626',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Remove
                                </button>
                              )}
                              <Link 
                                href={`/admin/exam/${exam._id}`}
                                style={{
                                  padding: '0.375rem 0.75rem',
                                  background: '#6b7280',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  textDecoration: 'none'
                                }}
                              >
                                View
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Exam Results</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>View all student submissions and scores</p>
              <div style={{ float: 'right', marginTop: '-2.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                {submissions.length} total submissions
              </div>
            </div>

            {/* Results Table */}
            {submissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                <h4 style={{ marginBottom: '0.5rem' }}>No submissions yet</h4>
                <p>Results will appear here once students complete exams</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Student</th>
                      <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Exam</th>
                      <th style={{ textAlign: 'center', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Score</th>
                      <th style={{ textAlign: 'center', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Percentage</th>
                      <th style={{ textAlign: 'center', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Duration</th>
                      <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Submitted At</th>
                      <th style={{ textAlign: 'center', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => {
                      const exam = exams.find(e => e._id === submission.exam);
                      const percentage = submission.percentage || 0;
                      const duration = submission.duration ? Math.round(submission.duration / 60) : 0;
                      
                      // Determine grade color
                      let gradeColor = '#6b7280';
                      let gradeBg = '#f3f4f6';
                      if (percentage >= 90) {
                        gradeColor = '#059669';
                        gradeBg = '#d1fae5';
                      } else if (percentage >= 75) {
                        gradeColor = '#3b82f6';
                        gradeBg = '#dbeafe';
                      } else if (percentage >= 60) {
                        gradeColor = '#f59e0b';
                        gradeBg = '#fef3c7';
                      } else if (percentage >= 40) {
                        gradeColor = '#f97316';
                        gradeBg = '#ffedd5';
                      } else {
                        gradeColor = '#dc2626';
                        gradeBg = '#fee2e2';
                      }
                      
                      return (
                        <tr key={submission._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            <div>
                              <div style={{ fontWeight: '500', color: '#1f2937' }}>
                                {submission.studentEmail}
                              </div>
                              {submission.tempStudent && (
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                  Temp Student
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            <div style={{ fontWeight: '500', color: '#1f2937' }}>
                              {exam?.title || 'Unknown Exam'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {exam?.questions?.length || 0} questions
                            </div>
                          </td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                            <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '1.1rem' }}>
                              {submission.obtainedMarks || 0} / {submission.totalMarks || 0}
                            </div>
                          </td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.375rem 0.75rem',
                              background: gradeBg,
                              color: gradeColor,
                              borderRadius: '12px',
                              fontSize: '0.875rem',
                              fontWeight: '700'
                            }}>
                              {percentage.toFixed(1)}%
                            </span>
                          </td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#6b7280' }}>
                            {duration} min
                          </td>
                          <td style={{ padding: '1rem 0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                            {submission.endTime ? new Date(submission.endTime).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            }) : '-'}
                          </td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              background: submission.isCompleted ? '#d1fae5' : '#fef3c7',
                              color: submission.isCompleted ? '#059669' : '#d97706',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}>
                              {submission.isCompleted ? 'Completed' : 'In Progress'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary Statistics */}
            {submissions.length > 0 && (
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f9fafb', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                  Summary Statistics
                </h4>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
                      {submissions.filter(s => s.isCompleted).length}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Completed
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
                      {submissions.filter(s => !s.isCompleted).length}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      In Progress
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                      {submissions.length > 0 
                        ? (submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / submissions.length).toFixed(1)
                        : 0}%
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Average Score
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                      {submissions.length > 0 
                        ? Math.max(...submissions.map(s => s.percentage || 0)).toFixed(1)
                        : 0}%
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Highest Score
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#9333ea' }}>
                      {submissions.length > 0 
                        ? Math.min(...submissions.map(s => s.percentage || 0)).toFixed(1)
                        : 0}%
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Lowest Score
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}
      </main>
    </div>
  );
}
