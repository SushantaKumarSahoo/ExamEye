'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';

export default function StudentCameraView({ examId, studentId, studentName, studentEmail }) {
  const [screenshot, setScreenshot] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchScreenshot();
    
    // Poll every 2 seconds
    intervalRef.current = setInterval(fetchScreenshot, 2000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [examId, studentId]);

  const fetchScreenshot = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/admin/screenshot/${studentId}?examId=${examId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.screenshot) {
          setScreenshot(data.screenshot);
          setLastUpdate(new Date(data.timestamp));
          setError(null);
        } else {
          setError('No camera feed available');
        }
      } else {
        console.error('Screenshot fetch failed:', response.status);
        setError('Failed to load camera feed');
      }
    } catch (error) {
      console.error('Error fetching screenshot:', error);
      setError('Failed to load camera feed');
    }
  };

  const getTimeSince = () => {
    if (!lastUpdate) return 'Never';
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div style={{ 
      border: '2px solid #e5e7eb', 
      borderRadius: '8px', 
      overflow: 'hidden',
      background: '#000'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '0.75rem', 
        background: '#1f2937', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{studentName}</div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{studentEmail}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: '0.75rem',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            background: screenshot && !error ? '#10b981' : '#6b7280',
            marginBottom: '0.25rem'
          }}>
            {screenshot && !error ? '🟢 Live' : '⚪ Offline'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
            {getTimeSince()}
          </div>
        </div>
      </div>
      
      {/* Camera Feed */}
      <div style={{ 
        position: 'relative',
        paddingBottom: '75%', // 4:3 aspect ratio
        background: '#1f2937'
      }}>
        {error ? (
          <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            padding: '2rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
            <div style={{ fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>
          </div>
        ) : screenshot ? (
          <img
            src={screenshot}
            alt={`${studentName}'s camera`}
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        ) : (
          <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <div style={{ fontSize: '0.875rem' }}>Loading camera feed...</div>
          </div>
        )}
      </div>
    </div>
  );
}
