const { app, BrowserWindow, protocol, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const url = require('url');

// Configuration
const APP_PROTOCOL = 'exameye';
const PRODUCTION_URL = process.env.EXAMEYE_URL || 'https://exameye-peach.vercel.app';
// Detect if running in development mode
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const BASE_URL = PRODUCTION_URL;

let mainWindow = null;
let deeplinkingUrl = null;

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

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

  // Call security measures that must be set BEFORE app is ready
  enableAdvancedSecurity();

  app.whenReady().then(() => {
    registerIPCHandlers();
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

// Register IPC handlers
function registerIPCHandlers() {
  const os = require('os');
  
  ipcMain.handle('start-exam', async (event, examData) => {
    console.log('Start exam handler called:', examData);
    return { success: true };
  });

  ipcMain.handle('end-exam', async () => {
    console.log('End exam handler called');
    return { success: true };
  });

  ipcMain.handle('get-exam-status', async () => {
    return { active: true };
  });

  ipcMain.handle('get-machine-info', async () => {
    return {
      platform: process.platform,
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      userInfo: os.userInfo()
    };
  });

  ipcMain.handle('toggle-devtools', async () => {
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
    return { success: true };
  });

  ipcMain.handle('navigate-to-system-check', async () => {
    console.log('Navigate to system check');
    return { success: true };
  });

  ipcMain.handle('system-check-complete', async (event, results) => {
    console.log('System check complete:', results);
    return { success: true };
  });

  ipcMain.handle('navigate-to-exam', async (event, url) => {
    console.log('Navigate to exam:', url);
    if (mainWindow) {
      mainWindow.loadURL(url);
    }
    return { success: true };
  });

  ipcMain.handle('get-suspicious-activities', async () => {
    return { activities: [] };
  });

  ipcMain.handle('get-network-stats', async () => {
    return { stats: {} };
  });

  ipcMain.handle('get-process-stats', async () => {
    return { stats: {} };
  });

  ipcMain.handle('perform-process-scan', async () => {
    return { scan: {} };
  });

  ipcMain.handle('export-security-logs', async () => {
    return { success: true };
  });
}

// Advanced security measures - MUST be called BEFORE app.ready()
function enableAdvancedSecurity() {
  console.log('🔒 Enabling advanced security measures...');
  
  // 1. Disable hardware acceleration to prevent GPU-based exploits
  // CRITICAL: Must be called before app is ready
  app.disableHardwareAcceleration();
  
  // 2. Set app user model ID for Windows taskbar control
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.exameye.securebrowser');
  }
  
  // 3. Disable remote module for security
  app.on('remote-require', (event) => {
    event.preventDefault();
  });
  
  app.on('remote-get-builtin', (event) => {
    event.preventDefault();
  });
  
  app.on('remote-get-global', (event) => {
    event.preventDefault();
  });
  
  app.on('remote-get-current-window', (event) => {
    event.preventDefault();
  });
  
  app.on('remote-get-current-web-contents', (event) => {
    event.preventDefault();
  });
  
  // 4. Prevent certificate errors from being ignored
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    console.error('Certificate error:', error, 'for URL:', url);
    callback(false); // Reject the certificate
  });
  
  // 5. Block all permission requests except camera and microphone
  app.on('web-contents-created', (event, contents) => {
    contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      const allowedPermissions = ['media', 'mediaKeySystem', 'audioCapture', 'videoCapture'];
      
      if (allowedPermissions.includes(permission)) {
        console.log(`✅ Granted permission: ${permission}`);
        callback(true);
      } else {
        console.log(`❌ Denied permission: ${permission}`);
        callback(false);
      }
    });
    
    // Block navigation to external sites
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      const allowedHosts = [
        'localhost',
        '127.0.0.1',
        new URL(BASE_URL).hostname
      ];
      
      if (!allowedHosts.some(host => parsedUrl.hostname.includes(host)) && 
          !navigationUrl.startsWith('file://')) {
        console.log('❌ Blocked navigation to:', navigationUrl);
        event.preventDefault();
      }
    });
    
    // Block new window creation
    contents.setWindowOpenHandler(({ url }) => {
      console.log('❌ Blocked new window:', url);
      return { action: 'deny' };
    });
  });
  
  console.log('✅ Advanced security measures enabled');
}

