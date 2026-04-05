/**
 * Example: How to integrate monitoring into the secure exam browser
 * Add this code to your main.js or exam window initialization
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const MonitoringIntegration = require('./src/monitoring/monitoring-integration');

// Store monitoring instances per window
const monitoringInstances = new Map();

/**
 * Initialize monitoring when exam starts
 */
function initializeExamMonitoring(examWindow, examId, token) {
  console.log('🔍 Initializing exam monitoring...');
  
  // Create monitoring integration instance
  const monitoring = new MonitoringIntegration(examId, token);
  
  // Store instance
  monitoringInstances.set(examWindow.id, monitoring);
  
  // Start monitoring when page is ready
  examWindow.webContents.on('did-finish-load', async () => {
    await monitoring.start();
    console.log('✅ Monitoring active for exam:', examId);
  });
  
  // Cleanup on window close
  examWindow.on('closed', async () => {
    await monitoring.stop();
    monitoringInstances.delete(examWindow.id);
    console.log('🛑 Monitoring stopped for exam:', examId);
  });
  
  return monitoring;
}

/**
 * Example: Create exam window with monitoring
 */
function createExamWindow(examId, token) {
  const examWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false // Disable in production
    }
  });
  
  // Initialize monitoring
  const monitoring = initializeExamMonitoring(examWindow, examId, token);
  
  // Load exam page
  examWindow.loadURL(`http://localhost:3000/student/exam/${examId}`);
  
  // Setup IPC handlers for monitoring events
  setupMonitoringIPCHandlers(examWindow, monitoring);
  
  return examWindow;
}

/**
 * Setup IPC handlers for monitoring events
 */
function setupMonitoringIPCHandlers(examWindow, monitoring) {
  // Handle camera status updates
  ipcMain.on('camera-status-changed', (event, { enabled }) => {
    if (event.sender === examWindow.webContents) {
      monitoring.updateSystemCheck('camera', enabled);
    }
  });
  
  // Handle microphone status updates
  ipcMain.on('microphone-status-changed', (event, { enabled }) => {
    if (event.sender === examWindow.webContents) {
      monitoring.updateSystemCheck('microphone', enabled);
    }
  });
  
  // Handle custom log events from renderer
  ipcMain.on('log-custom-event', (event, logData) => {
    if (event.sender === examWindow.webContents) {
      monitoring.logActivity(logData);
    }
  });
}

/**
 * Example: Main app initialization
 */
app.whenReady().then(() => {
  // Example: Start exam with monitoring
  const examId = '507f1f77bcf86cd799439011'; // From your database
  const token = 'student-jwt-token'; // From authentication
  
  const examWindow = createExamWindow(examId, token);
  
  console.log('🚀 Secure exam browser started with monitoring');
});

/**
 * Cleanup all monitoring instances on app quit
 */
app.on('before-quit', async () => {
  console.log('🧹 Cleaning up monitoring instances...');
  
  for (const [windowId, monitoring] of monitoringInstances.entries()) {
    await monitoring.stop();
  }
  
  monitoringInstances.clear();
});

/**
 * Example: Renderer process code (in exam page)
 * Add this to your exam page's JavaScript
 */
const rendererExample = `
  // In your exam page (renderer process)
  const { ipcRenderer } = require('electron');
  
  // Request camera access
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      // Notify main process
      ipcRenderer.send('camera-status-changed', { enabled: true });
      
      // Display video
      const video = document.getElementById('camera-preview');
      video.srcObject = stream;
    })
    .catch(error => {
      ipcRenderer.send('camera-status-changed', { enabled: false });
      console.error('Camera access denied:', error);
    });
  
  // Request microphone access
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      ipcRenderer.send('microphone-status-changed', { enabled: true });
    })
    .catch(error => {
      ipcRenderer.send('microphone-status-changed', { enabled: false });
    });
  
  // Log custom events
  function logCustomEvent(type, description, severity = 'low') {
    ipcRenderer.send('log-custom-event', {
      type,
      description,
      details: '',
      severity
    });
  }
  
  // Example: Log when student submits answer
  document.getElementById('submit-button').addEventListener('click', () => {
    logCustomEvent('answer_submitted', 'Student submitted an answer', 'low');
  });
`;

module.exports = {
  initializeExamMonitoring,
  createExamWindow,
  setupMonitoringIPCHandlers
};
