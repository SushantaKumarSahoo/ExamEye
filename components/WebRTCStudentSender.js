'use client';

import { useState, useEffect, useRef } from 'react';

export default function WebRTCStudentSender({ examId, studentId }) {
  const [connectionState, setConnectionState] = useState('new');
  const [isActive, setIsActive] = useState(false);
  
  const localVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const localStreamRef = useRef(null);

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
          from: `student-${studentId}`,
          to: `admin-${examId}`,
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
        `/api/webrtc/signal?userId=student-${studentId}&examId=${examId}`
      );
      const data = await response.json();
      
      if (data.signals && data.signals.length > 0) {
        for (const { type, signal } of data.signals) {
          if (type === 'offer') {
            await handleOffer(signal);
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
    };
    
    return pc;
  };

  const startStreaming = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsActive(true);
      
      // Start polling for offers from admin
      pollingIntervalRef.current = setInterval(pollSignals, 1000);
      
    } catch (error) {
      console.error('Failed to start streaming:', error);
    }
  };

  const handleOffer = async (offer) => {
    try {
      // Create peer connection if not exists
      if (!peerConnectionRef.current) {
        const pc = createPeerConnection();
        peerConnectionRef.current = pc;
        
        // Add local stream tracks
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current);
          });
        }
      }
      
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      await sendSignal('answer', answer);
      
      console.log('Answer sent to admin');
    } catch (error) {
      console.error('Handle offer error:', error);
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
    startStreaming();
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', display: 'none' }}>
      {/* Hidden video preview - student doesn't need to see their own feed */}
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '1px', height: '1px', opacity: 0 }}
      />
      
      {/* Small status indicator */}
      {isActive && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          background: connectionState === 'connected' ? '#10b981' : '#6b7280',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '500',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'white',
            animation: connectionState === 'connected' ? 'pulse 2s infinite' : 'none'
          }} />
          <span>Camera {connectionState === 'connected' ? 'Streaming' : 'Active'}</span>
        </div>
      )}
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
