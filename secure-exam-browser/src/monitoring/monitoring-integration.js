/**
 * Monitoring Integration for Secure Exam Browser
 * Connects AI engine with backend monitoring service
 */

const { ipcRenderer } = require('electron');

class MonitoringIntegration {
  constructor(examId, token) {
    this.examId = examId;
    this.token = token;
    this.isActive = false;
    this.apiBaseUrl = process.env.API_URL || 'https://exameye-peach.vercel.app';
  }

  async start() {
    console.log('🔍 Starting monitoring integration...');
    this.isActive = true;

    // Start activity tracking
    await this.startActivity();

    // Listen for AI events from the AI engine
    this.setupAIEventListeners();

    // Setup camera/microphone monitoring
    this.setupMediaMonitoring();

    // Setup periodic heartbeat
    this.startHeartbeat();
  }

  async startActivity() {
    try {
      const ipAddress = await this.getIPAddress();
      const userAgent = navigator.userAgent;

      const response = await fetch(`${this.apiBaseUrl}/api/student/activity/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          examId: this.examId,
          systemChecks: {
            camera: false,
            microphone: false,
            network: navigator.onLine,
            fullscreen: !!document.fullscreenElement,
            secureBrowser: true
          },
          ipAddress,
          userAgent
        })
      });

      if (response.ok) {
        console.log('✅ Activity tracking started');
      }
    } catch (error) {
      console.error('Failed to start activity:', error);
    }
  }

  async getIPAddress() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  setupAIEventListeners() {
    // Listen for AI anomaly detections
    ipcRenderer.on('ai-anomaly-detected', (event, data) => {
      this.logActivity({
        type: 'ai_anomaly_detected',
        description: `AI detected: ${data.anomalyType}`,
        details: data.details || '',
        severity: data.severity || 'medium',
        metadata: data
      });
    });

    // Listen for face detection events
    ipcRenderer.on('face-detection-result', (event, data) => {
      if (data.faceCount === 0) {
        this.logActivity({
          type: 'no_face',
          description: 'No face detected in camera',
          details: `Duration: ${data.duration || 0}s`,
          severity: 'medium',
          metadata: data
        });
      } else if (data.faceCount > 1) {
        this.logActivity({
          type: 'multiple_faces',
          description: 'Multiple faces detected',
          details: `Count: ${data.faceCount} faces`,
          severity: 'high',
          metadata: data
        });
      }
    });

    // Listen for behavior anomalies
    ipcRenderer.on('behavior-anomaly', (event, data) => {
      const severityMap = {
        rapid_clicking: 'medium',
        copy_paste_detected: 'high',
        unusual_typing_pattern: 'medium',
        suspicious_mouse_movement: 'low'
      };

      this.logActivity({
        type: 'suspicious_behavior',
        description: `Suspicious behavior: ${data.type}`,
        details: data.description || '',
        severity: severityMap[data.type] || 'medium',
        metadata: data
      });
    });

    // Listen for tab/window events
    ipcRenderer.on('window-blur', () => {
      this.logActivity({
        type: 'window_blur',
        description: 'Window lost focus',
        details: 'Student may have switched windows',
        severity: 'high'
      });
    });

    ipcRenderer.on('tab-switch', (event, data) => {
      this.logActivity({
        type: 'tab_switch',
        description: 'Tab switch detected',
        details: `Duration: ${data.duration || 0}s`,
        severity: 'high'
      });
    });
  }

  setupMediaMonitoring() {
    // Monitor camera status
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        this.updateSystemCheck('camera', true);
        
        // Monitor if camera gets disabled
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          this.updateSystemCheck('camera', false);
        });
      })
      .catch(() => {
        this.updateSystemCheck('camera', false);
      });

    // Monitor microphone status
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.updateSystemCheck('microphone', true);
        
        // Monitor if microphone gets disabled
        stream.getAudioTracks()[0].addEventListener('ended', () => {
          this.updateSystemCheck('microphone', false);
        });
      })
      .catch(() => {
        this.updateSystemCheck('microphone', false);
      });

    // Monitor fullscreen
    document.addEventListener('fullscreenchange', () => {
      const isFullscreen = !!document.fullscreenElement;
      this.updateSystemCheck('fullscreen', isFullscreen);
      
      if (!isFullscreen) {
        this.logActivity({
          type: 'fullscreen_exit',
          description: 'Student exited fullscreen mode',
          details: 'Fullscreen requirement violated',
          severity: 'high'
        });
      }
    });

    // Monitor network
    window.addEventListener('offline', () => {
      this.updateSystemCheck('network', false);
      this.logActivity({
        type: 'network_disconnected',
        description: 'Network connection lost',
        details: 'Student went offline',
        severity: 'critical'
      });
    });

    window.addEventListener('online', () => {
      this.updateSystemCheck('network', true);
      this.logActivity({
        type: 'network_reconnected',
        description: 'Network connection restored',
        details: 'Student back online',
        severity: 'low'
      });
    });
  }

  startHeartbeat() {
    // Send heartbeat every 10 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 10000);
  }

  async sendHeartbeat() {
    if (!this.isActive) return;

    try {
      await fetch(`${this.apiBaseUrl}/api/student/activity/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          examId: this.examId,
          systemChecks: {
            camera: this.cameraEnabled || false,
            microphone: this.microphoneEnabled || false,
            network: navigator.onLine,
            fullscreen: !!document.fullscreenElement,
            secureBrowser: true
          }
        })
      });
    } catch (error) {
      console.error('Heartbeat failed:', error);
    }
  }

  async updateSystemCheck(check, value) {
    this[`${check}Enabled`] = value;

    const checkNames = {
      camera: 'Camera',
      microphone: 'Microphone',
      fullscreen: 'Fullscreen',
      network: 'Network'
    };

    const action = value ? 'enabled' : 'disabled';
    await this.logActivity({
      type: `${check}_${action}`,
      description: `${checkNames[check]} ${action}`,
      details: `${checkNames[check]} ${value ? 'access granted' : 'access revoked'}`,
      severity: value ? 'low' : 'high'
    });
  }

  async logActivity(logData) {
    if (!this.isActive) return;

    try {
      await fetch(`${this.apiBaseUrl}/api/student/activity/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          examId: this.examId,
          ...logData
        })
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  async stop() {
    this.isActive = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Log exam completion
    await this.logActivity({
      type: 'exam_completed',
      description: 'Student completed the exam',
      details: 'Exam session ended',
      severity: 'low'
    });

    console.log('🛑 Monitoring integration stopped');
  }
}

module.exports = MonitoringIntegration;
