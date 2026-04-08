// Security configuration for ExamEye Secure Browser
const config = {
  // Platform URL - UPDATE THIS WITH YOUR VERCEL URL
  platformUrl: process.env.EXAM_PLATFORM_URL || 'https://exameye-peach.vercel.app',
  
  // Security settings
  security: {
    // Allowed domains for exam platforms
    allowedDomains: [
      'localhost:3000',
      '127.0.0.1:3000',
      'exameye-peach.vercel.app', // Your Vercel domain
      // CDN domains for AI libraries
      'unpkg.com',
      'cdn.jsdelivr.net',
      'storage.googleapis.com', // TensorFlow model files
      'tfhub.dev', // TensorFlow Hub
      'raw.githubusercontent.com', // Face-API.js models
      'github.com', // Face-API.js models
      // Google Fonts for UI
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      // Add your exam platform domains here
      // 'your-exam-platform.com',
      // 'cdn.your-platform.com'
    ],
    
    // Blocked processes (will trigger alerts if detected)
    blockedProcesses: [
      'teamviewer.exe',
      'anydesk.exe',
      'chrome.exe',
      'firefox.exe',
      'safari.exe',
      'msedge.exe',
      'opera.exe',
      'brave.exe',
      'skype.exe',
      'zoom.exe',
      'discord.exe',
      'slack.exe',
      'telegram.exe',
      'whatsapp.exe',
      'obs64.exe',
      'obs32.exe',
      'bandicam.exe',
      'fraps.exe',
      'camtasia.exe',
      'snagit32.exe',
      'snagit64.exe',
      'vlc.exe',
      'notepad++.exe',
      'code.exe', // VS Code
      'sublime_text.exe',
      'atom.exe',
      'calculator.exe',
      'calc.exe'
    ],
    
    // Security policies
    policies: {
      allowCopyPaste: false,
      allowPrint: false,
      allowScreenshots: false,
      allowDeveloperTools: false,
      allowWindowSwitching: false,
      allowRightClick: false,
      allowTextSelection: false,
      allowDragDrop: false,
      allowFileDownloads: false,
      allowExternalLinks: false,
      requireFullscreen: true,
      blockKeyboardShortcuts: true,
      monitorClipboard: true,
      monitorNetworkRequests: true,
      monitorSystemEvents: true
    },
    
    // Monitoring intervals (in milliseconds)
    monitoring: {
      focusCheckInterval: 1000,
      systemCheckInterval: 5000,
      networkCheckInterval: 10000,
      processCheckInterval: 15000,
      clipboardCheckInterval: 3000,
      screenshotDetectionInterval: 2000
    },
    
    // Risk assessment thresholds
    riskAssessment: {
      lowRiskThreshold: 30,
      mediumRiskThreshold: 70,
      highRiskThreshold: 90,
      
      // Violation weights for risk calculation
      violationWeights: {
        'Window lost focus': 10,
        'Attempted unauthorized navigation': 25,
        'Right-click attempted': 5,
        'Keyboard shortcut blocked': 15,
        'Clipboard operation attempted': 20,
        'Developer tools opened': 50,
        'Suspicious network request': 30,
        'System suspended': 40,
        'Screen locked': 35,
        'New network connection detected': 20,
        'High CPU usage detected': 15,
        'Display configuration changed': 25,
        'Suspicious process detected': 45,
        'Screenshot attempt detected': 35,
        'File download attempted': 30,
        'External link clicked': 20,
        'Text selection attempted': 5,
        'Drag and drop attempted': 10,
        'Print attempted': 25
      }
    }
  },
  
  // Application settings
  application: {
    name: 'ExamEye Secure Browser',
    version: '1.0.0',
    
    // Window settings
    window: {
      minWidth: 800,
      minHeight: 600,
      defaultWidth: 1024,
      defaultHeight: 768,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      frame: true,
      titleBarStyle: 'default'
    },
    
    // Session settings
    session: {
      autoSaveInterval: 30000, // 30 seconds
      maxSessionDuration: 14400000, // 4 hours
      sessionTimeoutWarning: 300000, // 5 minutes before timeout
      maxSuspiciousActivities: 1000,
      maxLogEntries: 10000
    },
    
    // Logging settings
    logging: {
      level: 'info', // debug, info, warn, error
      maxLogFileSize: 10485760, // 10MB
      maxLogFiles: 5,
      logToFile: true,
      logToConsole: true
    }
  },
  
  // Integration settings
  integration: {
    // API endpoints for exam platform integration
    endpoints: {
      authentication: '/api/auth/verify',
      sessionStart: '/api/session/start',
      sessionEnd: '/api/session/end',
      activityLog: '/api/session/activity',
      heartbeat: '/api/session/heartbeat'
    },
    
    // Heartbeat settings
    heartbeat: {
      enabled: true,
      interval: 30000, // 30 seconds
      timeout: 10000, // 10 seconds
      maxRetries: 3
    },
    
    // Data export settings
    export: {
      formats: ['json', 'csv'],
      includeScreenshots: false,
      includeKeystrokes: false,
      includeDetailedLogs: true,
      compression: true
    }
  },
  
  // Development settings
  development: {
    enableDevTools: false,
    enableLogging: true,
    mockData: false,
    skipSecurityChecks: false,
    allowLocalhost: true,
    safeMode: false, // DISABLED for production-like testing
    emergencyExit: true, // Allow emergency exit (5x Escape)
    emergencyKey: 'Escape+Escape+Escape+Escape+Escape' // 5x Escape to exit
  },

  // Safe mode settings (for development and testing)
  safeMode: {
    enabled: false, // DISABLED for production-like testing
    disableKioskMode: false, // Enable kiosk mode
    allowWindowControls: false,
    allowTaskSwitching: false,
    allowDevTools: false,
    showExitButton: false,
    emergencyExitKey: 'Escape',
    emergencyExitSequence: 5, // Press Escape 5 times quickly for emergency exit
    timeoutMs: 1000 // Within 1 second
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
  config.development.enableDevTools = false; // Keep disabled for testing
  config.development.enableLogging = true;
  config.development.safeMode = false; // Keep disabled for testing
  config.safeMode.enabled = false; // Keep disabled for testing
  config.security.policies.allowDeveloperTools = false;
  config.security.policies.requireFullscreen = true; // Enforce fullscreen
}

if (process.env.NODE_ENV === 'production') {
  config.development.enableDevTools = false;
  config.development.skipSecurityChecks = false;
  config.security.policies.allowDeveloperTools = false;
}

module.exports = config;