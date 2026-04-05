'use client';

import { useEffect, useRef, useState } from 'react';

export default function CameraMonitoring({ examId, enabled = true }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [cameraStatus, setCameraStatus] = useState('initializing');

  useEffect(() => {
    if (enabled) {
      initializeCamera();
    }
    
    return () => {
      cleanup();
    };
  }, [enabled, examId]);

  const initializeCamera = async () => {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraStatus('active');
      
      // Start capturing screenshots every 5 seconds
      intervalRef.current = setInterval(captureAndSendScreenshot, 5000);
      
      // Send initial screenshot
      setTimeout(captureAndSendScreenshot, 1000);
      
    } catch (error) {
      console.error('Camera access denied:', error);
      setCameraStatus('error');
    }
  };

  const captureAndSendScreenshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 JPEG (compressed)
      const screenshot = canvas.toDataURL('image/jpeg', 0.7);
      
      // Send to server
      const token = localStorage.getItem('token');
      await fetch('/api/student/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          examId,
          screenshot,
          timestamp: Date.now()
        })
      });
      
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  };

  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
      {/* Hidden video element for capturing */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />
      
      {/* Hidden canvas for screenshot capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Status indicator */}
      <div style={{
        padding: '0.75rem 1rem',
        background: cameraStatus === 'active' ? '#10b981' : cameraStatus === 'error' ? '#dc2626' : '#6b7280',
        color: 'white',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '500',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span style={{ fontSize: '1.25rem' }}>
          {cameraStatus === 'active' ? '📹' : cameraStatus === 'error' ? '❌' : '⏳'}
        </span>
        <span>
          {cameraStatus === 'active' ? 'Camera Monitoring Active' : 
           cameraStatus === 'error' ? 'Camera Access Denied' : 
           'Initializing Camera...'}
        </span>
      </div>
    </div>
  );
}