// Register global shortcuts to block system-level shortcuts
function registerGlobalShortcuts() {
  // Block Windows key combinations and system shortcuts
  // Note: Some shortcuts (Alt+F4, Alt+Tab, Super+*, etc.) cannot be registered on Windows
  // These are handled at the OS level and blocked via keyboard event handlers instead
  const shortcuts = [
    'CommandOrControl+Tab', // Switch tabs
    'CommandOrControl+Shift+Tab', // Switch tabs reverse
    'CommandOrControl+W', // Close tab
    'CommandOrControl+T', // New tab
    'CommandOrControl+N', // New window
    'CommandOrControl+Shift+N', // New incognito window
    'CommandOrControl+R', // Refresh
    'CommandOrControl+Shift+R', // Hard refresh
    'CommandOrControl+F', // Find
    'CommandOrControl+G', // Find next
    'CommandOrControl+H', // History
    'CommandOrControl+J', // Downloads
    'CommandOrControl+K', // Search
    'CommandOrControl+L', // Address bar
    'CommandOrControl+P', // Print
    'CommandOrControl+S', // Save
    'CommandOrControl+U', // View source
    'CommandOrControl+Z', // Undo
    'CommandOrControl+Y', // Redo
    'CommandOrControl+X', // Cut
    'CommandOrControl+C', // Copy
    'CommandOrControl+V', // Paste
    'CommandOrControl+A', // Select all
    'Alt+Left', // Back
    'Alt+Right', // Forward
    'CommandOrControl+Left', // Back
    'CommandOrControl+Right', // Forward
    'Escape', // Exit fullscreen
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11',
    'CommandOrControl+F1', 'CommandOrControl+F2', 'CommandOrControl+F3',
    'CommandOrControl+F6', 'CommandOrControl+F7', 'CommandOrControl+F8',
    'CommandOrControl+F9', 'CommandOrControl+F10', 'CommandOrControl+F11', 'CommandOrControl+F12',
    'CommandOrControl+Shift+I', // DevTools
    'CommandOrControl+Shift+J', // DevTools
    'CommandOrControl+Shift+C', // DevTools
    'CommandOrControl+Plus', // Zoom in
    'CommandOrControl+=', // Zoom in
    'CommandOrControl+-', // Zoom out
    'CommandOrControl+0', // Reset zoom
  ];

  let registeredCount = 0;
  let failedCount = 0;

  shortcuts.forEach(shortcut => {
    try {
      const success = globalShortcut.register(shortcut, () => {
        console.log(`🚫 Blocked shortcut: ${shortcut}`);
        // Do nothing - just block the shortcut
      });
      
      if (success) {
        registeredCount++;
      } else {
        failedCount++;
        // Only log failures in dev mode to reduce console noise
        if (isDev) {
          console.log(`⚠️ Could not register shortcut: ${shortcut}`);
        }
      }
    } catch (error) {
      failedCount++;
      // Only log errors in dev mode
      if (isDev) {
        console.log(`❌ Error registering shortcut ${shortcut}:`, error.message);
      }
    }
  });

  console.log(`✅ Global shortcuts registered: ${registeredCount} successful${failedCount > 0 ? `, ${failedCount} failed (OS-reserved)` : ''}`);
  console.log(`ℹ️ Note: Alt+F4, Alt+Tab, Win+* shortcuts are blocked via keyboard event handlers`);
  
  // Monitor for focus loss every 100ms during exam
  let examInProgress = false;
  let isClosing = false;
  setInterval(() => {
    if (mainWindow && !mainWindow.isFocused() && !isDev && examInProgress && !isClosing) {
      console.log('⚠️ Window lost focus - attempting to regain...');
      mainWindow.focus();
      mainWindow.moveTop();
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }
  }, 100);
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
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: '',
      disableBlinkFeatures: 'AutomationControlled'
    },
    show: false,
    skipTaskbar: false, // Show in taskbar but prevent switching
    alwaysOnTop: false, // Will be enabled during exam
    focusable: true,
    minimizable: false,
    maximizable: false,
    closable: true
  });

  // Remove menu bar
  mainWindow.setMenu(null);

  // Load the student login page from local files
  const loginPagePath = path.join(__dirname, 'pages', 'student-login.html');
  
  mainWindow.loadFile(loginPagePath).catch(error => {
    console.error('Error loading login page:', error);
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Force fullscreen and kiosk mode
    mainWindow.setFullScreen(true);
    mainWindow.setKiosk(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.focus();
    
    // Track if exam is in progress
    let examInProgress = false;
    
    registerGlobalShortcuts(() => examInProgress);
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
    
    // Set window to always on top during exam
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.focus();
  });

  // Listen for exam end from web app
  ipcMain.on('exam-ended', () => {
    examInProgress = false;
    mainWindow.setAlwaysOnTop(false);
    console.log('Exam ended - monitoring disabled');
  });

  // Monitor window focus - STRICT MODE
  mainWindow.on('blur', () => {
    if (examInProgress && !isDev) {
      focusLossCount++;
      console.log(`CRITICAL: Window focus lost! Count: ${focusLossCount}`);
      
      // Force window back to front
      mainWindow.focus();
      mainWindow.moveTop();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      
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

  // Disable keyboard shortcuts - STRICT MODE
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // During exam, block ALL modifier key combinations
    if (examInProgress) {
      if (input.control || input.meta || input.alt) {
        event.preventDefault();
        console.log('Blocked shortcut during exam:', input.key, 'with modifiers');
        return;
      }
    }
    
    // Always block Windows/Super key (this is critical)
    if (input.key === 'Meta' || input.key === 'Super' || 
        input.code === 'MetaLeft' || input.code === 'MetaRight' ||
        input.code === 'SuperLeft' || input.code === 'SuperRight') {
      event.preventDefault();
      console.log('Blocked Windows/Super key');
      return;
    }
    
    // Always block specific dangerous keys
    const blockedKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Escape', 'ContextMenu'];
    if (blockedKeys.includes(input.key)) {
      event.preventDefault();
      console.log('Blocked key:', input.key);
      return;
    }
    
    // Block Tab key with any modifier (Alt+Tab, Ctrl+Tab, etc.)
    if (input.key === 'Tab' && (input.alt || input.control || input.meta)) {
      event.preventDefault();
      console.log('Blocked Tab switching');
      return;
    }
  });

  // Prevent new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Network filtering
  const session = mainWindow.webContents.session;
  session.webRequest.onBeforeRequest((details, callback) => {
    // Allow local file:// URLs
    if (details.url.startsWith('file://')) {
      callback({ cancel: false });
      return;
    }
    
    const requestUrl = new URL(details.url);
    const allowedDomains = [
      new URL(BASE_URL).hostname,
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'vercel.app',
      // CDN domains for AI libraries
      'cdn.jsdelivr.net',
      'storage.googleapis.com',
      'tfhub.dev',
      'unpkg.com',
      'raw.githubusercontent.com',
      // Network speed test domains
      'images.unsplash.com',
      'picsum.photos',
      'via.placeholder.com',
      'www.google.com',
      'google.com'
    ];
    
    // Check if hostname matches any allowed domain
    const isAllowed = allowedDomains.some(domain => {
      return requestUrl.hostname === domain || requestUrl.hostname.endsWith('.' + domain);
    });
    
    if (isAllowed) {
      console.log('Allowed request to:', details.url);
      callback({ cancel: false });
    } else {
      console.log('Blocked request to:', details.url);
      callback({ cancel: true });
    }
  });

  // Monitor page visibility changes (tab switching)
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      // Create close button
      (function() {
        const closeBtn = document.createElement('div');
        closeBtn.id = 'exam-close-btn';
        closeBtn.innerHTML = '✕ Close Browser';
        closeBtn.style.cssText = \`
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #dc2626;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          z-index: 999999;
          font-family: Arial, sans-serif;
          font-size: 14px;
          font-weight: bold;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.3s;
        \`;
        closeBtn.onmouseover = () => {
          closeBtn.style.background = '#b91c1c';
          closeBtn.style.transform = 'scale(1.05)';
        };
        closeBtn.onmouseout = () => {
          closeBtn.style.background = '#dc2626';
          closeBtn.style.transform = 'scale(1)';
        };
        closeBtn.onclick = () => {
          if (confirm('Are you sure you want to close the secure browser? Your exam progress may be lost.')) {
            window.electronAPI?.send('close-browser');
          }
        };
        document.body.appendChild(closeBtn);
      })();

      // Block all gestures and shortcuts
      document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }, { capture: true, passive: false });
      
      document.addEventListener('gesturechange', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }, { capture: true, passive: false });
      
      document.addEventListener('gestureend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }, { capture: true, passive: false });

      // Block touch gestures (3-finger, 4-finger swipes) - ENHANCED
      let touchStartX = 0;
      let touchStartY = 0;
      let touchCount = 0;
      
      document.addEventListener('touchstart', (e) => {
        touchCount = e.touches.length;
        
        // Block any multi-touch gestures (2+ fingers)
        if (e.touches.length > 1) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('Blocked multi-touch gesture:', e.touches.length, 'fingers');
          return false;
        }
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: false, capture: true });
      
      document.addEventListener('touchmove', (e) => {
        // Block any multi-touch gestures
        if (e.touches.length > 1) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('Blocked multi-touch move:', e.touches.length, 'fingers');
          return false;
        }
        
        // Block large swipe gestures even with single finger
        if (e.touches.length === 1) {
          const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
          const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
          
          // If swipe is too large and fast, might be a gesture
          if (deltaX > 200 || deltaY > 200) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          }
        }
      }, { passive: false, capture: true });
      
      document.addEventListener('touchend', (e) => {
        if (e.changedTouches.length > 1 || touchCount > 1) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('Blocked multi-touch end');
          return false;
        }
        touchCount = 0;
      }, { passive: false, capture: true });
      
      // Block pointer events that might be gestures
      document.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') {
          // Track touch points
          const touches = document.querySelectorAll(':active');
          if (touches.length > 1) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          }
        }
      }, { passive: false, capture: true });
      
      // Block wheel events (might be triggered by gestures)
      document.addEventListener('wheel', (e) => {
        // Block if it's a gesture (ctrlKey is set for pinch-zoom)
        if (e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }, { passive: false, capture: true });

      // Block all keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Block Windows/Super key specifically
        if (e.key === 'Meta' || e.key === 'Super' || 
            e.code === 'MetaLeft' || e.code === 'MetaRight' ||
            e.code === 'SuperLeft' || e.code === 'SuperRight' ||
            e.keyCode === 91 || e.keyCode === 92) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('Blocked Windows key');
          return false;
        }
        
        // Block Tab key with any modifier
        if (e.key === 'Tab' && (e.ctrlKey || e.metaKey || e.altKey)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
        
        // Block Ctrl/Cmd + any key
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
        
        // Block Alt + any key (including Alt+Tab)
        if (e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
        
        // Block F keys
        if (e.key.startsWith('F') && e.key.length <= 3) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }, true);
      
      // Additional keydown blocker with higher priority
      document.addEventListener('keydown', (e) => {
        // Specifically target Windows key
        if (e.keyCode === 91 || e.keyCode === 92 || e.key === 'Meta' || e.key === 'Super') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('Blocked Windows key (keyCode:', e.keyCode, ')');
          return false;
        }
        
        if (e.altKey || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }, { capture: true, passive: false });
      
      // Block keyup events too
      document.addEventListener('keyup', (e) => {
        if (e.keyCode === 91 || e.keyCode === 92 || 
            e.altKey || e.ctrlKey || e.metaKey || 
            e.key === 'Alt' || e.key === 'Control' || e.key === 'Meta' || e.key === 'Super') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }, { capture: true, passive: false });

      // Block paste event
      document.addEventListener('paste', (e) => {
        e.preventDefault();
        return false;
      }, true);

      // Block copy event
      document.addEventListener('copy', (e) => {
        e.preventDefault();
        return false;
      }, true);

      // Block cut event
      document.addEventListener('cut', (e) => {
        e.preventDefault();
        return false;
      }, true);

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
  let isClosing = false;
  ipcMain.on('close-browser', () => {
    console.log('Close browser requested');
    isClosing = true;
    examInProgress = false;
    // Give a small delay to ensure the flag is set before quitting
    setTimeout(() => {
      globalShortcut.unregisterAll();
      app.exit(0);
    }, 100);
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
    // Format: exameye://exam/{examId}?username=xxx&password=yyy
    // Or: exameye://exam?token=xxx&examId=yyy
    // Or: exameye://exam?username=xxx&password=yyy&examId=zzz
    const parsedUrl = url.parse(deepLinkUrl, true);
    let { token, examId, username, password } = parsedUrl.query;
    
    // Extract examId from path if present (e.g., exameye://exam/123)
    const pathParts = parsedUrl.pathname?.split('/').filter(Boolean);
    if (pathParts && pathParts.length > 1) {
      examId = pathParts[1]; // Get the examId from the path
    }
    
    console.log('Parsed credentials:', { examId, username, password: password ? '***' : undefined, token: token ? '***' : undefined });
    
    if (mainWindow) {
      // Load the local student login page
      const loginPagePath = path.join(__dirname, 'pages', 'student-login.html');
      mainWindow.loadFile(loginPagePath).then(() => {
        // After page loads, send credentials to auto-fill and login
        setTimeout(() => {
          mainWindow.webContents.send('auto-login', {
            username,
            password,
            examId,
            token
          });
        }, 1000);
      });
      
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
  globalShortcut.unregisterAll();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Export for testing
module.exports = { handleDeepLink };
