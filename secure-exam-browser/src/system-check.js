/**
 * System Check Script for Electron Secure Browser
 * Performs comprehensive system checks before exam starts
 */

class SystemCheck {
  constructor() {
    this.checks = {
      browser: { status: 'pending', message: '', details: '' },
      camera: { status: 'pending', message: '', details: '' },
      microphone: { status: 'pending', message: '', details: '' },
      network: { status: 'pending', message: '', details: '', downloadSpeed: 0, uploadSpeed: 0 },
      monitoring: { status: 'pending', message: '', details: '' },
      fullscreen: { status: 'pending', message: '', details: '' }
    };
    
    this.currentStep = 0;
    this.steps = [
      'Browser Compatibility',
      'Camera Access',
      'Microphone Access',
      'Network Speed',
      'Monitoring Features',
      'Fullscreen Capability'
    ];
    
    this.videoStream = null;
    this.audioStream = null;
  }

  async init() {
    console.log('🔍 Initializing system check...');
    this.renderProgressSteps();
    await this.runAllChecks();
    this.updateProceedButton();
  }

  renderProgressSteps() {
    const container = document.getElementById('progressSteps');
    if (!container) {
      console.error('Progress steps container not found');
      return;
    }
    container.innerHTML = this.steps.map((step, index) => `
      <div class="step">
        <div class="step-circle" id="step-${index}">
          ${index + 1}
        </div>
        <div class="step-label">${step}</div>
      </div>
    `).join('');
  }

  updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const percentage = (this.currentStep / (this.steps.length - 1)) * 100;
    progressFill.style.width = `${percentage}%`;
    
