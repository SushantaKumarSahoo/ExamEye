'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import RichTextEditor from '../../../components/RichTextEditor';

export default function CreateExam() {
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    duration: 60,
    totalMarks: 0,
    startTime: '',
    endTime: '',
    instructions: {
      enabled: true,
      title: 'Exam Instructions',
      content: `<p>Please read the following instructions carefully before starting the exam:</p>

<ol>
<li><strong>Time Limit</strong>: You have the allocated time to complete this exam. The timer will be visible at the top of your screen.</li>

<li><strong>Navigation</strong>: You can navigate between questions using the Next/Previous buttons or by clicking on question numbers in the navigation grid.</li>

<li><strong>Answering Questions</strong>: Click on your chosen answer for each question. You can change your answers at any time before submission.</li>

<li><strong>Flagging Questions</strong>: If you find any issues with a question, you can flag it for review using the flag buttons.</li>

<li><strong>Auto-Save</strong>: Your answers are automatically saved as you progress through the exam.</li>

<li><strong>Submission</strong>: Once you complete all questions, click the "Submit Exam" button. You can also submit a partially completed exam.</li>

<li><strong>Technical Issues</strong>: If you experience any technical difficulties, contact your exam administrator immediately.</li>

<li><strong>Academic Integrity</strong>: This exam is monitored for security. Any attempt to cheat or access unauthorized materials will result in disqualification.</li>
</ol>

<p><strong>Good luck with your exam!</strong></p>`,
      acknowledgmentText: 'I have read and understood the exam instructions and agree to follow all exam rules and regulations.',
      requireAcknowledgment: true
    }
  });
  const [questions, setQuestions] = useState([]);
  const [studentEmails, setStudentEmails] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentUploadMethod, setStudentUploadMethod] = useState('manual'); // 'manual' or 'excel'
  const [subscriptionCheck, setSubscriptionCheck] = useState({ loading: true, allowed: false, message: '', data: null });
  const router = useRouter();

  // Check subscription status on page load
  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      // Fetch subscription data
      const response = await fetch('/api/admin/subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        setSubscriptionCheck({
          loading: false,
          allowed: false,
          message: 'Failed to check subscription status',
          data: null
        });
        return;
      }

      const data = await response.json();
      const company = data.company;

      // Check if subscription is expired
      if (company.isTrialExpired || company.subscriptionStatus === 'expired' || company.subscriptionStatus === 'cancelled') {
        setSubscriptionCheck({
          loading: false,
          allowed: false,
          message: company.isTrialExpired 
            ? 'Your free trial has expired. Please upgrade to continue using ExamEye.'
            : 'Your subscription has expired. Please renew to continue using ExamEye.',
          subscriptionExpired: true,
          data: company
        });
        return;
      }

      // Fetch current exam count
      const examsResponse = await fetch('/api/exams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (examsResponse.ok) {
        const examsData = await examsResponse.json();
        const examCount = examsData.exams?.length || 0;

        // Check if exam limit reached
        if (examCount >= company.maxExams) {
          setSubscriptionCheck({
            loading: false,
            allowed: false,
            message: `You have reached your exam limit (${company.maxExams} exams). Please upgrade your plan to create more exams.`,
            limitReached: true,
            currentCount: examCount,
            limit: company.maxExams,
            data: company
          });
          return;
        }

        // All checks passed
        setSubscriptionCheck({
          loading: false,
          allowed: true,
          currentCount: examCount,
          limit: company.maxExams,
          remaining: company.maxExams - examCount,
          data: company
        });
      } else {
        // If we can't fetch exams, allow but show warning
        setSubscriptionCheck({
          loading: false,
          allowed: true,
          data: company
        });
      }

    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionCheck({
        loading: false,
        allowed: false,
        message: 'Error checking subscription status. Please try again.',
        data: null
      });
    }
  };

  const handleExamDataChange = (e) => {
    setExamData({
      ...examData,
      [e.target.name]: e.target.value
    });
  };

  const handleInstructionChange = (field, value) => {
    setExamData({
      ...examData,
      instructions: {
        ...examData.instructions,
        [field]: value
      }
    });
  };

  const handleQuestionsExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const token = Cookies.get('token');
    try {
      const response = await fetch('/api/admin/upload-questions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setQuestions(data.questions);
        setError('');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error uploading questions file');
    }
  };

  const handleStudentEmailsUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const token = Cookies.get('token');
    try {
      const response = await fetch('/api/admin/upload-student-emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setStudentEmails(data.emails);
        setError('');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error uploading student emails file');
    }
  };

  const addStudentEmail = () => {
    if (!emailInput.trim()) return;
    
    const email = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (studentEmails.includes(email)) {
      setError('Email already added');
      return;
    }
    
    setStudentEmails([...studentEmails, email]);
    setEmailInput('');
    setError('');
  };

  const removeStudentEmail = (emailToRemove) => {
    setStudentEmails(studentEmails.filter(email => email !== emailToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (questions.length === 0) {
      setError('Please upload questions via Excel file');
      setLoading(false);
      return;
    }

    if (studentEmails.length === 0) {
      setError('Please add at least one student email address');
      setLoading(false);
      return;
    }

    const totalMarks = questions.reduce((sum, q) => sum + parseInt(q.marks), 0);

    // Calculate end time based on start time and duration
    const startTime = new Date(examData.startTime);
    const endTime = new Date(startTime.getTime() + examData.duration * 60000);

    const submitData = {
      ...examData,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalMarks,
      questions,
      studentEmails
    };

    console.log('\n' + '='.repeat(60));
    console.log('📤 ADMIN FORM - SENDING DATA');
    console.log('='.repeat(60));
    console.log('📋 Form Title:', examData.title);
    console.log('📄 Form Description:', examData.description);
    console.log('⏱️ Form Duration:', examData.duration);
    console.log('📊 Calculated Total Marks:', totalMarks);
    console.log('❓ Questions Count:', questions.length);
    console.log('👥 Student Emails Count:', studentEmails.length);
    console.log('='.repeat(60) + '\n');

    const token = Cookies.get('token');
    try {
      const response = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();
      if (response.ok) {
        router.push('/admin');
      } else {
        // Handle subscription-specific errors
        if (data.subscriptionExpired) {
          setError(`⚠️ ${data.message} Please visit the Subscription page to upgrade your plan.`);
        } else if (data.limitReached) {
          setError(`🚫 ${data.message} Current usage: ${data.currentCount}/${data.limit} exams.`);
        } else {
          setError(data.message);
        }
      }
    } catch (error) {
      setError('Error creating exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="header">
        <div className="container">
          <div className="header-content">
            <Link href="/admin" className="logo">ExamEye Admin</Link>
            <nav className="nav-links">
              <Link href="/admin" className="nav-link">Dashboard</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        {/* Loading State */}
        {subscriptionCheck.loading && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Checking Subscription Status...</h2>
            <p style={{ color: '#6b7280' }}>Please wait while we verify your subscription</p>
          </div>
        )}

        {/* Subscription Expired or Limit Reached */}
        {!subscriptionCheck.loading && !subscriptionCheck.allowed && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card" style={{ 
              padding: '3rem', 
              textAlign: 'center',
              background: subscriptionCheck.subscriptionExpired ? '#fef2f2' : '#fef3c7',
              border: `2px solid ${subscriptionCheck.subscriptionExpired ? '#fca5a5' : '#fcd34d'}`
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>
                {subscriptionCheck.subscriptionExpired ? '⚠️' : '🚫'}
              </div>
              
              <h1 style={{ 
                fontSize: '2rem', 
                marginBottom: '1rem',
                color: subscriptionCheck.subscriptionExpired ? '#dc2626' : '#d97706'
              }}>
                {subscriptionCheck.subscriptionExpired ? 'Subscription Expired' : 'Exam Limit Reached'}
              </h1>
              
              <p style={{ 
                fontSize: '1.1rem', 
                marginBottom: '2rem',
                color: subscriptionCheck.subscriptionExpired ? '#991b1b' : '#92400e',
                lineHeight: '1.6'
              }}>
                {subscriptionCheck.message}
              </p>

              {/* Current Plan Info */}
              {subscriptionCheck.data && (
                <div style={{ 
                  background: 'white', 
                  padding: '1.5rem', 
                  borderRadius: '8px', 
                  marginBottom: '2rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#374151' }}>
                    Current Plan Details
                  </h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                    gap: '1rem',
                    textAlign: 'left'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                        Plan
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', textTransform: 'capitalize' }}>
                        {subscriptionCheck.data.subscriptionPlan.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                        Exam Limit
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                        {subscriptionCheck.data.maxExams} exams
                      </div>
                    </div>
                    {subscriptionCheck.currentCount !== undefined && (
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Current Usage
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: '#dc2626' }}>
                          {subscriptionCheck.currentCount} / {subscriptionCheck.limit}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link 
                  href="/admin/subscription"
                  style={{
                    padding: '1rem 2rem',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '1.05rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 15px rgba(5,150,105,0.3)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <span>🚀</span>
                  Upgrade Plan
                </Link>
                
                <Link 
                  href="/admin"
                  style={{
                    padding: '1rem 2rem',
                    background: 'white',
                    color: '#374151',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '1.05rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#9ca3af';
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <span>←</span>
                  Back to Dashboard
                </Link>
              </div>

              {/* Help Text */}
              <div style={{ 
                marginTop: '2rem', 
                padding: '1rem', 
                background: 'rgba(255,255,255,0.5)', 
                borderRadius: '6px',
                fontSize: '0.9rem',
                color: '#6b7280'
              }}>
                <strong>Need help?</strong> Contact support or visit our pricing page to learn more about our plans.
              </div>
            </div>
          </div>
        )}

        {/* Create Exam Form - Only show if allowed */}
        {!subscriptionCheck.loading && subscriptionCheck.allowed && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <h1>Create New Exam</h1>
              {subscriptionCheck.remaining !== undefined && (
                <p style={{ 
                  color: subscriptionCheck.remaining <= 2 ? '#dc2626' : '#6b7280',
                  fontSize: '0.95rem',
                  marginTop: '0.5rem'
                }}>
                  {subscriptionCheck.remaining <= 2 && '⚠️ '}
                  You have {subscriptionCheck.remaining} exam{subscriptionCheck.remaining !== 1 ? 's' : ''} remaining in your plan 
                  ({subscriptionCheck.currentCount}/{subscriptionCheck.limit} used)
                  {subscriptionCheck.remaining <= 2 && (
                    <Link 
                      href="/admin/subscription" 
                      style={{ marginLeft: '0.5rem', color: '#059669', textDecoration: 'underline' }}
                    >
                      Upgrade now
                    </Link>
                  )}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="card">
                <h3>Exam Information</h3>
                
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={examData.title}
                    onChange={handleExamDataChange}
                    className="form-input"
                    required
                  />
                </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={examData.description}
                onChange={handleExamDataChange}
                className="form-input"
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <input
                type="number"
                name="duration"
                value={examData.duration}
                onChange={handleExamDataChange}
                className="form-input"
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Start Date & Time (IST)</label>
              <input
                type="datetime-local"
                name="startTime"
                value={examData.startTime}
                onChange={handleExamDataChange}
                className="form-input"
                required
              />
              <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                Exam will automatically start at this time (Indian Standard Time)
              </small>
            </div>

            {examData.startTime && examData.duration && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: '#f0f9ff', 
                borderRadius: '8px',
                border: '1px solid #bae6fd'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#0369a1' }}>
                  <strong>Calculated End Time:</strong> {
                    (() => {
                      const start = new Date(examData.startTime);
                      const end = new Date(start.getTime() + examData.duration * 60000);
                      return end.toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      });
                    })()
                  } IST
                </div>
              </div>
            )}
          </div>

          {/* Exam Instructions */}
          <div className="card">
            <h3>Exam Instructions</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Customize the instructions that students will see before starting the exam.
            </p>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={examData.instructions.enabled}
                  onChange={(e) => handleInstructionChange('enabled', e.target.checked)}
                />
                <span className="form-label" style={{ margin: 0 }}>Enable instruction page</span>
              </label>
              <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                If disabled, students will go directly to the exam without seeing instructions
              </small>
            </div>

            {examData.instructions.enabled && (
              <>
                <div className="form-group">
                  <label className="form-label">Instructions Title</label>
                  <input
                    type="text"
                    value={examData.instructions.title}
                    onChange={(e) => handleInstructionChange('title', e.target.value)}
                    className="form-input"
                    placeholder="Exam Instructions"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Instructions Content</label>
                  <RichTextEditor
                    value={examData.instructions.content}
                    onChange={(content) => handleInstructionChange('content', content)}
                    placeholder="Enter detailed exam instructions..."
                  />
                  <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                    Use the toolbar above to format your instructions with bold, italic, lists, and more.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Acknowledgment Text</label>
                  <textarea
                    value={examData.instructions.acknowledgmentText}
                    onChange={(e) => handleInstructionChange('acknowledgmentText', e.target.value)}
                    className="form-input"
                    rows="3"
                    placeholder="Text that students must acknowledge before starting the exam"
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={examData.instructions.requireAcknowledgment}
                      onChange={(e) => handleInstructionChange('requireAcknowledgment', e.target.checked)}
                    />
                    <span className="form-label" style={{ margin: 0 }}>Require acknowledgment</span>
                  </label>
                  <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                    Students must check the acknowledgment box before they can start the exam
                  </small>
                </div>

                {/* Instructions Preview */}
                <div style={{ 
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{ marginBottom: '1rem', color: '#374151' }}>Preview:</h4>
                  <div style={{ 
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}>
                    <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>{examData.instructions.title}</h3>
                    <div 
                      style={{ 
                        lineHeight: '1.6',
                        color: '#374151',
                        marginBottom: '1rem'
                      }}
                      dangerouslySetInnerHTML={{ __html: examData.instructions.content }}
                    />
                    {examData.instructions.requireAcknowledgment && (
                      <div style={{ 
                        padding: '1rem',
                        background: '#f0f9ff',
                        borderRadius: '6px',
                        border: '1px solid #bae6fd'
                      }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                          <input type="checkbox" style={{ marginTop: '2px' }} />
                          <span style={{ fontSize: '0.9rem', color: '#0c4a6e' }}>
                            {examData.instructions.acknowledgmentText}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Questions Upload */}
          <div className="card">
            <h3>Questions Upload</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Upload questions via Excel file. You can add additional questions manually after the exam is created.
            </p>
            
            {/* Download Template Button */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, marginBottom: '0.5rem', color: '#0c4a6e', fontSize: '1rem' }}>
                    📥 Need a template?
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#075985' }}>
                    Download our Excel template with sample questions to get started quickly
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Create a CSV template with the exact format from the image
                    const headers = ['question', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'marks'];
                    const sampleRow1 = ['What is 10 + 10?', 'London', 'Berlin', 'Paris', 'Madrid', '3', '2'];
                    const sampleRow2 = ['What is 2 + 3', '4', '5', '6', '2', '2', '1'];
                    
                    const csvContent = [
                      headers.join(','),
                      sampleRow1.map(cell => `"${cell}"`).join(','),
                      sampleRow2.map(cell => `"${cell}"`).join(',')
                    ].join('\n');
                    
                    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'questions_template.csv';
                    link.click();
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 2px 8px rgba(14,165,233,0.3)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(14,165,233,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(14,165,233,0.3)';
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>⬇️</span>
                  Download Template
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Upload Questions Excel File</label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleQuestionsExcelUpload}
                className="form-input"
              />
              <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                Excel format: Question | Option1 | Option2 | Option3 | Option4 | CorrectAnswer (1-4) | Marks
              </small>
            </div>

            {questions.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4>Uploaded Questions ({questions.length})</h4>
                <div style={{ 
                  maxHeight: '300px', 
                  overflowY: 'auto', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px', 
                  padding: '1rem',
                  background: '#f9fafb'
                }}>
                  {questions.map((q, index) => (
                    <div key={index} style={{ 
                      padding: '1rem', 
                      borderBottom: index < questions.length - 1 ? '1px solid #e5e7eb' : 'none',
                      marginBottom: index < questions.length - 1 ? '1rem' : 0
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                        Q{index + 1}: {q.question}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        Options: {q.options.join(', ')} | Correct: {q.options[q.correctAnswer]} | Marks: {q.marks}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '0.75rem', 
                  background: '#ecfdf5', 
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  color: '#059669'
                }}>
                  ✓ {questions.length} questions uploaded successfully. Total marks: {questions.reduce((sum, q) => sum + parseInt(q.marks), 0)}
                </div>
              </div>
            )}

            {questions.length === 0 && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: '#fef3c7', 
                borderRadius: '8px',
                border: '1px solid #fde68a',
                fontSize: '0.9rem',
                color: '#92400e'
              }}>
                ⚠️ Please upload questions via Excel file to create the exam. You can add more questions manually later.
              </div>
            )}
          </div>

          {/* Student Email Management */}
          <div className="card">
            <h3>Student Email Addresses</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Add student email addresses who will receive exam credentials. Temporary login credentials will be generated and sent to each email.
            </p>
            
            <div className="form-group">
              <label className="form-label">Upload Method</label>
              <select
                value={studentUploadMethod}
                onChange={(e) => setStudentUploadMethod(e.target.value)}
                className="form-input"
              >
                <option value="manual">Manual Entry</option>
                <option value="excel">Excel Upload</option>
              </select>
            </div>

            {studentUploadMethod === 'excel' ? (
              <div>
                {/* Download Template Button for Student Emails */}
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h4 style={{ margin: 0, marginBottom: '0.5rem', color: '#14532d', fontSize: '1rem' }}>
                        📥 Need a template?
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#166534' }}>
                        Download our Excel template to add student emails easily
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // Create a CSV template for student emails
                        const headers = ['email'];
                        const sampleRow1 = ['student1@example.com'];
                        const sampleRow2 = ['student2@example.com'];
                        const sampleRow3 = ['student3@example.com'];
                        
                        const csvContent = [
                          headers.join(','),
                          sampleRow1.join(','),
                          sampleRow2.join(','),
                          sampleRow3.join(',')
                        ].join('\n');
                        
                        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = 'student_emails_template.csv';
                        link.click();
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,185,129,0.3)';
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>⬇️</span>
                      Download Template
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Excel File with Student Emails</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleStudentEmailsUpload}
                    className="form-input"
                  />
                  <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                    Excel/CSV format: Column A (header: "email") should contain email addresses (one per row)
                  </small>
                </div>
              </div>
            ) : (
              <div>
                <div className="form-group">
                  <label className="form-label">Add Student Email</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStudentEmail())}
                      className="form-input"
                      placeholder="student@example.com"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={addStudentEmail}
                      className="btn btn-secondary"
                    >
                      Add Email
                    </button>
                  </div>
                </div>
              </div>
            )}

            {studentEmails.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4>Added Student Emails ({studentEmails.length})</h4>
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px', 
                  padding: '1rem',
                  background: '#f9fafb'
                }}>
                  {studentEmails.map((email, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '0.5rem 0',
                      borderBottom: index < studentEmails.length - 1 ? '1px solid #e5e7eb' : 'none'
                    }}>
                      <span style={{ fontSize: '0.9rem' }}>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeStudentEmail(email)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          padding: '0.25rem 0.5rem'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '0.75rem', 
                  background: '#ecfdf5', 
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  color: '#059669'
                }}>
                  ✓ Temporary credentials will be generated and sent to all {studentEmails.length} email addresses when the exam is created.
                </div>
              </div>
            )}
          </div>

          {error && <div className="error">{error}</div>}

          <div style={{ marginTop: '2rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating Exam...' : 'Create Exam'}
            </button>
            <Link href="/admin" className="btn btn-secondary" style={{ marginLeft: '1rem' }}>
              Cancel
            </Link>
          </div>
        </form>
          </>
        )}
      </main>
    </div>
  );
}