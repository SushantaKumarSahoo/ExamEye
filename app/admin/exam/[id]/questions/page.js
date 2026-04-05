'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function ExamQuestionsManagement() {
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    questionType: 'multiple-choice',
    options: ['', '', '', ''],
    correctAnswer: 0,
    marks: 1
  });

  const router = useRouter();
  const params = useParams();
  const examId = params.id;

  const questionTypes = {
    'multiple-choice': {
      name: 'Multiple Choice',
      description: 'Single correct answer from multiple options',
      minOptions: 2,
      maxOptions: 6
    },
    'true-false': {
      name: 'True/False',
      description: 'Simple true or false question',
      minOptions: 2,
      maxOptions: 2
    },
    'multiple-answer': {
      name: 'Multiple Answer',
      description: 'Multiple correct answers possible',
      minOptions: 2,
      maxOptions: 6
    }
  };

  useEffect(() => {
    fetchExamQuestions();
  }, [examId]);

  const fetchExamQuestions = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/admin/exams/${examId}/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExam({
          id: data.examId,
          title: data.examTitle,
          status: data.examStatus,
          totalMarks: data.totalMarks
        });
        setQuestions(data.questions);
      } else {
        setError('Failed to fetch exam questions');
      }
    } catch (error) {
      setError('Error loading exam questions');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionTypeChange = (type) => {
    const typeConfig = questionTypes[type];
    let newOptions = [];
    let newCorrectAnswer = 0;

    if (type === 'true-false') {
      newOptions = ['True', 'False'];
      newCorrectAnswer = 0;
    } else {
      // For multiple-choice and multiple-answer, start with minimum options
      newOptions = Array(typeConfig.minOptions).fill('');
      newCorrectAnswer = type === 'multiple-answer' ? [0] : 0;
    }

    setCurrentQuestion({
      ...currentQuestion,
      questionType: type,
      options: newOptions,
      correctAnswer: newCorrectAnswer
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({
      ...currentQuestion,
      options: newOptions
    });
  };

  const addOption = () => {
    const typeConfig = questionTypes[currentQuestion.questionType];
    if (currentQuestion.options.length < typeConfig.maxOptions) {
      setCurrentQuestion({
        ...currentQuestion,
        options: [...currentQuestion.options, '']
      });
    }
  };

  const removeOption = (index) => {
    const typeConfig = questionTypes[currentQuestion.questionType];
    if (currentQuestion.options.length > typeConfig.minOptions) {
      const newOptions = currentQuestion.options.filter((_, i) => i !== index);
      
      // Adjust correct answer if needed
      let newCorrectAnswer = currentQuestion.correctAnswer;
      if (currentQuestion.questionType === 'multiple-answer') {
        newCorrectAnswer = newCorrectAnswer.filter(idx => idx !== index).map(idx => idx > index ? idx - 1 : idx);
      } else if (currentQuestion.correctAnswer === index) {
        newCorrectAnswer = 0;
      } else if (currentQuestion.correctAnswer > index) {
        newCorrectAnswer = currentQuestion.correctAnswer - 1;
      }

      setCurrentQuestion({
        ...currentQuestion,
        options: newOptions,
        correctAnswer: newCorrectAnswer
      });
    }
  };

  const handleCorrectAnswerChange = (value, isMultiple = false) => {
    if (isMultiple) {
      // For multiple-answer questions
      const currentAnswers = Array.isArray(currentQuestion.correctAnswer) ? currentQuestion.correctAnswer : [];
      const newAnswers = currentAnswers.includes(value)
        ? currentAnswers.filter(ans => ans !== value)
        : [...currentAnswers, value];
      
      setCurrentQuestion({
        ...currentQuestion,
        correctAnswer: newAnswers
      });
    } else {
      // For single-answer questions
      setCurrentQuestion({
        ...currentQuestion,
        correctAnswer: parseInt(value)
      });
    }
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    setAdding(true);
    setError('');
    setSuccess('');

    // Validation
    if (!currentQuestion.question.trim()) {
      setError('Question text is required');
      setAdding(false);
      return;
    }

    if (currentQuestion.questionType !== 'true-false') {
      const filledOptions = currentQuestion.options.filter(opt => opt.trim() !== '');
      if (filledOptions.length < 2) {
        setError('At least 2 options are required');
        setAdding(false);
        return;
      }
    }

    if (currentQuestion.questionType === 'multiple-answer') {
      if (!Array.isArray(currentQuestion.correctAnswer) || currentQuestion.correctAnswer.length === 0) {
        setError('At least one correct answer must be selected');
        setAdding(false);
        return;
      }
    }

    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/admin/exams/${examId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(currentQuestion)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Question added successfully!');
        // Reset form
        setCurrentQuestion({
          question: '',
          questionType: 'multiple-choice',
          options: ['', '', '', ''],
          correctAnswer: 0,
          marks: 1
        });
        // Refresh questions
        fetchExamQuestions();
      } else {
        setError(data.message || 'Failed to add question');
      }
    } catch (error) {
      setError('Error adding question');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading exam questions...</div>;
  }

  return (
    <div className="admin-background">
      <header className="admin-header">
        <div className="container">
          <div className="header-content">
            <Link href="/admin" className="logo">ExamEye Admin</Link>
            <nav className="nav-links">
              <Link href="/admin">Dashboard</Link>
              <Link href={`/admin/exam/${examId}`}>Back to Exam</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, fontSize: '2rem', fontWeight: '700' }}>
              <span>📝</span>
              Manage Questions: {exam?.title}
            </h1>
            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
              Add additional questions to this exam. Initial questions were uploaded during exam creation.
            </p>
            
            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
              <span>📊 Total Questions: <strong>{questions.length}</strong></span>
              <span>🎯 Total Marks: <strong>{exam?.totalMarks || 0}</strong></span>
              <span>📋 Status: <strong style={{ textTransform: 'capitalize' }}>{exam?.status}</strong></span>
            </div>
          </div>

          {/* Add Question Form */}
          <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>➕</span>
              Add Additional Question
            </h3>
            
            <div style={{ 
              padding: '1rem', 
              background: '#f0f9ff', 
              borderRadius: '8px',
              border: '1px solid #bae6fd',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              color: '#0369a1'
            }}>
              💡 <strong>Note:</strong> This form is for adding extra questions to the exam. The initial questions were uploaded via Excel during exam creation.
            </div>

            <form onSubmit={handleSubmitQuestion}>
              {/* Question Type Selection */}
              <div className="form-group">
                <label className="form-label">Question Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {Object.entries(questionTypes).map(([type, config]) => (
                    <label key={type} style={{ 
                      display: 'block',
                      padding: '1rem',
                      border: currentQuestion.questionType === type ? '2px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: currentQuestion.questionType === type ? '#f9fafb' : 'white'
                    }}>
                      <input
                        type="radio"
                        name="questionType"
                        value={type}
                        checked={currentQuestion.questionType === type}
                        onChange={(e) => handleQuestionTypeChange(e.target.value)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{config.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{config.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Question Text */}
              <div className="form-group">
                <label className="form-label">Question</label>
                <textarea
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({...currentQuestion, question: e.target.value})}
                  className="form-input"
                  rows="3"
                  placeholder="Enter your question here..."
                  required
                />
              </div>

              {/* Options */}
              {currentQuestion.questionType !== 'true-false' && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Options</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {currentQuestion.options.length < questionTypes[currentQuestion.questionType].maxOptions && (
                        <button type="button" onClick={addOption} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                          + Add Option
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <span style={{ minWidth: '60px', fontSize: '0.9rem', color: '#6b7280' }}>Option {index + 1}:</span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="form-input"
                        placeholder={`Enter option ${index + 1}`}
                        style={{ flex: 1 }}
                      />
                      {currentQuestion.options.length > questionTypes[currentQuestion.questionType].minOptions && (
                        <button 
                          type="button" 
                          onClick={() => removeOption(index)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#dc2626', 
                            cursor: 'pointer',
                            padding: '0.5rem'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Correct Answer Selection */}
              <div className="form-group">
                <label className="form-label">
                  Correct Answer{currentQuestion.questionType === 'multiple-answer' ? 's' : ''}
                </label>
                
                {currentQuestion.questionType === 'true-false' ? (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="correctAnswer"
                        value={0}
                        checked={currentQuestion.correctAnswer === 0}
                        onChange={(e) => handleCorrectAnswerChange(parseInt(e.target.value))}
                      />
                      True
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="correctAnswer"
                        value={1}
                        checked={currentQuestion.correctAnswer === 1}
                        onChange={(e) => handleCorrectAnswerChange(parseInt(e.target.value))}
                      />
                      False
                    </label>
                  </div>
                ) : currentQuestion.questionType === 'multiple-answer' ? (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {currentQuestion.options.map((option, index) => (
                      option.trim() && (
                        <label key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={Array.isArray(currentQuestion.correctAnswer) && currentQuestion.correctAnswer.includes(index)}
                            onChange={() => handleCorrectAnswerChange(index, true)}
                          />
                          Option {index + 1}: {option}
                        </label>
                      )
                    ))}
                  </div>
                ) : (
                  <select
                    value={currentQuestion.correctAnswer}
                    onChange={(e) => handleCorrectAnswerChange(e.target.value)}
                    className="form-input"
                  >
                    {currentQuestion.options.map((option, index) => (
                      option.trim() && (
                        <option key={index} value={index}>
                          Option {index + 1}: {option}
                        </option>
                      )
                    ))}
                  </select>
                )}
              </div>

              {/* Marks */}
              <div className="form-group">
                <label className="form-label">Marks</label>
                <input
                  type="number"
                  value={currentQuestion.marks}
                  onChange={(e) => setCurrentQuestion({...currentQuestion, marks: parseInt(e.target.value)})}
                  className="form-input"
                  min="1"
                  max="100"
                  style={{ maxWidth: '150px' }}
                />
              </div>

              {/* Messages */}
              {error && (
                <div style={{ 
                  padding: '1rem', 
                  background: '#fef2f2', 
                  color: '#dc2626', 
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid #fecaca'
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{ 
                  padding: '1rem', 
                  background: '#ecfdf5', 
                  color: '#059669', 
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid #d1fae5'
                }}>
                  {success}
                </div>
              )}

              {/* Submit Button */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={adding}
                >
                  {adding ? 'Adding Question...' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Questions */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📋</span>
              Existing Questions ({questions.length})
            </h3>

            {questions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                <h4>No Questions Added Yet</h4>
                <p>Add your first question using the form above.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {questions.map((q, index) => (
                  <div key={index} style={{ 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px', 
                    padding: '1.5rem',
                    background: '#fafafa'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>Q{index + 1}</span>
                          <span style={{ 
                            padding: '0.25rem 0.75rem',
                            background: '#e5e7eb',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            textTransform: 'capitalize'
                          }}>
                            {q.questionType.replace('-', ' ')}
                          </span>
                          <span style={{ 
                            padding: '0.25rem 0.75rem',
                            background: '#ecfdf5',
                            color: '#059669',
                            borderRadius: '20px',
                            fontSize: '0.8rem'
                          }}>
                            {q.marks} mark{q.marks !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p style={{ fontSize: '1rem', marginBottom: '1rem', lineHeight: '1.5' }}>{q.question}</p>
                        
                        {q.questionType === 'true-false' ? (
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <span style={{ 
                              padding: '0.5rem 1rem',
                              background: q.correctAnswer === 0 ? '#ecfdf5' : '#f3f4f6',
                              color: q.correctAnswer === 0 ? '#059669' : '#6b7280',
                              borderRadius: '6px',
                              fontWeight: q.correctAnswer === 0 ? '600' : 'normal'
                            }}>
                              True {q.correctAnswer === 0 && '✓'}
                            </span>
                            <span style={{ 
                              padding: '0.5rem 1rem',
                              background: q.correctAnswer === 1 ? '#ecfdf5' : '#f3f4f6',
                              color: q.correctAnswer === 1 ? '#059669' : '#6b7280',
                              borderRadius: '6px',
                              fontWeight: q.correctAnswer === 1 ? '600' : 'normal'
                            }}>
                              False {q.correctAnswer === 1 && '✓'}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {q.options.map((option, optIndex) => {
                              const isCorrect = q.questionType === 'multiple-answer' 
                                ? Array.isArray(q.correctAnswer) && q.correctAnswer.includes(optIndex)
                                : q.correctAnswer === optIndex;
                              
                              return (
                                <div key={optIndex} style={{ 
                                  padding: '0.5rem 1rem',
                                  background: isCorrect ? '#ecfdf5' : '#f3f4f6',
                                  color: isCorrect ? '#059669' : '#6b7280',
                                  borderRadius: '6px',
                                  fontWeight: isCorrect ? '600' : 'normal',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}>
                                  <span style={{ minWidth: '20px' }}>{String.fromCharCode(65 + optIndex)}.</span>
                                  <span>{option}</span>
                                  {isCorrect && <span>✓</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {q.addedAt && (
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '1rem' }}>
                        Added on {new Date(q.addedAt).toLocaleDateString()} at {new Date(q.addedAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}