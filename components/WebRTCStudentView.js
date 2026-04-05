'use client';

import { useState, useEffect, useRef } from 'react';

export default function WebRTCStudentView({ examId, studentId, studentName, studentEmail }) {
  const [connectionState, setConnectionState] = useState('new');
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [trackCount, setTrackCount] = useState({ video: 0, audio: 0 });
  
  const cameraVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const sendSignal = async (type, signal) => {
    try {
      await fetch('/api/webrtc/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          from: `admin-${examId}`,
          to: `student-${studentId}`,
          signal,
          examId
        })
      });
    } catch (error) {
      console.error('Failed to send signal:', error);
    }
  };

  const pollSignals = async () => {
    try {
      const response = await fetch(
        `/api/webrtc/signal?userId=admin-${examId}&examId=${examId}`
      );
      const data = await response.json();
      
      if (data.signals && data.signals.length > 0) {
        for (const { type, signal } of data.signals) {
          if (type === 'answer') {
            await handleAnswer(signal);
          } else if (type === 'ice-candidate') {
            await handleIceCandidate(signal);
          }
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(configuration);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', event.candidate);
      }
    };
    
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      console.log('Connection state:', pc.connectionState);
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setError('Connection lost. Retrying...');
        setTimeout(startConnection, 3000);
      }
    };
    
    pc.ontrack = (event) => {
      console.log('Remote track received:', event.track.kind, event.streams.length);
      
      // Determine if this is camera or screen based on stream
      const stream = event.streams[0];
      const streamId = stream.id;
      
      // First video track is camera, second is screen
      if (event.track.kind === 'video') {
        if (!cameraVideoRef.current.srcObject) {
          // First video = camera
          cameraVideoRef.current.srcObject = stream;
          console.log('Camera stream set');
        } else if (!screenVideoRef.current.srcObject) {
          // Second video = screen
          screenVideoRef.current.srcObject = stream;
          console.log('Screen stream set');
        }
      }
      
      // Update track count
      setTrackCount(prev => ({
        ...prev,
        [event.track.kind]: prev[event.track.kind] + 1
      }));
      
      setError(null);
    };
    
    return pc;
  };

  const startConnection = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Clean up existing connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;
      
      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      });
      await pc.setLocalDescription(offer);
      await sendSignal('offer', offer);
      
      // Start polling for answer
      pollingIntervalRef.current = setInterval(pollSignals, 1000);
      
      setIsConnecting(false);
    } catch (error) {
      console.error('Connection error:', error);
      setError(`Failed to connect: ${error.message}`);
      setIsConnecting(false);
    }
  };

  const handleAnswer = async (answer) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        console.log('Answer received and set');
      }
    } catch (error) {
      console.error('Handle answer error:', error);
    }
  };

  const handleIceCandidate = async (candidate) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    } catch (error) {
      console.error('ICE candidate error:', error);
    }
  };

  useEffect(() => {
    startConnection();
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [studentId]);

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return '#10b981';
      case 'connecting': return '#f59e0b';
      case 'failed':
      case 'disconnected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'failed': return 'Failed';
      case 'disconnected': return 'Disconnected';
      default: return 'Initializing...';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Status Badge */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        zIndex: 10,
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.875rem'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getStatusColor(),
          animation: connectionState === 'connecting' ? 'pulse 2s infinite' : 'none'
        }} />
        <span>{getStatusText()}</span>
        {connectionState === 'connected' && (
          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', opacity: 0.8 }}>
            📹 {trackCount.video} video • 🎤 {trackCount.audio} audio
          </span>
        )}
      </div>

      {/* Dual Video Display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Camera Feed */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem',
            zIndex: 5,
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            📹 Camera
          </div>
          <video
            ref={cameraVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: 'auto',
              minHeight: '300px',
              background: '#000',
              borderRadius: '0.5rem'
            }}
          />
        </div>

        {/* Screen Share */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem',
            zIndex: 5,
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            🖥️ Screen
          </div>
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: 'auto',
              minHeight: '300px',
              background: '#000',
              borderRadius: '0.5rem'
            }}
          />
        </div>
      </div>

      {/* Error/Loading Overlay */}
      {(error || isConnecting || connectionState !== 'connected') && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '0.5rem'
        }}>
          {isConnecting ? (
            <>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ marginTop: '1rem' }}>Connecting to student...</p>
            </>
          ) : error ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
              <p style={{ textAlign: 'center', maxWidth: '300px' }}>{error}</p>
              <button
                onClick={startConnection}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1.5rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Retry Connection
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📹</div>
              <p>Waiting for video streams...</p>
              <p style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.5rem' }}>
                Camera and screen share
              </p>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
