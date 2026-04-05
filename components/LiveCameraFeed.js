'use client';

import { useState, useEffect, useRef } from 'react';

export default function LiveCameraFeed({ examId, studentId, studentName, studentEmail }) {
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    initializeWebRTC();
    
    return () => {
      cleanup();
    };
  }, [examId, studentId]);

  const cleanup = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const initializeWebRTC = async () => {
    try {
      console.log('🎥 Initializing WebRTC connection for student:', studentId);
      setStatus('connecting');
      
      // Create peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };
      
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;
      
      // Handle incoming stream
      peerConnection.ontrack = (event) => {
        console.log('✅ Received remote stream');
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setStatus('connected');
          setError(null);
        }
      };
      
      // Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('📤 Sending ICE candidate');
          await sendSignal('ice-candidate', event.candidate);
        }
      };
      
      // Handle connection state
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setStatus('connected');
        } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          setStatus('disconnected');
          setError('Connection lost');
        }
      };
      
      // Request offer from student
      await sendSignal('request-offer', null);
      
      // Start polling for signals
      startSignalPolling();
      
    } catch (err) {
      console.error('❌ WebRTC initialization error:', err);
      setError('Failed to initialize video connection');
      setStatus('error');
    }
  };

  const sendSignal = async (type, signal) => {
    try {
      await fetch('/api/webrtc/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          from: 'admin',
          to: studentId,
          signal,
          examId
        })
      });
    } catch (error) {
      console.error('Failed to send signal:', error);
    }
  };

  const startSignalPolling = () => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/webrtc/signal?userId=admin&examId=${examId}`);
        const data = await response.json();
        
        for (const msg of data.signals || []) {
          if (msg.from === studentId) {
            await handleSignal(msg);
          }
        }
      } catch (error) {
        console.error('Signal polling error:', error);
      }
    }, 1000);
  };

  const handleSignal = async (msg) => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection) {
      console.error('❌ No peer connection available');
      return;
    }
    
    try {
      console.log('📥 Handling signal:', msg.type, 'from:', msg.from);
      
      if (msg.type === 'offer') {
        console.log('📥 Received offer from student');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.signal));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        console.log('📤 Sending answer to student');
        await sendSignal('answer', answer);
        
      } else if (msg.type === 'ice-candidate') {
        console.log('📥 Received ICE candidate');
        if (msg.signal) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(msg.signal));
        }
      }
    } catch (error) {
      console.error('❌ Error handling signal:', error);
      setError('Connection failed: ' + error.message);
    }
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
            background: status === 'connected' ? '#10b981' : status === 'connecting' ? '#f59e0b' : '#6b7280',
            marginBottom: '0.25rem'
          }}>
            {status === 'connected' ? '🟢 Live' : status === 'connecting' ? '🟡 Connecting...' : '⚪ Offline'}
          </div>
        </div>
      </div>
      
      {/* Video Feed */}
      <div style={{ 
        position: 'relative',
        paddingBottom: '75%',
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
            <button
              onClick={initializeWebRTC}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        )}
        
        {status === 'connecting' && !error && (
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
            <div style={{ fontSize: '0.875rem' }}>Connecting to live feed...</div>
          </div>
        )}
      </div>
      
      <div style={{ 
        padding: '0.5rem', 
        background: '#1f2937', 
        color: '#9ca3af',
        fontSize: '0.75rem',
        textAlign: 'center'
      }}>
        Real-time WebRTC stream • No storage required
      </div>
    </div>
  );
}