    // Update step circles
    for (let i = 0; i <= this.currentStep; i++) {
      const circle = document.getElementById(`step-${i}`);
      if (circle) {
        circle.classList.add('active');
        circle.textContent = '✓';
      }
    }
  }

  async runAllChecks() {
    await this.checkBrowser();
    await this.checkCamera();
    await this.checkMicrophone();
    await this.checkNetwork();
    await this.checkMonitoring();
    await this.checkFullscreen();
  }

  // 1. Browser Compatibility Check
  async checkBrowser() {
    this.currentStep = 0;
    this.updateProgress();
    
    try {
      const userAgent = navigator.userAgent;
      const isElectron = /Electron/.test(userAgent) || typeof window.secureExamAPI !== 'undefined';
      
      // Check required APIs
      const hasMediaDevices = !!navigator.mediaDevices;
      const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
      const hasLocalStorage = typeof localStorage !== 'undefined';
      const hasSessionStorage = typeof sessionStorage !== 'undefined';
      const hasSecureAPI = typeof window.secureExamAPI !== 'undefined';
      
      const allSupported = hasMediaDevices && hasGetUserMedia && hasLocalStorage && hasSessionStorage;
      
      this.updateCheck('browser', {
        status: allSupported && isElectron ? 'success' : 'error',
        message: isElectron ? 'ExamEye Secure Browser - All features supported' : 'Not running in secure browser',
        details: `Electron: ${isElectron ? '✓' : '✗'}, MediaDevices: ${hasMediaDevices ? '✓' : '✗'}, getUserMedia: ${hasGetUserMedia ? '✓' : '✗'}, Storage: ${hasLocalStorage ? '✓' : '✗'}, SecureAPI: ${hasSecureAPI ? '✓' : '✗'}`
      });
    } catch (error) {
      console.error('Browser check error:', error);
      this.updateCheck('browser', {
        status: 'error',
        message: 'Browser check failed',
        details: error.message
      });
    }
    
    this.renderResults();
  }

  // 2. Camera Check
  async checkCamera() {
    this.currentStep = 1;
    this.updateProgress();
    
    console.log('📹 Checking camera access...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      console.log('✅ Camera access granted');
      this.videoStream = stream;
      
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      this.updateCheck('camera', {
        status: 'success',
        message: 'Camera access granted',
        details: `Resolution: ${settings.width}x${settings.height}, Device: ${videoTrack.label}`
      });
    } catch (error) {
      console.error('❌ Camera access error:', error);
      this.updateCheck('camera', {
        status: 'error',
        message: 'Camera access denied',
        details: error.name === 'NotAllowedError' ? 'Permission denied by user' : error.message
      });
    }
    
    this.renderResults();
  }

  // 3. Microphone Check
  async checkMicrophone() {
    this.currentStep = 2;
    this.updateProgress();
    
    console.log('🎤 Checking microphone access...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioStream = stream;
      
      console.log('✅ Microphone access granted');
      
      const audioTrack = stream.getAudioTracks()[0];
      
      // Wait 2 seconds to detect audio, then update check
      setTimeout(() => {
        this.updateCheck('microphone', {
          status: 'success',
          message: 'Microphone access granted',
          details: `Device: ${audioTrack.label} - Speak to see live audio levels`
        });
        
        this.renderResults();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Microphone access error:', error);
      this.updateCheck('microphone', {
        status: 'error',
        message: 'Microphone access denied',
        details: error.name === 'NotAllowedError' ? 'Permission denied by user' : error.message
      });
      
      this.renderResults();
    }
  }

  // 4. Network Speed Check
  async checkNetwork() {
    this.currentStep = 3;
    this.updateProgress();
    
    console.log('🌐 Checking network speed...');
    
    try {
      // Check if online
      if (!navigator.onLine) {
        this.updateCheck('network', {
          status: 'error',
          message: 'No network connection',
          details: 'Device is offline',
          downloadSpeed: 0,
          uploadSpeed: 0
        });
        this.renderResults();
        return;
      }
      
      // Test download speed with a simpler approach
      console.log('📥 Testing download speed...');
      const downloadStartTime = performance.now();
      
      // Use a reliable CDN image
      const testUrls = [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        'https://picsum.photos/800/600',
        'https://via.placeholder.com/800x600.jpg'
      ];
      
      let downloadSpeedMbps = 0;
      let downloadSuccess = false;
      
      // Try each URL until one works
      for (const url of testUrls) {
        try {
          const response = await fetch(url + '?t=' + Date.now(), {
            method: 'GET',
            cache: 'no-cache'
          });
          
          if (response.ok) {
            const blob = await response.blob();
            const downloadEndTime = performance.now();
            const downloadDuration = (downloadEndTime - downloadStartTime) / 1000; // seconds
            const downloadSizeInBits = blob.size * 8;
            downloadSpeedMbps = (downloadSizeInBits / downloadDuration / 1000000).toFixed(2);
            downloadSuccess = true;
            console.log('✅ Download speed:', downloadSpeedMbps, 'Mbps');
            break;
          }
        } catch (e) {
          console.log('Failed with URL:', url, e.message);
          continue;
        }
      }
      
      if (!downloadSuccess) {
        throw new Error('All download test URLs failed');
      }
      
      // Estimate upload speed (since actual upload tests often fail due to CORS)
      // Use a simple calculation based on download speed
      const uploadSpeedMbps = (parseFloat(downloadSpeedMbps) * 0.4).toFixed(2); // Typically 40% of download
      
      console.log('📤 Estimated upload speed:', uploadSpeedMbps, 'Mbps');
      
      const avgSpeed = ((parseFloat(downloadSpeedMbps) + parseFloat(uploadSpeedMbps)) / 2).toFixed(2);
      const isGoodSpeed = avgSpeed > 1; // At least 1 Mbps average
      
      this.updateCheck('network', {
        status: isGoodSpeed ? 'success' : 'warning',
        message: isGoodSpeed ? 'Network speed is good' : 'Network speed is slow',
        details: `Download: ${downloadSpeedMbps} Mbps, Upload: ${uploadSpeedMbps} Mbps (estimated)`,
        downloadSpeed: parseFloat(downloadSpeedMbps),
        uploadSpeed: parseFloat(uploadSpeedMbps)
      });
    } catch (error) {
      console.error('❌ Network check error:', error);
      
      // Fallback: Just check if we can reach the internet
      try {
        await fetch('https://www.google.com/favicon.ico', { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        
        this.updateCheck('network', {
          status: 'warning',
          message: 'Network connected but speed test failed',
          details: 'Internet connection detected, but could not measure speed accurately',
          downloadSpeed: 0,
          uploadSpeed: 0
        });
      } catch (e) {
        this.updateCheck('network', {
          status: 'error',
          message: 'Network check failed',
          details: 'Could not connect to the internet',
          downloadSpeed: 0,
          uploadSpeed: 0
        });
      }
    }
    
    this.renderResults();
  }

  // 5. Monitoring Features Check
  async checkMonitoring() {
    this.currentStep = 4;
    this.updateProgress();
    
    try {
      const features = {
        visibilityAPI: typeof document.hidden !== 'undefined',
        pageVisibility: typeof document.addEventListener === 'function',
        clipboard: typeof navigator.clipboard !== 'undefined',
        fullscreenAPI: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        secureAPI: typeof window.secureExamAPI !== 'undefined'
      };
      
      const allSupported = Object.values(features).every(v => v);
      const supportedCount = Object.values(features).filter(v => v).length;
      
      this.updateCheck('monitoring', {
        status: allSupported ? 'success' : supportedCount >= 6 ? 'warning' : 'error',
        message: allSupported ? 'All monitoring features supported' : `${supportedCount}/8 features supported`,
        details: Object.entries(features).map(([key, val]) => `${key}: ${val ? '✓' : '✗'}`).join(', ')
      });
    } catch (error) {
      console.error('Monitoring check error:', error);
      this.updateCheck('monitoring', {
        status: 'error',
        message: 'Monitoring check failed',
        details: error.message
      });
    }
    
    this.renderResults();
  }

  // 6. Fullscreen Check
  async checkFullscreen() {
    this.currentStep = 5;
    this.updateProgress();
    
    try {
      const isSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled);
      
      this.updateCheck('fullscreen', {
        status: isSupported ? 'success' : 'warning',
        message: isSupported ? 'Fullscreen mode supported' : 'Fullscreen not supported',
        details: isSupported ? 'Fullscreen will be enabled during exam' : 'Browser does not support fullscreen API'
      });
    } catch (error) {
      this.updateCheck('fullscreen', {
        status: 'warning',
        message: 'Fullscreen check completed',
        details: 'Could not verify fullscreen support'
      });
    }
    
    this.renderResults();
  }

  updateCheck(checkName, data) {
    this.checks[checkName] = data;
  }

  renderResults() {
    const container = document.getElementById('checkResults');
    
    container.innerHTML = Object.entries(this.checks).map(([key, check]) => {
      const icon = this.getStatusIcon(check.status);
      const statusClass = check.status;
      
      return `
        <div class="check-item ${statusClass}">
          <div class="check-header">
            <div class="check-title">
              <span class="check-icon">${icon}</span>
              <h3 class="check-name">${this.formatCheckName(key)}</h3>
            </div>
            ${check.status === 'error' ? `
              <button class="retry-btn" onclick="systemCheck.retryCheck('${key}')">
                Retry
              </button>
            ` : ''}
          </div>
          <p class="check-message">${check.message}</p>
          <p class="check-details">${check.details}</p>
          
          ${key === 'camera' && check.status === 'success' ? `
            <div class="inline-preview">
              <video id="inlineCameraVideo" autoplay playsinline muted style="width: 100%; max-width: 400px; border-radius: 8px; margin-top: 1rem; background: #000;"></video>
            </div>
          ` : ''}
          
          ${key === 'microphone' && check.status === 'success' ? `
            <div class="inline-audio-visualizer">
              <div class="audio-bars" id="inlineAudioBars">
                ${Array(10).fill(0).map(() => '<div class="audio-bar"></div>').join('')}
              </div>
              <p id="inlineAudioNote" style="text-align: center; margin-top: 0.75rem; font-size: 0.875rem; color: #6b7280; font-weight: 500;">Speak to see audio levels</p>
            </div>
          ` : ''}
          
          ${key === 'network' && (check.downloadSpeed > 0 || check.uploadSpeed > 0) ? `
            <div class="speed-bars">
              <div class="speed-bar">
                <div class="speed-label">📥 Download Speed: ${check.downloadSpeed} Mbps</div>
                <div class="speed-progress">
                  <div class="speed-fill" style="width: ${Math.min((check.downloadSpeed / 10) * 100, 100)}%; background: ${check.downloadSpeed > 5 ? '#10b981' : check.downloadSpeed > 1 ? '#f59e0b' : '#dc2626'};"></div>
                </div>
              </div>
              <div class="speed-bar">
                <div class="speed-label">📤 Upload Speed: ${check.uploadSpeed} Mbps</div>
                <div class="speed-progress">
                  <div class="speed-fill" style="width: ${Math.min((check.uploadSpeed / 10) * 100, 100)}%; background: ${check.uploadSpeed > 5 ? '#10b981' : check.uploadSpeed > 1 ? '#f59e0b' : '#dc2626'};"></div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
    // After rendering, attach camera stream if available
    if (this.videoStream && this.checks.camera.status === 'success') {
      const inlineVideo = document.getElementById('inlineCameraVideo');
      if (inlineVideo) {
        inlineVideo.srcObject = this.videoStream;
      }
    }
    
    // After rendering, start audio visualizer if available
    if (this.audioStream && this.checks.microphone.status === 'success') {
      this.startInlineAudioVisualizer();
    }
    
    this.updateProceedButton();
  }
  
  startInlineAudioVisualizer() {
    // Stop any existing visualizer
    if (this.audioVisualizerInterval) {
      clearInterval(this.audioVisualizerInterval);
    }
    
    if (!this.audioStream) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(this.audioStream);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const audioBars = document.querySelectorAll('#inlineAudioBars .audio-bar');
      const audioNote = document.getElementById('inlineAudioNote');
      
      if (!audioBars.length) return;
      
      let detectionCount = 0;
      
      const visualizeAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const level = Math.max(...dataArray);
        
        // Update bars based on audio level
        audioBars.forEach((bar, index) => {
          const threshold = (index + 1) * 20;
          if (level > threshold) {
            const height = Math.min((level / 255) * 70, 70);
            bar.style.height = `${height}px`;
            bar.classList.add('active');
            detectionCount++;
          } else {
            bar.style.height = '8px';
            bar.classList.remove('active');
          }
        });
        
        // Update note based on detection
        if (audioNote) {
          if (level > 50) {
            audioNote.innerHTML = '🎤 <span style="color: #059669; font-weight: 600;">Audio detected!</span> Your microphone is working.';
          } else if (detectionCount > 0) {
            audioNote.innerHTML = '🎤 <span style="color: #f59e0b;">Speak louder</span> to test your microphone';
          } else {
            audioNote.innerHTML = 'Speak to see audio levels';
            audioNote.style.color = '#6b7280';
          }
        }
      };
      
      // Run visualizer continuously
      this.audioVisualizerInterval = setInterval(visualizeAudio, 50);
      this.audioContext = audioContext;
      
    } catch (error) {
      console.error('Failed to start audio visualizer:', error);
    }
  }

  formatCheckName(key) {
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
  }

  getStatusIcon(status) {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '⏳';
    }
  }

  updateProceedButton() {
    const proceedBtn = document.getElementById('proceedBtn');
    const allChecks = Object.values(this.checks);
    const allPassed = allChecks.every(check => check.status === 'success');
    const anyFailed = allChecks.some(check => check.status === 'error');
    const allCompleted = allChecks.every(check => check.status !== 'pending');
    
    if (!allCompleted) {
      proceedBtn.className = 'btn btn-disabled';
      proceedBtn.textContent = '⏳ Checking...';
      proceedBtn.disabled = true;
    } else if (allPassed) {
      proceedBtn.className = 'btn btn-success';
      proceedBtn.textContent = '✅ Proceed to Exam';
      proceedBtn.disabled = false;
      proceedBtn.onclick = () => this.proceedToExam();
    } else if (anyFailed) {
      proceedBtn.className = 'btn btn-disabled';
      proceedBtn.textContent = '❌ Fix Issues to Proceed';
      proceedBtn.disabled = true;
    } else {
      proceedBtn.className = 'btn btn-warning';
      proceedBtn.textContent = '⚠️ Proceed with Warnings';
      proceedBtn.disabled = false;
      proceedBtn.onclick = () => this.proceedToExam();
    }
  }

  async retryCheck(checkName) {
    this.updateCheck(checkName, { status: 'pending', message: 'Checking...', details: '' });
    this.renderResults();
    
    switch (checkName) {
      case 'browser': await this.checkBrowser(); break;
      case 'camera': await this.checkCamera(); break;
      case 'microphone': await this.checkMicrophone(); break;
      case 'network': await this.checkNetwork(); break;
      case 'monitoring': await this.checkMonitoring(); break;
      case 'fullscreen': await this.checkFullscreen(); break;
    }
  }

  async proceedToExam() {
    console.log('📤 Sending system check results...');
    
    // Clean up streams
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
    }
    
    // Send results to main process
    const results = {
      passed: Object.values(this.checks).every(check => check.status === 'success' || check.status === 'warning'),
      checks: this.checks,
      timestamp: new Date().toISOString()
    };
    
    console.log('System check results:', results);
    
    try {
      if (window.secureExamAPI && window.secureExamAPI.systemCheckComplete) {
        await window.secureExamAPI.systemCheckComplete(results);
        console.log('✅ Results sent successfully');
      } else {
        console.error('❌ secureExamAPI not available');
        // Fallback: navigate back manually
        window.location.href = './pages/student-login.html';
      }
    } catch (error) {
      console.error('Failed to send system check results:', error);
      // Fallback: navigate back manually
      window.location.href = './pages/student-login.html';
    }
  }

  cleanup() {
    // Stop audio visualizer
    if (this.audioVisualizerInterval) {
      clearInterval(this.audioVisualizerInterval);
      this.audioVisualizerInterval = null;
    }
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Stop video stream
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    
    // Stop audio stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
  }
}

// Global function for retry buttons
function runChecksAgain() {
  window.location.reload();
}

// Global function to go back to login
async function goBackToLogin() {
  // Clean up streams
  if (systemCheck) {
    systemCheck.cleanup();
  }
  
  // Navigate back to login
  try {
    if (typeof ipcRenderer !== 'undefined') {
      // In Electron, load the login page
      window.location.href = './pages/student-login.html';
    } else {
      // In web browser
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Failed to navigate back:', error);
    window.history.back();
  }
}

// Initialize system check when page loads
let systemCheck;
window.addEventListener('DOMContentLoaded', () => {
  systemCheck = new SystemCheck();
  systemCheck.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (systemCheck) {
    systemCheck.cleanup();
  }
});
