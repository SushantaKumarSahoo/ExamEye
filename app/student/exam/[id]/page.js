'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Cookies from 'js-cookie';

export default function StudentExam() {
  const [exam, setExam] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const token = Cookies.get('studentToken');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchExam(token);
  }, []);

  useEffect(() => {
    if (exam && !showInstructions && timeRemaining !== null) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [exam, showInstructions, timeRemaining]);

  const fetchExam = async (token) => {
    try {
      const response = await fetch(`/api/exams/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExam(data.exam);
        setTimeRemaining(data.exam.duration * 60); // Convert minutes to seconds
        
        // Check if instructions are enabled
        if (!data.exam.instructions?.enabled) {
          setShowInstructions(false);
        }
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (event) => {
    // Defensive check for event object existence
    if (event) {
      // Prevent default browser navigation behavior
      event.preventDefault();
      // Stop event propagation to parent elements
      event.stopPropagation();
    }
    
    if (exam.instructions?.requireAcknowledgment && !acknowledged) {
      alert('Please acknowledge that you have read the instructions');
      return;
    }
    setShowInstructions(false);
  };

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setAnswers({
      ...answers,
      [questionIndex]: answerIndex
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    
    const confirmSubmit = window.confirm('Are you sure you want to submit your exam? This action cannot be undone.');
    if (!confirmSubmit) return;

    setSubmitting(true);

    try {
      const token = Cookies.get('studentToken');
      const response = await fetch(`/api/exams/${params.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/student/result/${params.id}`);
      } else {
        alert('Error submitting exam. Please try again.');
        setSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
      alert('Error submitting exam. Please try again.');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <h2>Loading Exam...</h2>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2>Exam Not Found</h2>
        </div>
      </div>
    );
  }

  // Instructions Page
  if (showInstructions && exam.instructions?.enabled) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '12px', padding: '3rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1f2937' }}>
            {exam.instructions.title || 'Exam Instructions'}
          </h1>
          
          <div 
            style={{ marginBottom: '2rem', lineHeight: '1.8', color: '#374151' }}
            dangerouslySetInnerHTML={{ __html: exam.instructions.content }}
          />

          {exam.instructions.requireAcknowledgment && (
            <div style={{ 
              padding: '1.5rem', 
              background: '#f0f9ff', 
              borderRadius: '8px', 
              border: '2px solid #bae6fd',
              marginBottom: '2rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  style={{ marginTop: '4px', width: '20px', height: '20px' }}
                />
                <span style={{ fontSize: '1rem', color: '#0c4a6e', lineHeight: '1.6' }}>
                  {exam.instructions.acknowledgmentText}
                </span>
              </label>
            </div>
          )}

          <button
            type="button"
            onClick={handleStartExam}
            disabled={exam.instructions.requireAcknowledgment && !acknowledged}
            style={{
              width: '100%',
              padding: '1rem 2rem',
              background: (exam.instructions.requireAcknowledgment && !acknowledged) ? '#d1d5db' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: (exam.instructions.requireAcknowledgment && !acknowledged) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Start Exam
          </button>
        </div>
      </div>
    );
  }

  // Exam Page
  const question = exam.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / exam.questions.length) * 100;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header with Timer */}
      <div style={{ 
        background: 'white', 
        borderBottom: '2px solid #e5e7eb', 
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937' }}>{exam.title}</h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
              Question {currentQuestion + 1} of {exam.questions.length}
            </p>
          </div>
          <div style={{ 
            padding: '0.75rem 1.5rem', 
            background: timeRemaining < 300 ? '#fef2f2' : '#ecfdf5',
            borderRadius: '8px',
            border: `2px solid ${timeRemaining < 300 ? '#fca5a5' : '#a7f3d0'}`
          }}>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>Time Remaining</div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              color: timeRemaining < 300 ? '#dc2626' : '#059669',
              fontFamily: 'monospace'
            }}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ background: '#e5e7eb', height: '4px' }}>
        <div style={{ 
          background: 'linear-gradient(90deg, #dc2626 0%, #991b1b 100%)', 
          height: '100%', 
          width: `${progress}%`,
          transition: 'width 0.3s'
        }}></div>
      </div>

      {/* Question Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
            Question {currentQuestion + 1} • {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
          </div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '2rem', color: '#1f2937', lineHeight: '1.6' }}>
            {question.question}
          </h3>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {question.options.map((option, index) => (
              <div
                key={index}
                onClick={() => handleAnswerSelect(currentQuestion, index)}
                style={{
                  padding: '1.25rem',
                  border: `2px solid ${answers[currentQuestion] === index ? '#dc2626' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: answers[currentQuestion] === index ? '#fef2f2' : 'white',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
                onMouseEnter={(e) => {
                  if (answers[currentQuestion] !== index) {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.background = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (answers[currentQuestion] !== index) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: `2px solid ${answers[currentQuestion] === index ? '#dc2626' : '#d1d5db'}`,
                  background: answers[currentQuestion] === index ? '#dc2626' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {answers[currentQuestion] === index && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}></div>
                  )}
                </div>
                <span style={{ 
                  fontSize: '1.05rem', 
                  color: answers[currentQuestion] === index ? '#dc2626' : '#374151',
                  fontWeight: answers[currentQuestion] === index ? '500' : '400'
                }}>
                  {option}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', gap: '1rem' }}>
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            style={{
              padding: '0.75rem 2rem',
              background: currentQuestion === 0 ? '#f3f4f6' : 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
              color: currentQuestion === 0 ? '#9ca3af' : '#374151'
            }}
          >
            ← Previous
          </button>

          {currentQuestion === exam.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '0.75rem 2rem',
                background: submitting ? '#d1d5db' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(Math.min(exam.questions.length - 1, currentQuestion + 1))}
              style={{
                padding: '0.75rem 2rem',
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
