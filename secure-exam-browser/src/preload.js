const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Send messages to main process
  send: (channel, data) => {
    const validChannels = ['page-hidden', 'page-visible', 'window-blur', 'window-focus', 'exam-started', 'exam-ended'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Receive messages from main process
  on: (channel, callback) => {
    const validChannels = ['focus-lost', 'focus-regained', 'terminate-exam', 'close-attempt'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  // Remove listeners
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('secureExamAPI', {
  // Exam control functions
  startExam: (examData) => ipcRenderer.invoke('start-exam', examData),
  endExam: () => ipcRenderer.invoke('end-exam'),
  getExamStatus: () => ipcRenderer.invoke('get-exam-status'),
  
  // System check functions
  navigateToSystemCheck: () => ipcRenderer.invoke('navigate-to-system-check'),
  systemCheckComplete: (results) => ipcRenderer.invoke('system-check-complete', results),
  
  // Navigation functions
  navigateToExam: (url) => ipcRenderer.invoke('navigate-to-exam', url),
  
  // Machine information
  getMachineInfo: () => ipcRenderer.invoke('get-machine-info'),
  
  // Developer tools
  toggleDevTools: () => ipcRenderer.invoke('toggle-devtools'),
  
  // Security monitoring
  getSuspiciousActivities: () => ipcRenderer.invoke('get-suspicious-activities'),
  getNetworkStats: () => ipcRenderer.invoke('get-network-stats'),
  getProcessStats: () => ipcRenderer.invoke('get-process-stats'),
  performProcessScan: () => ipcRenderer.invoke('perform-process-scan'),
  exportSecurityLogs: () => ipcRenderer.invoke('export-security-logs'),
  
  // Event listeners
  onSuspiciousActivity: (callback) => {
    ipcRenderer.on('suspicious-activity', (event, activity) => callback(activity));
  },
  
  onWarning: (callback) => {
    ipcRenderer.on('show-warning', (event, warning) => callback(warning));
  },
  
  onSystemCheckPassed: (callback) => {
    ipcRenderer.on('system-check-passed', (event, results) => callback(results));
  },
  
  onSystemCheckFailed: (callback) => {
    ipcRenderer.on('system-check-failed', (event, results) => callback(results));
  },
  
  // Remove event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Disable certain browser features
window.addEventListener('DOMContentLoaded', () => {
  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable text selection in exam mode
  document.addEventListener('selectstart', (e) => {
    if (window.examModeActive) {
      e.preventDefault();
      return false;
    }
  });

  // Disable drag and drop
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable F12 and other developer tools shortcuts
  document.addEventListener('keydown', (e) => {
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')) {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X in exam mode
    if (window.examModeActive && e.ctrlKey && 
        ['a', 'c', 'v', 'x', 's', 'p'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return false;
    }

    // Disable Alt+Tab, Ctrl+Tab
    if ((e.altKey && e.key === 'Tab') || (e.ctrlKey && e.key === 'Tab')) {
      e.preventDefault();
      return false;
    }
  });

  // Monitor page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.examModeActive) {
      console.warn('Page became hidden during exam');
    }
  });

  // Monitor window blur/focus
  window.addEventListener('blur', () => {
    if (window.examModeActive) {
      console.warn('Window lost focus during exam');
    }
  });

  // Disable print functionality
  window.print = () => {
    console.warn('Print function disabled during exam');
    return false;
  };

  // Override console methods in production
  if (!window.location.href.includes('dev')) {
    ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
      console[method] = () => {};
    });
  }
});

// Advanced security monitoring
let securityMonitor = {
  devToolsOpen: false,
  lastWindowSize: { width: window.innerWidth, height: window.innerHeight },
  suspiciousActivityCount: 0,
  startTime: Date.now()
};

// Prevent opening developer tools
function detectDevTools() {
  const threshold = 160;
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;
  
  if (widthThreshold || heightThreshold) {
    if (!securityMonitor.devToolsOpen) {
      securityMonitor.devToolsOpen = true;
      console.warn('Developer tools detected');
      if (window.examModeActive && window.secureExamAPI) {
        window.secureExamAPI.onSuspiciousActivity({
          type: 'Developer tools opened',
          details: 'Attempted to open developer tools during exam',
          timestamp: new Date().toISOString()
        });
      }
    }
  } else {
    securityMonitor.devToolsOpen = false;
  }
}

// Monitor for suspicious JavaScript execution
function detectConsoleUsage() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.log = function(...args) {
    if (window.examModeActive) {
      securityMonitor.suspiciousActivityCount++;
      if (window.secureExamAPI) {
        window.secureExamAPI.onSuspiciousActivity({
          type: 'Console usage detected',
          details: 'Student used browser console during exam',
          timestamp: new Date().toISOString()
        });
      }
    }
    return originalLog.apply(console, args);
  };
  
  console.warn = function(...args) {
    if (window.examModeActive) {
      securityMonitor.suspiciousActivityCount++;
    }
    return originalWarn.apply(console, args);
  };
  
  console.error = function(...args) {
    if (window.examModeActive) {
      securityMonitor.suspiciousActivityCount++;
    }
    return originalError.apply(console, args);
  };
}

// Detect zoom changes
function detectZoomChanges() {
  const currentZoom = Math.round(window.devicePixelRatio * 100);
  if (securityMonitor.lastZoom && securityMonitor.lastZoom !== currentZoom) {
    if (window.examModeActive && window.secureExamAPI) {
      window.secureExamAPI.onSuspiciousActivity({
        type: 'Zoom level changed',
        details: `Zoom changed from ${securityMonitor.lastZoom}% to ${currentZoom}%`,
        timestamp: new Date().toISOString()
      });
    }
  }
  securityMonitor.lastZoom = currentZoom;
}

// Detect window resize attempts
function detectWindowResize() {
  const currentSize = { width: window.innerWidth, height: window.innerHeight };
  
  if (securityMonitor.lastWindowSize.width !== currentSize.width || 
      securityMonitor.lastWindowSize.height !== currentSize.height) {
    
    if (window.examModeActive && window.secureExamAPI) {
      window.secureExamAPI.onSuspiciousActivity({
        type: 'Window resize detected',
        details: `Window resized from ${securityMonitor.lastWindowSize.width}x${securityMonitor.lastWindowSize.height} to ${currentSize.width}x${currentSize.height}`,
        timestamp: new Date().toISOString()
      });
    }
    
    securityMonitor.lastWindowSize = currentSize;
  }
}

// Monitor for tab switching (Page Visibility API)
function monitorPageVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.examModeActive) {
      if (window.secureExamAPI) {
        window.secureExamAPI.onSuspiciousActivity({
          type: 'Page visibility changed',
          details: 'Student switched to another tab or application',
          timestamp: new Date().toISOString()
        });
      }
    }
  });
}

