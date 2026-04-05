'use client';

import { useState, useEffect, useRef } from 'react';

export default function AdminWebRTCViewer() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [connectionState, setConnectionState] = useState('new');
  const [logs, setLogs] = useState([]);
  
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  // Poll for available students
  useEffect(() => {
    const pollStudents = async () => {
      try {
        const response = await fetch('/api/webrtc/available-students');
        if (response.ok) {
          const data = await response.json();
          setStudents(data.students || []);
        }
      } catch (error) {
        console.error('Failed to poll students:', error);
      }
    };

    pollStudents();
    const interval = setInterval(pollStudents, 3000);
    return () => clearInterval(interval);
  }, []);

  const sendSignal = async (type, signal, studentId, examId) => {
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
      addLog(`Sent ${type} signal`, 'success');
    } catch (error) {
      addLog(`Failed to send signal: ${error.message}`, 'error');
    }
  };

  const pollSignals = async (studentId, examId) => {
    try {
      const response = await fetch(`/api/webrtc/signal?userId=admin-${examId}&examId=${examId}`);
      const data = await response.json();
      
      if (data.signals && data.signals.length > 0) {
        for (const { type, signal } of data.signals) {
          addLog(`Received ${type} signal`, 'info');
          
          if (type === 'offer') {
            await handleOffer(signal, studentId, examId);
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
      if (event.candidate && selectedStudent) {
        addLog('ICE candidate generated', 'info');
        sendSignal('ice-candidate', event.candidate, selectedStudent.studentId, selectedStudent.examId);
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

  const handleOffer = async (offer, studentId, examId) => {
    try {
      addLog('Processing offer...', 'info');
      
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal('answer', answer, studentId, examId);
      
      addLog('Answer sent to student', 'success');
    } catch (error) {
      addLog(`Handle offer error: ${error.message}`, 'error');
    }
  };

  const handleIceCandidate = async (candidate) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        addLog('ICE candidate added', 'info');
      }
    } catch (error) {
      addLog(`ICE candidate error: ${error.message}`, 'error');
    }
  };

  const connectToStudent = (student) => {
    setSelectedStudent(student);
    setLogs([]);
    addLog(`Connecting to ${student.studentId}...`, 'info');
    
    // Start polling for offers
    pollingIntervalRef.current = setInterval(() => {
      pollSignals(student.studentId, student.examId);
    }, 1000);
  };

  const disconnect = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setSelectedStudent(null);
    setConnectionState('new');
    addLog('Disconnected', 'info');
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">Admin WebRTC Viewer</h1>
          <p className="text-gray-600 mb-4">View student video streams in real-time</p>
          
          <div className="flex items-center gap-4 mb-6">
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
            
            {selectedStudent && (
              <div className="flex gap-2">
                <span className="text-sm font-medium">Student:</span>
                <span className="text-sm font-semibold text-blue-600">{selectedStudent.studentId}</span>
              </div>
            )}
          </div>

          {!selectedStudent ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Available Students</h2>
              {students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg mb-2">No students streaming yet</p>
                  <p className="text-sm">Students will appear here when they start WebRTC test</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map((student, idx) => (
                    <div
                      key={idx}
                      className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition"
                      onClick={() => connectToStudent(student)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">👤</span>
                        <span className="font-semibold">{student.studentId}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>Exam: {student.examId}</div>
                        <div>Status: <span className="text-green-600">Ready</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={disconnect}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Disconnect
            </button>
          )}
        </div>

        {selectedStudent && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Student Video Feed</h2>
              <div className="relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full bg-black rounded-lg"
                  style={{ minHeight: '400px' }}
                />
                {connectionState !== 'connected' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg">
                    <div className="text-center text-white">
                      <div className="text-4xl mb-4">
                        {connectionState === 'connecting' ? '⏳' : '📹'}
                      </div>
                      <p className="text-lg">
                        {connectionState === 'connecting' ? 'Connecting...' : 'Waiting for video stream...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Connection Logs</h2>
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
          </>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Student opens Electron browser and clicks "Test WebRTC Streaming"</li>
            <li>Student grants camera/microphone permissions</li>
            <li>Student appears in the "Available Students" list above</li>
            <li>Click on a student to connect and view their video</li>
            <li>Video will appear once connection is established</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
