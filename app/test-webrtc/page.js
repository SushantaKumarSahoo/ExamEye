'use client';

import { useState, useEffect, useRef } from 'react';

export default function TestWebRTC() {
  const [role, setRole] = useState(null); // 'sender' or 'receiver'
  const [status, setStatus] = useState('idle');
  const [logs, setLogs] = useState([]);
  const [connectionState, setConnectionState] = useState('new');
  const [testId] = useState(() => `test-${Date.now()}`);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const localStreamRef = useRef(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const sendSignal = async (type, signal) => {
    try {
      const response = await fetch('/api/webrtc/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          from: role,
          to: role === 'sender' ? 'receiver' : 'sender',
          signal,
          examId: testId
        })
      });
      
      if (response.ok) {
        addLog(`Sent ${type} signal`, 'success');
      }
    } catch (error) {
      addLog(`Failed to send signal: ${error.message}`, 'error');
    }
  };

  const pollSignals = async () => {
    try {
      const response = await fetch(`/api/webrtc/signal?userId=${role}&examId=${testId}`);
      const data = await response.json();
      
      if (data.signals && data.signals.length > 0) {
        for (const { type, signal } of data.signals) {
          addLog(`Received ${type} signal`, 'info');
          
          if (type === 'offer' && role === 'receiver') {
            await handleOffer(signal);
          } else if (type === 'answer' && role === 'sender') {
            await handleAnswer(signal);
          } else if (type === 'ice-candidate') {
            await handleIceCandidate(signal);
          }
        }
      }
    } catch (error) {
      addLog(`Polling error: ${error.message}`, 'error');
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(configuration);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addLog('ICE candidate generated', 'info');
        sendSignal('ice-candidate', event.candidate);
      }
    };
    
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      addLog(`Connection state: ${pc.connectionState}`, 'info');
    };
    
    pc.ontrack = (event) => {
      addLog('Remote track received', 'success');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    return pc;
  };

  const startAsSender = async () => {
    try {
      addLog('Starting as sender...', 'info');
      setRole('sender');
      setStatus('connecting');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      addLog('Local media captured', 'success');
      
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal('offer', offer);
      
      addLog('Offer created and sent', 'success');
      
      // Start polling for answer
      pollingIntervalRef.current = setInterval(pollSignals, 1000);
      
    } catch (error) {
      addLog(`Sender error: ${error.message}`, 'error');
      setStatus('error');
    }
  };

  const startAsReceiver = async () => {
    try {
      addLog('Starting as receiver...', 'info');
      setRole('receiver');
      setStatus('waiting');
      
      // Start polling for offer
      pollingIntervalRef.current = setInterval(pollSignals, 1000);
      
      addLog('Waiting for offer...', 'info');
      
    } catch (error) {
      addLog(`Receiver error: ${error.message}`, 'error');
      setStatus('error');
    }
  };

  const handleOffer = async (offer) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal('answer', answer);
      
      addLog('Answer created and sent', 'success');
      setStatus('connected');
      
    } catch (error) {
      addLog(`Handle offer error: ${error.message}`, 'error');
    }
  };

  const handleAnswer = async (answer) => {
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      addLog('Answer received and set', 'success');
      setStatus('connected');
    } catch (error) {
      addLog(`Handle answer error: ${error.message}`, 'error');
    }
  };

  const handleIceCandidate = async (candidate) => {
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      addLog('ICE candidate added', 'info');
    } catch (error) {
      addLog(`ICE candidate error: ${error.message}`, 'error');
    }
  };

  const cleanup = () => {
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

  useEffect(() => {
    return cleanup;
  }, []);

  const reset = () => {
    cleanup();
    setRole(null);
    setStatus('idle');
    setConnectionState('new');
    setLogs([]);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">WebRTC Connection Test</h1>
          <p className="text-gray-600 mb-4">Test WebRTC peer-to-peer connection with signaling server</p>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex gap-2">
              <span className="text-sm font-medium">Status:</span>
              <span className={`text-sm font-semibold ${
                status === 'connected' ? 'text-green-600' :
                status === 'connecting' || status === 'waiting' ? 'text-yellow-600' :
                status === 'error' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {status.toUpperCase()}
              </span>
            </div>
            
            <div className="flex gap-2">
              <span className="text-sm font-medium">Connection:</span>
              <span className={`text-sm font-semibold ${
                connectionState === 'connected' ? 'text-green-600' :
                connectionState === 'connecting' ? 'text-yellow-600' :
                connectionState === 'failed' || connectionState === 'disconnected' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {connectionState.toUpperCase()}
              </span>
            </div>
            
            {role && (
              <div className="flex gap-2">
                <span className="text-sm font-medium">Role:</span>
                <span className="text-sm font-semibold text-blue-600">{role.toUpperCase()}</span>
              </div>
            )}
          </div>

          {!role ? (
            <div className="space-y-4">
              <p className="text-gray-700">Choose a role to start testing:</p>
              <div className="flex gap-4">
                <button
                  onClick={startAsSender}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Start as Sender (Admin)
                </button>
                <button
                  onClick={startAsReceiver}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Start as Receiver (Student)
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Open this page in two browser windows/tabs. Click "Start as Sender" in one and "Start as Receiver" in the other.
              </p>
            </div>
          ) : (
            <button
              onClick={reset}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Reset Test
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold mb-3">Local Video</h2>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full bg-black rounded"
            />
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold mb-3">Remote Video</h2>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full bg-black rounded"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-semibold mb-3">Connection Logs</h2>
          <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className={`mb-1 ${
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'success' ? 'text-green-400' :
                  'text-gray-300'
                }`}>
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Testing Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Open this page in two separate browser windows or tabs</li>
            <li>In the first window, click "Start as Sender (Admin)"</li>
            <li>In the second window, click "Start as Receiver (Student)"</li>
            <li>Grant camera/microphone permissions when prompted</li>
            <li>Watch the connection logs and verify both videos appear</li>
            <li>Test ID: <code className="bg-blue-100 px-2 py-1 rounded">{testId}</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
