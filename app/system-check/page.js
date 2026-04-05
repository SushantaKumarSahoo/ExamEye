'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function SystemCheckPage() {
  const router = useRouter();
  const [checks, setChecks] = useState({
    browser: { status: 'pending', message: '', details: '' },
    camera: { status: 'pending', message: '', details: '' },
    microphone: { status: 'pending', message: '', details: '' },
    network: { status: 'pending', message: '', details: '', speed: 0 },
    monitoring: { status: 'pending', message: '', details: '' },
    fullscreen: { status: 'pending', message: '', details: '' }
  });
  
  const [overallStatus, setOverallStatus] = useState('checking');
  const [currentStep, setCurrentStep] = useState(0);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  const steps = [
    'Browser Compatibility',
    'Camera Access',
    'Microphone Access',
    'Network Speed',
    'Monitoring Features',
    'Fullscreen Capability'
  ];

  useEffect(() => {
    runSystemChecks();
    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const runSystemChecks = async () => {
    await checkBrowser();
    await checkCamera();
    await checkMicrophone();
    await checkNetwork();
    await checkMonitoring();
    await checkFullscreen();
    
    // Determine overall status
    const allChecks = Object.values(checks);
    const allPassed = allChecks.every(check => check.status === 'success');
    const anyFailed = allChecks.some(check => check.status === 'error');
    
    setOverallStatus(anyFailed ? 'failed' : allPassed ? 'passed' : 'warning');
  };

  // 1. Browser Compatibility Check
  const checkBrowser = async () => {
    setCurrentStep(0);
    
    try {
      const userAgent = navigator.userAgent;
      const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
      const isEdge = /Edg/.test(userAgent);
      const isFirefox = /Firefox/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      
      const browserName = isChrome ? 'Chrome' : isEdge ? 'Edge' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Unknown';
      
      // Check required APIs
      const hasMediaDevices = !!navigator.mediaDevices;
      const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
      const hasLocalStorage = typeof localStorage !== 'undefined';
      const hasSessionStorage = typeof sessionStorage !== 'undefined';
      const hasWebRTC = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection);
      
      const allSupported = hasMediaDevices && hasGetUserMedia && hasLocalStorage && hasSessionStorage;
      
      updateCheck('browser', {
        status: allSupported ? 'success' : 'error',
        message: allSupported ? `${browserName} - All features supported` : 'Browser not fully supported',
        details: `MediaDevices: ${hasMediaDevices ? '✓' : '✗'}, getUserMedia: ${hasGetUserMedia ? '✓' : '✗'}, Storage: ${hasLocalStorage ? '✓' : '✗'}, WebRTC: ${hasWebRTC ? '✓' : '✗'}`
      });
    } catch (error) {
      updateCheck('browser', {
        status: 'error',
        message: 'Browser check failed',
        details: error.message
      });
    }
  };

  // 2. Camera Check
  const checkCamera = async () => {
    setCurrentStep(1);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      updateCheck('camera', {
        status: 'success',
        message: 'Camera access granted',
        details: `Resolution: ${settings.width}x${settings.height}, Device: ${videoTrack.label}`
      });
    } catch (error) {
      updateCheck('camera', {
        status: 'error',
        message: 'Camera access denied',
        details: error.name === 'NotAllowedError' ? 'Permission denied by user' : error.message
      });
    }
  };

  // 3. Microphone Check
  const checkMicrophone = async () => {
    setCurrentStep(2);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioTrack = stream.getAudioTracks()[0];
      
      // Test audio level
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Check audio level for 2 seconds
      let maxLevel = 0;
      const checkAudio = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const level = Math.max(...dataArray);
        maxLevel = Math.max(maxLevel, level);
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkAudio);
        audioContext.close();
        stream.getTracks().forEach(track => track.stop());
        
        updateCheck('microphone', {
          status: 'success',
          message: 'Microphone access granted',
          details: `Device: ${audioTrack.label}, Audio level: ${maxLevel > 0 ? 'Detected' : 'Silent (speak to test)'}`
        });
      }, 2000);
      
    } catch (error) {
      updateCheck('microphone', {
        status: 'error',
        message: 'Microphone access denied',
        details: error.name === 'NotAllowedError' ? 'Permission denied by user' : error.message
      });
    }
  };

  // 4. Network Speed Check
  const checkNetwork = async () => {
    setCurrentStep(3);
    
    try {
      const startTime = Date.now();
      
      // Test download speed with a small image
      const imageUrl = 'https://via.placeholder.com/500x500.jpg';
      const response = await fetch(imageUrl + '?t=' + Date.now());
      const blob = await response.blob();
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const sizeInBits = blob.size * 8;
      const speedMbps = (sizeInBits / duration / 1000000).toFixed(2);
      
      // Check connection type
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const connectionType = connection?.effectiveType || 'unknown';
      
      const isGoodSpeed = speedMbps > 1; // At least 1 Mbps
      
      updateCheck('network', {
        status: isGoodSpeed ? 'success' : 'warning',
        message: isGoodSpeed ? 'Network speed is good' : 'Network speed is slow',
        details: `Speed: ${speedMbps} Mbps, Type: ${connectionType}`,
        speed: parseFloat(speedMbps)
      });
    } catch (error) {
      updateCheck('network', {
        status: 'warning',
        message: 'Network check completed with warnings',
        details: 'Could not measure speed accurately',
        speed: 0
      });
    }
  };

  // 5. Monitoring Features Check
  const checkMonitoring = async () => {
    setCurrentStep(4);
    
    try {
      const features = {
        visibilityAPI: typeof document.hidden !== 'undefined',
        pageVisibility: typeof document.addEventListener === 'function',
        clipboard: typeof navigator.clipboard !== 'undefined',
        fullscreenAPI: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        canvas: !!document.createElement('canvas').getContext
      };
      
      const allSupported = Object.values(features).every(v => v);
      const supportedCount = Object.values(features).filter(v => v).length;
      
      updateCheck('monitoring', {
        status: allSupported ? 'success' : supportedCount >= 6 ? 'warning' : 'error',
        message: allSupported ? 'All monitoring features supported' : `${supportedCount}/8 features supported`,
        details: Object.entries(features).map(([key, val]) => `${key}: ${val ? '✓' : '✗'}`).join(', ')
      });
    } catch (error) {
      updateCheck('monitoring', {
        status: 'error',
        message: 'Monitoring check failed',
        details: error.message
      });
    }
  };

  // 6. Fullscreen Check
  const checkFullscreen = async () => {
    setCurrentStep(5);
    
    try {
      const isSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled);
      
      updateCheck('fullscreen', {
        status: isSupported ? 'success' : 'warning',
        message: isSupported ? 'Fullscreen mode supported' : 'Fullscreen not supported',
        details: isSupported ? 'Press F11 or click fullscreen button during exam' : 'Browser does not support fullscreen API'
      });
    } catch (error) {
      updateCheck('fullscreen', {
        status: 'warning',
        message: 'Fullscreen check completed',
        details: 'Could not verify fullscreen support'
      });
    }
  };

  const updateCheck = (checkName, data) => {
    setChecks(prev => ({
      ...prev,
      [checkName]: data
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '⏳';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#dc2626';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const retryCheck = async (checkName) => {
    switch (checkName) {
      case 'browser': await checkBrowser(); break;
      case 'camera': await checkCamera(); break;
      case 'microphone': await checkMicrophone(); break;
      case 'network': await checkNetwork(); break;
      case 'monitoring': await checkMonitoring(); break;
      case 'fullscreen': await checkFullscreen(); break;
    }
  };

  const proceedToExam = () => {
    // In production, this would navigate to the actual exam
    router.push('/test-monitoring');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem', color: 'white' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            🔍 System Check
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
            Verifying your system is ready for the exam
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            {steps.map((step, index) => (
              <div key={index} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: index <= currentStep ? '#10b981' : '#e5e7eb',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  fontWeight: 'bold',
                  transition: 'all 0.3s'
                }}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#6b7280' }}>
                  {step}
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: '#10b981',
              width: `${(currentStep / (steps.length - 1)) * 100}%`,
              transition: 'width 0.3s'
            }}></div>
          </div>
        </div>

        {/* Check Results */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            System Check Results
          </h2>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(checks).map(([key, check]) => (
              <div key={key} style={{
                padding: '1.5rem',
                border: `2px solid ${getStatusColor(check.status)}`,
                borderRadius: '8px',
                background: check.status === 'pending' ? '#f9fafb' : 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{getStatusIcon(check.status)}</span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                    </div>
                    <p style={{ color: '#374151', marginBottom: '0.25rem' }}>{check.message}</p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{check.details}</p>
                    {key === 'network' && check.speed > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Download Speed
                        </div>
                        <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            background: check.speed > 5 ? '#10b981' : check.speed > 1 ? '#f59e0b' : '#dc2626',
                            width: `${Math.min((check.speed / 10) * 100, 100)}%`,
                            transition: 'width 0.3s'
                          }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                  {check.status === 'error' && (
                    <button
                      onClick={() => retryCheck(key)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Camera Preview */}
        {checks.camera.status === 'success' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              📹 Camera Preview
            </h3>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                maxWidth: '640px',
                borderRadius: '8px',
                background: '#000',
                display: 'block',
                margin: '0 auto'
              }}
            />
            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Make sure you can see yourself clearly
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '1rem 2rem',
              background: 'white',
              color: '#374151',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 Run Checks Again
          </button>
          
          {overallStatus === 'passed' && (
            <button
              onClick={proceedToExam}
              style={{
                padding: '1rem 2rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)'
              }}
            >
              ✅ Proceed to Exam
            </button>
          )}
          
          {overallStatus === 'warning' && (
            <button
              onClick={proceedToExam}
              style={{
                padding: '1rem 2rem',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ⚠️ Proceed with Warnings
            </button>
          )}
          
          {overallStatus === 'failed' && (
            <button
              disabled
              style={{
                padding: '1rem 2rem',
                background: '#d1d5db',
                color: '#6b7280',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'not-allowed'
              }}
            >
              ❌ Fix Issues to Proceed
            </button>
          )}
        </div>

        {/* Help Section */}
        <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: '12px', padding: '1.5rem', marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
            💡 Troubleshooting Tips
          </h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', lineHeight: '1.8', color: '#374151' }}>
            <li><strong>Camera/Microphone denied:</strong> Click the camera icon in your browser's address bar and allow permissions</li>
            <li><strong>Slow network:</strong> Close other tabs/applications using internet, move closer to WiFi router</li>
            <li><strong>Browser not supported:</strong> Use latest Chrome, Edge, or Firefox browser</li>
            <li><strong>Fullscreen issues:</strong> Press F11 key or use browser's fullscreen option</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
