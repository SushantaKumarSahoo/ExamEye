const { app, BrowserWindow, protocol, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

// Configuration
const APP_PROTOCOL = 'exameye';
const PRODUCTION_URL = process.env.EXAMEYE_URL || 'https://exameye.vercel.app';
const isDev = process.env.NODE_ENV === 'development';
const BASE_URL = isDev ? 'http://localhost:3000' : PRODUCTION_URL;

let mainWindow = null;
let deeplinkingUrl = null;

// Handle deep linking for Windows
if (process.platform === 'win32') {
  deeplinkingUrl = process.argv.slice(1);
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // Handle deep link on Windows
      if (process.platform === 'win32') {
        const url = commandLine.find(arg => arg.startsWith(`${APP_PROTOCOL}://`));
        if (url) {
          handleDeepLink(url);
        }
      }
    }
  });

  // Register protocol
  if (!app.isDefaultProtocolClient(APP_PROTOCOL)) {
    app.setAsDefaultProtocolClient(APP_PROTOCOL);
  }

  app.whenReady().then(() => {
    createWindow();
    
    // Handle deep link on macOS
    app.on('open-url', (event, url) => {
      event.preventDefault();
      handleDeepLink(url);
    });
    
    // Handle deep link on Windows
    if (process.platform === 'win32' && deeplinkingUrl) {
      const url = deeplinkingUrl.find(arg => arg.startsWith(`${APP_PROTOCOL}://`));
      if (url) {
        handleDeepLink(url);
      }
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    kiosk: true,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    show: false
  });

  // Remove menu bar
  mainWindow.setMenu(null);

  // Load the app
  mainWindow.loadURL(BASE_URL);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Track if exam is in progress
  let examInProgress = false;
  let focusLossCount = 0;
  const MAX_FOCUS_LOSS = 0; // Zero tolerance - any focus loss ends exam

  // Listen for exam start from web app
  ipcMain.on('exam-started', () => {
    examInProgress = true;
    focusLossCount = 0;
    console.log('Exam started - strict monitoring enabled');
  });

  // Listen for exam end from web app
  ipcMain.on('exam-ended', () => {
    examInProgress = false;
    console.log('Exam ended - monitoring disabled');
  });

  // Monitor window focus - STRICT MODE
  mainWindow.on('blur', () => {
    if (examInProgress && !isDev) {
      focusLossCount++;
      console.log(`CRITICAL: Window focus lost! Count: ${focusLossCount}`);
      
      // Immediately notify web app
      mainWindow.webContents.send('focus-lost', {
        count: focusLossCount,
        timestamp: new Date().toISOString()
      });
      
      // End exam immediately on any focus loss
      if (focusLossCount > MAX_FOCUS_LOSS) {
        console.log('EXAM TERMINATED: Focus loss detected');
        mainWindow.webContents.send('terminate-exam', {
          reason: 'Window focus lost - possible cheating attempt',
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  mainWindow.on('focus', () => {
    if (examInProgress) {
      console.log('Window regained focus');
      mainWindow.webContents.send('focus-regained', {
        timestamp: new Date().toISOString()
      });
    }
  });

  // Prevent window from being closed (except in dev mode)
  mainWindow.on('close', (event) => {
    if (!isDev && examInProgress) {
      event.preventDefault();
      // Show warning
      mainWindow.webContents.send('close-attempt', {
        message: 'Cannot close browser during exam'
      });
    }
  });

  // Disable keyboard shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (isDev) return; // Allow shortcuts in dev mode
    
    // Block all keyboard shortcuts
    if (input.control || input.meta || input.alt) {
      event.preventDefault();
    }
    
    // Block specific keys
    const blockedKeys = ['F11', 'F12', 'Escape'];
    if (blockedKeys.includes(input.key)) {
      event.preventDefault();
    }
  });

  // Prevent new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Network filtering
  const session = mainWindow.webContents.session;
  session.webRequest.onBeforeRequest((details, callback) => {
    const requestUrl = new URL(details.url);
    const allowedDomains = [
      new URL(BASE_URL).hostname,
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'vercel.app'
    ];
    
    if (allowedDomains.some(domain => requestUrl.hostname.includes(domain))) {
      callback({ cancel: false });
    } else {
      console.log('Blocked request to:', details.url);
      callback({ cancel: true });
    }
  });

  // Monitor page visibility changes (tab switching)
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      // Monitor visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          window.electronAPI?.send('page-hidden', {
            timestamp: new Date().toISOString()
          });
        } else {
          window.electronAPI?.send('page-visible', {
            timestamp: new Date().toISOString()
          });
        }
      });

      // Monitor blur events on window
      window.addEventListener('blur', () => {
        window.electronAPI?.send('window-blur', {
          timestamp: new Date().toISOString()
        });
      });

      // Monitor focus events
      window.addEventListener('focus', () => {
        window.electronAPI?.send('window-focus', {
          timestamp: new Date().toISOString()
        });
      });

      // Prevent context menu
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
      });

      // Prevent text selection during exam
      document.addEventListener('selectstart', (e) => {
        if (window.examInProgress) {
          e.preventDefault();
          return false;
        }
      });
    `);
  });

  // Handle page visibility changes
  ipcMain.on('page-hidden', (event, data) => {
    if (examInProgress && !isDev) {
      console.log('CRITICAL: Page hidden - possible tab switch');
      focusLossCount++;
      
      mainWindow.webContents.send('terminate-exam', {
        reason: 'Tab/Window switch detected - exam terminated',
        timestamp: data.timestamp
      });
    }
  });

  ipcMain.on('window-blur', (event, data) => {
    if (examInProgress && !isDev) {
      console.log('CRITICAL: Window blur detected');
    }
  });

  // Handle IPC for closing browser
  ipcMain.on('close-browser', () => {
    examInProgress = false;
    app.exit(0);
  });

  // Handle IPC for exam completion
  ipcMain.on('exam-completed', () => {
    examInProgress = false;
    if (!isDev) {
      setTimeout(() => {
        app.exit(0);
      }, 3000); // Close after 3 seconds
    }
  });
}

function handleDeepLink(deepLinkUrl) {
  console.log('Deep link received:', deepLinkUrl);
  
  try {
    // Parse the deep link URL
    // Format: exameye://exam?token=xxx&examId=yyy
    // Or: exameye://exam?username=xxx&password=yyy&examId=zzz
    const parsedUrl = url.parse(deepLinkUrl, true);
    const { token, examId, username, password } = parsedUrl.query;
    
    if (mainWindow) {
      // Navigate to the exam page with credentials
      let targetUrl = BASE_URL;
      
      if (token && examId) {
        // Direct exam access with token
        targetUrl = `${BASE_URL}/student/exam/${examId}?token=${token}`;
      } else if (username && password) {
        // Login with credentials and optional examId
        targetUrl = `${BASE_URL}/student/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&auto=true`;
        if (examId) {
          targetUrl += `&examId=${examId}`;
        }
      } else if (examId) {
        // Just exam ID, go to login
        targetUrl = `${BASE_URL}/student/login?examId=${examId}`;
      }
      
      mainWindow.loadURL(targetUrl);
      
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      // Store for later when window is created
      deeplinkingUrl = deepLinkUrl;
    }
  } catch (error) {
    console.error('Error handling deep link:', error);
  }
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Export for testing
module.exports = { handleDeepLink };
