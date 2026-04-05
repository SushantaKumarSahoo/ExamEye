'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { formatDateTimeIST, getExamStatus, isExamEditable, canDeleteExam, canEndExam, canRemoveExam, getTimeUntilStart, getTimeRemaining } from '../../../../lib/examUtils';

export default function ExamDetails() {
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showReleaseResultsConfirm, setShowReleaseResultsConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchExamDetails(token);
  }, []);

  const fetchExamDetails = async (token) => {
    try {
      // Fetch exam details
      const examResponse = await fetch(`/api/exams/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (examResponse.ok) {
        const examData = await examResponse.json();
        setExam(examData.exam);
      }

      // Fetch submissions for this exam
      const submissionsResponse = await fetch(`/api/admin/exam/${params.id}/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        setSubmissions(submissionsData.submissions || []);
        
        // Extract and process flagged questions from submissions
        const allFlaggedQuestions = [];
        submissionsData.submissions?.forEach(submission => {
          if (submission.flaggedQuestions) {
            // Convert Map to Object if needed
            const flaggedQs = submission.flaggedQuestions instanceof Map 
              ? Object.fromEntries(submission.flaggedQuestions) 
              : submission.flaggedQuestions;
              
            Object.entries(flaggedQs).forEach(([questionIndex, flagData]) => {
              allFlaggedQuestions.push({
                questionIndex: parseInt(questionIndex),
                reason: flagData.reason,
                timestamp: flagData.timestamp,
                studentName: submission.studentName,
                studentEmail: submission.studentEmail
              });
            });
          }
        });
        
        setFlaggedQuestions(allFlaggedQuestions);
      }
    } catch (error) {
      console.error('Error fetching exam details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async () => {
    setActionLoading(true);
    setMessage('');

    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/admin/exams/${params.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Exam deleted successfully');
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      } else {
        setMessage(data.message || 'Failed to delete exam');
      }
    } catch (error) {
      setMessage('Error deleting exam');
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEndExam = async () => {
    setActionLoading(true);
    setMessage('');

    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/admin/exams/${params.id}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Exam ended successfully');
        // Refresh exam data
        const token = Cookies.get('token');
        fetchExamDetails(token);
      } else {
        setMessage(data.message || 'Failed to end exam');
      }
    } catch (error) {
      setMessage('Error ending exam');
    } finally {
      setActionLoading(false);
      setShowEndConfirm(false);
    }
  };

  const handleRemoveExam = async () => {
    setActionLoading(true);
    setMessage('');

    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/admin/exams/${params.id}/remove`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Exam removed completely');
        setTimeout(() => {
          router.push('/admin');
        }, 1500);
      } else {
        setMessage(data.message || 'Failed to remove exam');
      }
    } catch (error) {
      setMessage('Error removing exam');
    } finally {
      setActionLoading(false);
      setShowRemoveConfirm(false);
    }
  };

  const handleReleaseResults = async () => {
    setActionLoading(true);
    setMessage('');

    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/admin/exams/${params.id}/release-results`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Results released successfully! Emails sent to ${data.emailsSent} students.`);
        // Refresh exam data to show "Results Released" badge
        const token = Cookies.get('token');
        fetchExamDetails(token);
      } else {
        setMessage(data.message || 'Failed to release results');
      }
    } catch (error) {
      setMessage('Error releasing results');
    } finally {
      setActionLoading(false);
      setShowReleaseResultsConfirm(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading exam details...</div>;
  }

  if (!exam) {
    return (
      <div className="container" style={{ padding: '2rem 20px', textAlign: 'center' }}>
        <h2>Exam not found</h2>
        <Link href="/admin" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  const averageScore = submissions.length > 0 
    ? submissions.reduce((sum, sub) => sum + sub.percentage, 0) / submissions.length 
    : 0;

  const passRate = submissions.length > 0 
    ? (submissions.filter(sub => sub.percentage >= 50).length / submissions.length) * 100 
    : 0;

  return (
    <div className="admin-background">
      <header className="admin-header">
        <div className="container">
          <div className="header-content">
            <Link href="/admin" className="logo">ExamEye</Link>
            <nav className="nav-links">
              <Link href="/admin" className="nav-link">Dashboard</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: '2rem', color: '#6b7280', fontSize: '0.9rem' }}>
          <Link href="/admin" style={{ color: '#6b7280', textDecoration: 'none' }}>Dashboard</Link>
          <span style={{ margin: '0 0.5rem' }}>›</span>
          <span>Exam Details</span>
        </div>

        {/* Exam Header */}
        <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span>📋</span>
                {exam.title}
              </h1>
              <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '1rem' }}>{exam.description}</p>
              
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⏱️</span>
                  <span><strong>Duration:</strong> {exam.duration} minutes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🎯</span>
                  <span><strong>Total Marks:</strong> {exam.totalMarks}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>❓</span>
                  <span><strong>Questions:</strong> {exam.questions.length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📅</span>
                  <span><strong>Created:</strong> {new Date(exam.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Scheduling Information */}
              {exam.startTime && (
                <div style={{ 
                  padding: '1rem', 
                  background: '#f8fafc', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🕐</span>
                      <span><strong>Start Time:</strong> {formatDateTimeIST(exam.startTime)} IST</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🕕</span>
                      <span><strong>End Time:</strong> {formatDateTimeIST(exam.endTime)} IST</span>
                    </div>
                  </div>
                  
                  {(() => {
                    const currentStatus = getExamStatus(exam);
                    const timeUntilStart = getTimeUntilStart(exam);
                    const timeRemaining = getTimeRemaining(exam);
                    
                    return (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        {currentStatus === 'scheduled' && timeUntilStart && (
                          <div style={{ color: '#059669' }}>
                            ⏰ <strong>Starts in:</strong> {timeUntilStart}
                          </div>
                        )}
                        {currentStatus === 'active' && timeRemaining && (
                          <div style={{ color: '#dc2626' }}>
                            ⏱️ <strong>Time remaining:</strong> {timeRemaining}
                          </div>
                        )}
                        {currentStatus === 'ended' && (
                          <div style={{ color: '#6b7280' }}>
                            ✅ <strong>Exam completed</strong>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link 
                href={`/admin/exam/${exam._id}/questions`}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>📝</span>
                Manage Questions
              </Link>
              
              <Link 
                href={`/admin/exam/${exam._id}/credentials`}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>🔑</span>
                View Student Credentials
              </Link>
              
              {/* Action buttons based on exam status */}
              {isExamEditable(exam) && (
                <Link
                  href={`/admin/exam/${exam._id}/edit`}
                  className="btn btn-secondary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    textDecoration: 'none'
                  }}
                >
                  <span>✏️</span>
                  Edit Exam
                </Link>
              )}
              
              {canDeleteExam(exam) && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-secondary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    borderColor: '#dc2626',
                    color: '#dc2626'
                  }}
                  disabled={actionLoading}
                >
                  <span>🗑️</span>
                  Delete Exam
                </button>
              )}
              
              {canEndExam(exam) && (
                <button
                  onClick={() => setShowEndConfirm(true)}
                  className="btn btn-secondary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    borderColor: '#f59e0b',
                    color: '#f59e0b'
                  }}
                  disabled={actionLoading}
                >
                  <span>⏹️</span>
                  End Exam
                </button>
              )}
              
              {/* Release Results Button - Show only for ended exams with submissions */}
              {exam.status === 'ended' && submissions.length > 0 && !exam.resultsReleased && (
                <button
                  onClick={() => setShowReleaseResultsConfirm(true)}
                  className="btn btn-primary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none'
                  }}
                  disabled={actionLoading}
                >
                  <span>📊</span>
                  Release Results
                </button>
              )}
              
              {/* Results Released Badge */}
              {exam.resultsReleased && (
                <div style={{
                  padding: '0.5rem 1rem',
                  background: '#ecfdf5',
                  color: '#059669',
                  borderRadius: '8px',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  <span>✅</span>
                  Results Released
                </div>
              )}
              
              {canRemoveExam(exam) && (
                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  className="btn btn-secondary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    borderColor: '#dc2626',
                    color: '#dc2626',
                    background: 'transparent'
                  }}
                  disabled={actionLoading}
                >
                  <span>🗑️</span>
                  Remove Completely
                </button>
              )}
              
              <span className={`status-badge status-${getExamStatus(exam)}`}>
                {(() => {
                  const status = getExamStatus(exam);
                  return status === 'scheduled' ? 'Scheduled' : 
                         status === 'active' ? 'Active' : 'Ended';
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Total Submissions</span>
              <span style={{ fontSize: '1.25rem' }}>📝</span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937' }}>{submissions.length}</div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Average Score</span>
              <span style={{ fontSize: '1.25rem' }}>📊</span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937' }}>{averageScore.toFixed(1)}%</div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Pass Rate</span>
              <span style={{ fontSize: '1.25rem' }}>✅</span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937' }}>{passRate.toFixed(1)}%</div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Highest Score</span>
              <span style={{ fontSize: '1.25rem' }}>🏆</span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937' }}>
              {submissions.length > 0 ? Math.max(...submissions.map(s => s.percentage)).toFixed(1) : 0}%
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            Student Submissions ({submissions.length})
          </h3>

          {submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
              <h4 style={{ marginBottom: '0.5rem' }}>No submissions yet</h4>
              <p>Students haven't submitted this exam yet</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Student</th>
                    <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Score</th>
                    <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Percentage</th>
                    <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '1rem 0.5rem', fontWeight: '600', color: '#374151' }}>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: '500', color: '#1f2937' }}>
                        {submission.student}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: '#6b7280' }}>
                        {submission.studentEmail}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: '#6b7280' }}>
                        {submission.score} / {submission.totalMarks}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: '600', color: submission.percentage >= 50 ? '#059669' : '#dc2626' }}>
                        {submission.percentage.toFixed(1)}%
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          background: submission.percentage >= 50 ? '#ecfdf5' : '#fef2f2',
                          color: submission.percentage >= 50 ? '#059669' : '#dc2626'
                        }}>
                          {submission.percentage >= 50 ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: '#6b7280' }}>
                        {new Date(submission.submittedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Flagged Questions Section */}
        <div className="card" style={{ padding: '2rem', marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🚩</span>
            Flagged Questions ({flaggedQuestions.length})
          </h3>

          {flaggedQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h4 style={{ marginBottom: '0.5rem' }}>No flagged questions</h4>
              <p>Students haven't reported any issues with the questions</p>
            </div>
          ) : (
            <div>
              <div style={{ 
                marginBottom: '1.5rem', 
                padding: '1rem', 
                background: '#fef3c7', 
                borderRadius: '8px',
                border: '1px solid #fde68a'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span>⚠️</span>
                  <strong style={{ color: '#92400e' }}>Review Required</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>
                  Students have flagged {flaggedQuestions.length} question(s) for review. Please check these questions for accuracy and clarity.
                </p>
              </div>

              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Group flagged questions by question index */}
                {Object.entries(
                  flaggedQuestions.reduce((acc, flag) => {
                    if (!acc[flag.questionIndex]) {
                      acc[flag.questionIndex] = [];
                    }
                    acc[flag.questionIndex].push(flag);
                    return acc;
                  }, {})
                ).map(([questionIndex, flags]) => {
                  const questionNum = parseInt(questionIndex) + 1;
                  const question = exam?.questions?.[parseInt(questionIndex)];
                  
                  return (
                    <div key={questionIndex} style={{ 
                      border: '2px solid #dc2626', 
                      borderRadius: '12px', 
                      padding: '1.5rem',
                      background: '#fef2f2'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                        <span style={{ 
                          fontSize: '1.2rem', 
                          background: '#dc2626', 
                          color: 'white', 
                          padding: '0.5rem', 
                          borderRadius: '50%',
                          minWidth: '2.5rem',
                          textAlign: 'center',
                          fontWeight: '600'
                        }}>
                          {questionNum}
                        </span>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', color: '#dc2626', fontSize: '1.1rem' }}>
                            Question {questionNum} - {flags.length} student(s) flagged this
                          </h4>
                          {question && (
                            <div style={{ 
                              background: 'white', 
                              padding: '1rem', 
                              borderRadius: '8px',
                              marginBottom: '1rem',
                              border: '1px solid #fecaca'
                            }}>
                              <p style={{ margin: '0 0 1rem 0', fontWeight: '500', color: '#1f2937' }}>
                                {question.question}
                              </p>
                              <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {question.options?.map((option, idx) => (
                                  <div key={idx} style={{ 
                                    padding: '0.5rem', 
                                    background: question.correctAnswer === idx ? '#ecfdf5' : '#f9fafb',
                                    borderRadius: '4px',
                                    border: `1px solid ${question.correctAnswer === idx ? '#d1fae5' : '#e5e7eb'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                  }}>
                                    <span style={{ 
                                      fontWeight: '600',
                                      color: question.correctAnswer === idx ? '#059669' : '#6b7280'
                                    }}>
                                      {String.fromCharCode(65 + idx)})
                                    </span>
                                    <span style={{ 
                                      color: question.correctAnswer === idx ? '#059669' : '#374151'
                                    }}>
                                      {option}
                                    </span>
                                    {question.correctAnswer === idx && (
                                      <span style={{ marginLeft: 'auto', color: '#059669' }}>✓ Correct</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div style={{ display: 'grid', gap: '1rem' }}>
                            <h5 style={{ margin: 0, color: '#dc2626' }}>Student Reports:</h5>
                            {flags.map((flag, idx) => (
                              <div key={idx} style={{ 
                                background: 'white', 
                                padding: '1rem', 
                                borderRadius: '8px',
                                border: '1px solid #fecaca'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                  <div>
                                    <div style={{ fontWeight: '600', color: '#1f2937' }}>{flag.studentName}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{flag.studentEmail}</div>
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                    {new Date(flag.timestamp).toLocaleString()}
                                  </div>
                                </div>
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  background: '#fef2f2',
                                  borderRadius: '4px',
                                  border: '1px solid #fecaca'
                                }}>
                                  <span>🚩</span>
                                  <span style={{ fontWeight: '500', color: '#dc2626' }}>{flag.reason}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Questions Preview */}
        <div className="card" style={{ padding: '2rem', marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            Questions Preview ({exam.questions.length})
          </h3>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {exam.questions.map((question, index) => (
              <div key={index} style={{ 
                padding: '1.5rem', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                background: '#ffffff'
              }}>
                <h4 style={{ marginBottom: '1rem', color: '#1f2937' }}>
                  Question {index + 1} ({question.marks} mark{question.marks !== 1 ? 's' : ''})
                </h4>
                <p style={{ marginBottom: '1rem', fontSize: '1.05rem', lineHeight: '1.6' }}>
                  {question.question}
                </p>
                
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {question.options.map((option, optIndex) => (
                    <div key={optIndex} style={{
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      background: optIndex === question.correctAnswer ? '#ecfdf5' : '#f9fafb',
                      borderColor: optIndex === question.correctAnswer ? '#10b981' : '#e5e7eb'
                    }}>
                      <span style={{ 
                        fontWeight: optIndex === question.correctAnswer ? '600' : '400',
                        color: optIndex === question.correctAnswer ? '#059669' : '#374151'
                      }}>
                        {String.fromCharCode(65 + optIndex)}. {option}
                        {optIndex === question.correctAnswer && <span style={{ marginLeft: '0.5rem' }}>✓</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div style={{ 
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            background: message.includes('success') ? '#ecfdf5' : '#fef2f2',
            color: message.includes('success') ? '#059669' : '#dc2626',
            borderRadius: '8px',
            border: `1px solid ${message.includes('success') ? '#d1fae5' : '#fecaca'}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}>
            {message}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                <h3 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Delete Exam</h3>
                <p style={{ color: '#6b7280' }}>
                  Are you sure you want to delete "{exam.title}"? This action cannot be undone.
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteExam}
                  className="btn btn-primary"
                  style={{ background: '#dc2626', borderColor: '#dc2626' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deleting...' : 'Delete Exam'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* End Exam Confirmation Modal */}
        {showEndConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏹️</div>
                <h3 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>End Exam</h3>
                <p style={{ color: '#6b7280' }}>
                  Are you sure you want to end "{exam.title}"? Students will no longer be able to submit answers.
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="btn btn-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEndExam}
                  className="btn btn-primary"
                  style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Ending...' : 'End Exam'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗑️</div>
              <h3 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Remove Exam Completely</h3>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                Are you sure you want to <strong>PERMANENTLY REMOVE</strong> "{exam.title}"?
              </p>
              <div style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                borderRadius: '8px', 
                padding: '1rem',
                color: '#dc2626',
                fontSize: '0.9rem'
              }}>
                <strong>⚠️ This action will:</strong>
                <ul style={{ textAlign: 'left', marginTop: '0.5rem', paddingLeft: '1rem' }}>
                  <li>Delete the exam permanently</li>
                  <li>Remove all student submissions</li>
                  <li>Delete all temporary credentials</li>
                  <li>Cannot be undone</li>
                </ul>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="btn btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveExam}
                className="btn btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                disabled={actionLoading}
              >
                {actionLoading ? 'Removing...' : 'Remove Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Results Confirmation Modal */}
      {showReleaseResultsConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}>
            <div className="card" style={{ maxWidth: '500px', padding: '2.5rem', margin: '1rem' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📊</span>
                Release Results
              </h3>
              
              <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
                Are you sure you want to release the results for this exam?
              </p>
              
              <div style={{ 
                background: '#f0f9ff', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                border: '1px solid #bae6fd'
              }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#0369a1' }}>
                  <strong>📧 Email Notifications:</strong> Individual result emails will be sent to all {submissions.length} students who submitted the exam.
                </p>
              </div>
              
              <div style={{ 
                background: '#fef3c7', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                border: '1px solid #fde68a'
              }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>
                  <strong>⚠️ Note:</strong> This action cannot be undone. Results can only be released once.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setShowReleaseResultsConfirm(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReleaseResults}
                  className="btn btn-primary"
                  style={{ 
                    flex: 1, 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none'
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Releasing...' : 'Release Results'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
