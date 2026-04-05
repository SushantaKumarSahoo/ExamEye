'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { formatDateTimeIST, isExamEditable } from '../../../../../lib/examUtils';

export default function EditExam() {
  const [exam, setExam] = useState(null);
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    duration: 60,
    startTime: '',
    endTime: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchExam(token);
  }, [params.id, router]);

  const fetchExam = async (token) => {
    try {
      const response = await fetch(`/api/exams/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setExam(data.exam);
        
        // Format datetime for input fields
        const startTime = data.exam.startTime ? 
          new Date(data.exam.startTime).toISOString().slice(0, 16) : '';
        
        setExamData({
          title: data.exam.title,
          description: data.exam.description,
          duration: data.exam.duration,
          startTime: startTime
        });
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error fetching exam details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setExamData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    if (!isExamEditable(exam)) {
      setError('Cannot edit exam after it has started');
      setSaving(false);
      return;
    }

    // Calculate end time
    const startTime = new Date(examData.startTime);
    const endTime = new Date(startTime.getTime() + examData.duration * 60000);

    const token = Cookies.get('token');
    try {
      const response = await fetch(`/api/admin/exams/${params.id}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...examData,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('Exam updated successfully');
        setTimeout(() => {
          router.push(`/admin/exam/${params.id}`);
        }, 1500);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error updating exam');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '2rem' }}>📝</div>
        <div>Loading exam details...</div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '2rem' }}>❌</div>
        <div>Exam not found</div>
        <Link href="/admin" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  if (!isExamEditable(exam)) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '2rem' }}>🔒</div>
        <div>Cannot edit exam after it has started</div>
        <Link href={`/admin/exam/${params.id}`} className="btn btn-primary">Back to Exam</Link>
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <div className="container">
          <div className="header-content">
            <Link href="/admin" className="logo">ExamEye Admin</Link>
            <nav className="nav-links">
              <Link href="/admin" className="nav-link">Dashboard</Link>
              <Link href={`/admin/exam/${params.id}`} className="nav-link">Back to Exam</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 20px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1>Edit Exam</h1>
          <p style={{ color: '#6b7280' }}>
            Modify exam details. Changes can only be made before the exam starts.
          </p>
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
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={examData.description}
                onChange={handleInputChange}
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
                onChange={handleInputChange}
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
                onChange={handleInputChange}
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

          {error && (
            <div style={{ 
              padding: '1rem', 
              background: '#fef2f2', 
              color: '#dc2626', 
              borderRadius: '8px',
              border: '1px solid #fecaca',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{ 
              padding: '1rem', 
              background: '#ecfdf5', 
              color: '#059669', 
              borderRadius: '8px',
              border: '1px solid #d1fae5',
              marginBottom: '1rem'
            }}>
              {message}
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Updating Exam...' : 'Update Exam'}
            </button>
            <Link 
              href={`/admin/exam/${params.id}`} 
              className="btn btn-secondary" 
              style={{ marginLeft: '1rem' }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}