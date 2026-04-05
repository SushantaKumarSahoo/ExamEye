/**
 * Client-side Monitoring Service
 * Sends monitoring data from browser to backend
 */

class MonitoringService {
  constructor(examId, token) {
    this.examId = examId;
    this.token = token;
    this.isActive = false;
    this.updateInterval = null;
    this.logQueue = [];
    this.maxQueueSize = 50;
    
    this.systemChecks = {
      camera: false,
      microphone: false,
      network: true,
      fullscreen: false,
      secureBrowser: false
    };
  }

  async start() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Get IP and user agent
    const ipAddress = await this.getIPAddress();
    const userAgent = navigator.userAgent;
    
    // Start activity tracking
    try {
      const response = await fetch('/api/student/activity/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          examId: this.examId,
          systemChecks: this.systemChecks,
          ipAddress,
          userAgent
        })
      });
      
      if (response.ok) {
        console.log('✅ Monitoring started');
        this.startPeriodicUpdates();
        this.startEventListeners();
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
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

  startPeriodicUpdates() {
    // Send updates every 10 seconds
    this.updateInterval = setInterval(() => {
      this.sendUpdate();
      this.flushLogQueue();
    }, 10000);
  }

  startEventListeners() {
    // Tab visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.logEvent('tab_switch', 'Student switched to another tab', 'Tab became hidden', 'high');
      }
    });

    // Window blur
    window.addEventListener('blur', () => {
      this.logEvent('window_blur', 'Window lost focus', 'Student may have switched windows', 'medium');
    });

    // Fullscreen change
    document.addEventListener('fullscreenchange', () => {
      const isFullscreen = !!document.fullscreenElement;
      this.systemChecks.fullscreen = isFullscreen;
      
      if (!isFullscreen) {
        this.logEvent('fullscreen_exit', 'Student exited fullscreen mode', 'Fullscreen requirement violated', 'high');
      }
    });

    // Copy event
    document.addEventListener('copy', (e) => {
      const selectedText = window.getSelection().toString();
      if (selectedText.length > 10) {
        this.logEvent('copy_paste_detected', 'Copy action detected', `Copied text length: ${selectedText.length}`, 'medium');
      }
    });

    // Paste event
    document.addEventListener('paste', (e) => {
      this.logEvent('copy_paste_detected', 'Paste action detected', 'Student pasted content', 'high');
    });

    // Right click
    document.addEventListener('contextmenu', (e) => {
      this.logEvent('right_click_detected', 'Right click detected', `Target: ${e.target.tagName}`, 'low');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Detect common shortcuts
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (['c', 'v', 'x', 'a', 'f', 'p'].includes(key)) {
          this.logEvent('keyboard_shortcut', `Keyboard shortcut detected: Ctrl+${key.toUpperCase()}`, '', 'medium');
        }
      }
      
      // F12 or Ctrl+Shift+I (DevTools)
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        this.logEvent('browser_devtools_opened', 'Attempt to open browser DevTools', 'F12 or Ctrl+Shift+I pressed', 'critical');
      }
    });

    // Network status
    window.addEventListener('offline', () => {
      this.systemChecks.network = false;
      this.logEvent('network_disconnected', 'Network connection lost', 'Student went offline', 'critical');
    });

    window.addEventListener('online', () => {
      this.systemChecks.network = true;
      this.logEvent('network_reconnected', 'Network connection restored', 'Student back online', 'low');
    });
  }

  async sendUpdate() {
    if (!this.isActive) return;
    
    try {
      await fetch('/api/student/activity/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          examId: this.examId,
          systemChecks: this.systemChecks
        })
      });
    } catch (error) {
      console.error('Failed to send update:', error);
    }
  }

  logEvent(type, description, details, severity = 'low', metadata = {}) {
    this.logQueue.push({
      type,
      description,
      details,
      severity,
      metadata
    });

    // If queue is full or severity is critical, flush immediately
    if (this.logQueue.length >= this.maxQueueSize || severity === 'critical') {
      this.flushLogQueue();
    }
  }

  async flushLogQueue() {
    if (this.logQueue.length === 0) return;
    
    const logsToSend = [...this.logQueue];
    this.logQueue = [];
    
    try {
      // Send logs in batch
      for (const log of logsToSend) {
        await fetch('/api/student/activity/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({
            examId: this.examId,
            ...log
          })
        });
      }
    } catch (error) {
      console.error('Failed to send logs:', error);
      // Re-add failed logs to queue
      this.logQueue.unshift(...logsToSend);
    }
  }

  updateSystemCheck(check, value) {
    this.systemChecks[check] = value;
    
    // Log system check changes
    const checkNames = {
      camera: 'Camera',
      microphone: 'Microphone',
      fullscreen: 'Fullscreen',
      secureBrowser: 'Secure Browser'
    };
    
    const action = value ? 'enabled' : 'disabled';
    this.logEvent(
      `${check}_${action}`,
      `${checkNames[check]} ${action}`,
      `${checkNames[check]} access ${value ? 'granted' : 'revoked'}`,
      value ? 'low' : 'high'
    );
  }

  async stop() {
    this.isActive = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Flush remaining logs
    await this.flushLogQueue();
    
    // Log exam completion
    await fetch('/api/student/activity/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        examId: this.examId,
        type: 'exam_completed',
        description: 'Student completed the exam',
        details: 'Exam session ended',
        severity: 'low'
      })
    });
  }

  // AI Integration methods
  logAIAnomaly(anomalyType, details, severity = 'medium') {
    this.logEvent(
      'ai_anomaly_detected',
      `AI detected: ${anomalyType}`,
      details,
      severity,
      { anomalyType }
    );
  }

  logFaceDetection(faceCount, details) {
    if (faceCount === 0) {
      this.logEvent('no_face', 'No face detected in camera', details, 'medium');
    } else if (faceCount > 1) {
      this.logEvent('multiple_faces', 'Multiple faces detected', `Count: ${faceCount} faces`, 'high');
    }
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.MonitoringService = MonitoringService;
}

export default MonitoringService;