// Monitor for mouse leave events (potential window switching)
function monitorMouseLeave() {
  document.addEventListener('mouseleave', (e) => {
    if (window.examModeActive && e.clientY <= 0) {
      if (window.secureExamAPI) {
        window.secureExamAPI.onSuspiciousActivity({
          type: 'Mouse left window area',
          details: 'Mouse cursor moved outside exam window',
          timestamp: new Date().toISOString()
        });
      }
    }
  });
}

// Detect rapid clicking (potential automation)
let clickCount = 0;
let clickTimer = null;

function detectRapidClicking() {
  document.addEventListener('click', () => {
    clickCount++;
    
    if (clickTimer) {
      clearTimeout(clickTimer);
    }
    
    clickTimer = setTimeout(() => {
      if (clickCount > 10 && window.examModeActive) { // More than 10 clicks per second
        if (window.secureExamAPI) {
          window.secureExamAPI.onSuspiciousActivity({
            type: 'Rapid clicking detected',
            details: `${clickCount} clicks detected in 1 second`,
            timestamp: new Date().toISOString()
          });
        }
      }
      clickCount = 0;
    }, 1000);
  });
}

// Initialize all security monitors
function initializeSecurityMonitors() {
  // Run detection checks every 500ms
  setInterval(() => {
    detectDevTools();
    detectZoomChanges();
    detectWindowResize();
  }, 500);
  
  // Initialize other monitors
  detectConsoleUsage();
  monitorPageVisibility();
  monitorMouseLeave();
  detectRapidClicking();
}

// Start monitoring when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSecurityMonitors);