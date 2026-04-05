const { app, BrowserWindow, ipcMain, dialog, screen, globalShortcut, Menu, shell } = require('electron');
const path = require('path');
const { machineId } = require('node-machine-id');
const SecurityMonitor = require('./security-monitor');
const ExamSession = require('./exam-session');
const NetworkMonitor = require('./network-monitor');
const ProcessMonitor = require('./process-monitor');
const BrowserAIIntegration = require('./ai/browser-ai-integration');
const AdvancedIntegrationLayer = require('./ai/advanced-integration');
const config = require('./config');

class SecureExamBrowser {
  constructor() {
    this.mainWindow = null;
    this.isExamMode = false;
    this.examStartTime = null;
    this.suspiciousActivities = [];
    this.allowedDomains = config.security.allowedDomains;
    this.screenshotInterval = null;
    this.focusCheckInterval = null;
    this.machineId = null;
    this.securityMonitor = null;
    this.networkMonitor = null;
    this.processMonitor = null;
    this.examSession = null;
    this.aiIntegration = null;
    this.advancedSecurity = null;
    this.safeMode = config.safeMode.enabled || process.env.NODE_ENV === 'development';
    this.emergencyExitCount = 0;
    this.emergencyExitTimer = null;
    
    this.initializeApp();
  }

  async initializeApp() {
    // Get machine ID for device fingerprinting
    try {
      this.machineId = await machineId();
    } catch (error) {
      console.error('Failed to get machine ID:', error);
    }

    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupSecurityMeasures();
      this.setupIpcHandlers();
      this.initializeSecurityMonitor();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    // Prevent new window creation
    app.on('web-contents-created', (event, contents) => {
      contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        this.logSuspiciousActivity('Attempted to open new window', navigationUrl);
      });

      contents.setWindowOpenHandler(({ url }) => {
        this.logSuspiciousActivity('Attempted to open popup', url);
        return { action: 'deny' };
      });
    });
  }

  createMainWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    this.mainWindow = new BrowserWindow({
      width: width,
      height: height,
      x: 0,
      y: 0,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: false, // Disabled to allow API calls to localhost
        allowRunningInsecureContent: false,
        experimentalFeatures: false
      },
      show: false,
      frame: true,
      resizable: this.safeMode ? true : false,
      movable: this.safeMode ? true : false,
      minimizable: this.safeMode ? true : false,
      maximizable: this.safeMode ? true : false,
      closable: true,
      alwaysOnTop: this.safeMode ? false : false,
      fullscreen: false,
      kiosk: false,
      titleBarStyle: 'default'
    });

    // Handle permission requests for camera and microphone
    this.mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      console.log('🔐 Permission requested:', permission);
      
      // Allow camera and microphone access
      if (permission === 'media' || permission === 'mediaKeySystem') {
        callback(true);
      } else {
        callback(false);
      }
    });

    // Load the student login page directly
    this.mainWindow.loadFile(path.join(__dirname, 'pages', 'student-login.html'));

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      this.mainWindow.focus();
      
      // Open DevTools in development mode
      if (this.safeMode || process.env.NODE_ENV === 'development') {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Prevent navigation to unauthorized sites
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!this.isUrlAllowed(url)) {
        event.preventDefault();
        this.logSuspiciousActivity('Attempted unauthorized navigation', url);
      }
    });

    // Monitor page changes
    this.mainWindow.webContents.on('did-navigate', (event, url) => {
      console.log('Navigated to:', url);
    });

    // Prevent downloads
    this.mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
      event.preventDefault();
      this.logSuspiciousActivity('Attempted file download', item.getURL());
    });

    // Block external resource loading ONLY in exam mode
    this.mainWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      // Always allow resources when NOT in exam mode
      if (!this.isExamMode) {
        console.log('✅ Allowed resource (not in exam mode):', details.url);
        callback({ cancel: false });
        return;
      }
      
      // In exam mode, check if URL is allowed
      if (!this.isUrlAllowed(details.url)) {
        console.log('🚫 Blocked external resource:', details.url);
        this.logSuspiciousActivity('Blocked external resource', details.url);
        callback({ cancel: true });
      } else {
        console.log('✅ Allowed resource:', details.url);
        callback({ cancel: false });
      }
    });
    
    // Add headers to bypass CORS/403 issues
    this.mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      details.requestHeaders['Accept'] = '*/*';
      details.requestHeaders['Origin'] = 'https://localhost';
      callback({ requestHeaders: details.requestHeaders });
    });

    // Monitor window focus
    this.mainWindow.on('blur', () => {
      if (this.isExamMode) {
        this.logSuspiciousActivity('Window lost focus', 'User switched away from exam');
        this.showFocusWarning();
        
        // Force focus back if in exam mode
        if (!this.safeMode) {
          setTimeout(() => {
            if (this.isExamMode && this.mainWindow) {
              this.mainWindow.focus();
              this.mainWindow.show();
            }
          }, 100);
        }
      }
    });

    this.mainWindow.on('focus', () => {
      if (this.isExamMode) {
        console.log('Window regained focus');
      }
    });
    
    // Prevent leaving fullscreen
    this.mainWindow.on('leave-full-screen', () => {
      if (this.isExamMode && !this.safeMode) {
        console.warn('⚠️ Attempted to leave fullscreen - blocking!');
        this.logSuspiciousActivity('Fullscreen exit attempt', 'Student tried to exit fullscreen');
        this.mainWindow.setFullScreen(true);
        this.mainWindow.setKiosk(true);
      }
    });
    
    // Monitor minimize attempts
    this.mainWindow.on('minimize', () => {
      if (this.isExamMode && !this.safeMode) {
        console.warn('⚠️ Attempted to minimize - blocking!');
        this.logSuspiciousActivity('Minimize attempt', 'Student tried to minimize window');
        this.mainWindow.restore();
        this.mainWindow.focus();
      }
    });
    
    // Monitor hide attempts
    this.mainWindow.on('hide', () => {
      if (this.isExamMode && !this.safeMode) {
        console.warn('⚠️ Attempted to hide window - blocking!');
        this.logSuspiciousActivity('Hide attempt', 'Student tried to hide window');
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });

    // Prevent closing during exam (unless in safe mode)
    this.mainWindow.on('close', (event) => {
      if (this.isExamMode && !this.safeMode) {
        event.preventDefault();
        this.showExitWarning();
      } else if (this.safeMode) {
        console.log('Safe mode: Allowing window close');
      }
    });
  }

  setupSecurityMeasures() {
    // Note: We do NOT use globalShortcut.register() as it blocks shortcuts system-wide
    // Keyboard shortcuts are handled in the renderer process (exam-interface.html)
    // This ensures shortcuts only blocked in browser, not in other apps
    
    if (!this.safeMode) {
      console.log('🔒 Security measures enabled (shortcuts blocked in browser only)');
    } else {
      this.setupSafeModeShortcuts();
    }
    
    // Remove menu bar (unless in safe mode)
    if (!this.safeMode) {
      Menu.setApplicationMenu(null);
    } else {
      this.setupSafeModeMenu();
    }

    // Prevent right-click context menu
    this.mainWindow.webContents.on('context-menu', (event) => {
      event.preventDefault();
      this.logSuspiciousActivity('Right-click attempted', 'Context menu blocked');
    });

    // Monitor clipboard access
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      if (this.isExamMode && (input.control || input.meta)) {
        if (input.key === 'c' || input.key === 'v' || input.key === 'x') {
          event.preventDefault();
          this.logSuspiciousActivity('Clipboard operation attempted', `${input.key} key blocked`);
        }
      }
    });
  }

  disableKeyboardShortcuts() {
    // DO NOT register global shortcuts here - they block system-wide
    // Instead, shortcuts will be handled in the renderer process (browser window only)
    console.log('🔒 Keyboard shortcuts will be blocked within browser window only');
    console.log('ℹ️ Shortcuts in other apps will work normally');
  }

  setupIpcHandlers() {
    ipcMain.handle('start-exam', async (event, examData) => {
      return this.startExamMode(examData);
    });

    ipcMain.handle('end-exam', async (event) => {
      return this.endExamMode();
    });

    ipcMain.handle('navigate-to-system-check', async (event) => {
      return this.navigateToSystemCheck();
    });

    ipcMain.handle('system-check-complete', async (event, results) => {
      return this.handleSystemCheckComplete(results);
    });

    ipcMain.handle('toggle-devtools', async (event) => {
      if (this.mainWindow.webContents.isDevToolsOpened()) {
        this.mainWindow.webContents.closeDevTools();
        return { opened: false };
      } else {
        this.mainWindow.webContents.openDevTools();
        return { opened: true };
      }
    });

    ipcMain.handle('get-machine-info', async (event) => {
      return {
        machineId: this.machineId,
        platform: process.platform,
        arch: process.arch,
        userAgent: this.mainWindow.webContents.getUserAgent(),
        screenResolution: screen.getPrimaryDisplay().size,
        timestamp: new Date().toISOString()
      };
    });

    ipcMain.handle('get-suspicious-activities', async (event) => {
      return this.suspiciousActivities;
    });

    ipcMain.handle('navigate-to-exam', async (event, url) => {
      if (this.isUrlAllowed(url)) {
        this.mainWindow.loadURL(url);
        return { success: true };
      } else {
        return { success: false, error: 'URL not allowed' };
      }
    });

    ipcMain.handle('get-exam-status', async (event) => {
      return {
        isExamMode: this.isExamMode,
        examStartTime: this.examStartTime,
        suspiciousActivitiesCount: this.suspiciousActivities.length,
        sessionId: this.examSession?.sessionId
      };
    });

    ipcMain.handle('get-security-status', async (event) => {
      return this.securityMonitor ? this.securityMonitor.getSecurityStatus() : null;
    });

    ipcMain.handle('perform-security-check', async (event) => {
      return this.securityMonitor ? await this.securityMonitor.performAdvancedSecurityCheck() : null;
    });

    ipcMain.handle('list-exam-sessions', async (event) => {
      return await ExamSession.listSessions();
    });

    ipcMain.handle('get-network-stats', async (event) => {
      return this.networkMonitor ? this.networkMonitor.getNetworkStats() : null;
    });

    ipcMain.handle('get-process-stats', async (event) => {
      return this.processMonitor ? this.processMonitor.getMonitoringStats() : null;
    });

    ipcMain.handle('perform-process-scan', async (event) => {
      return this.processMonitor ? await this.processMonitor.performSecurityScan() : null;
    });

    ipcMain.handle('export-security-logs', async (event) => {
      const logs = {
        suspiciousActivities: this.suspiciousActivities,
        networkLogs: this.networkMonitor ? this.networkMonitor.exportLogs() : null,
        securityStatus: this.securityMonitor ? this.securityMonitor.getSecurityStatus() : null,
        processStats: this.processMonitor ? this.processMonitor.getMonitoringStats() : null,
        exportTime: new Date().toISOString()
      };
      return logs;
    });
  }

  async startExamMode(examData) {
    this.isExamMode = true;
    this.examStartTime = new Date();
    this.suspiciousActivities = [];

    // Initialize exam session
    this.examSession = new ExamSession(this.machineId);
    await this.examSession.startSession(examData);

    // Initialize Advanced Security Integration
    if (!this.advancedSecurity) {
      this.advancedSecurity = new AdvancedIntegrationLayer();
      await this.advancedSecurity.initialize();
    }
    
    // Start Advanced Exam Security
    const securitySession = await this.advancedSecurity.startAdvancedExamSecurity({
      ...examData,
      machineId: this.machineId,
      sessionId: this.examSession.sessionId
    });
    
    console.log('🛡️ Advanced Security Features Activated:');
    securitySession.activeFeatures.forEach(feature => {
      console.log(`  ✅ ${feature}`);
    });

    // Initialize AI Integration (Legacy support)
    if (!this.aiIntegration) {
      this.aiIntegration = new BrowserAIIntegration(this.mainWindow);
    }
    
    // Start AI monitoring with configuration
    const aiConfig = {
      behaviorMonitoring: true,
      faceDetection: examData.enableFaceDetection || false,
      textAnalysis: true,
      performancePrediction: true,
      anomalyDetection: true
    };
    
    this.aiIntegration.startMonitoring(aiConfig);
    console.log('🤖 AI monitoring started with config:', aiConfig);

    // Enable STRICT kiosk mode (only if not in safe mode)
    if (!this.safeMode && !config.safeMode.disableKioskMode) {
      console.log('🔒 Enabling STRICT kiosk mode...');
      
      // Set window properties in specific order for maximum security
      this.mainWindow.setAlwaysOnTop(true);
      this.mainWindow.setFullScreen(true);
      this.mainWindow.setKiosk(true);
      
      // Disable window controls
      this.mainWindow.setResizable(false);
      this.mainWindow.setMovable(false);
      this.mainWindow.setMinimizable(false);
      this.mainWindow.setMaximizable(false);
      
      // Force focus
      this.mainWindow.focus();
      this.mainWindow.show();
      
      console.log('✅ STRICT kiosk mode enabled');
      console.log(`   - Kiosk: ${this.mainWindow.isKiosk()}`);
      console.log(`   - Fullscreen: ${this.mainWindow.isFullScreen()}`);
      console.log(`   - Always on top: ${this.mainWindow.isAlwaysOnTop()}`);
    } else {
      console.log('⚠️ Safe mode enabled - Kiosk mode disabled for development');
      console.log('   To enable full security, set safeMode.enabled = false in config.js');
    }

    // Start monitoring
    this.startFocusMonitoring();
    this.startPeriodicChecks();
    if (this.securityMonitor) {
      this.securityMonitor.startMonitoring();
    }
    if (this.networkMonitor) {
      this.networkMonitor.startMonitoring(this.mainWindow.webContents.session);
    }
    if (this.processMonitor) {
      this.processMonitor.startMonitoring();
    }

    console.log('Exam mode started:', examData);
    
    return {
      success: true,
      message: 'Advanced Exam Security activated',
      machineId: this.machineId,
      startTime: this.examStartTime,
      sessionId: this.examSession.sessionId,
      securityLevel: securitySession.securityLevel,
      activeFeatures: securitySession.activeFeatures,
      aiEnabled: true,
      advancedSecurityEnabled: true
    };
  }

  async endExamMode() {
    this.isExamMode = false;
    
    console.log('🛑 Ending exam mode...');
    
    // Stop Advanced Security and generate comprehensive report
    let advancedSecurityReport = null;
    if (this.advancedSecurity) {
      try {
        advancedSecurityReport = await this.advancedSecurity.stopAdvancedExamSecurity({
          examId: this.examSession?.examId,
          studentId: this.examSession?.studentId,
          startTime: this.examStartTime
        });
        console.log('🛡️ Advanced Security stopped, comprehensive report generated');
      } catch (error) {
        console.error('Error stopping advanced security:', error);
      }
    }
    
    // Stop AI monitoring and generate report
    let aiReport = null;
    if (this.aiIntegration) {
      try {
        aiReport = this.aiIntegration.stopMonitoring();
        console.log('🤖 AI monitoring stopped, report generated');
      } catch (error) {
        console.error('Error stopping AI monitoring:', error);
      }
    }
    
    // Exit kiosk mode and fullscreen
    console.log('🖥️ Exiting kiosk mode and fullscreen...');
    try {
      this.mainWindow.setKiosk(false);
      this.mainWindow.setFullScreen(false);
      this.mainWindow.setAlwaysOnTop(false);
      console.log('✅ Exited fullscreen/kiosk mode');
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }

    // Stop monitoring
    this.stopFocusMonitoring();
    this.stopPeriodicChecks();
    if (this.securityMonitor) {
      this.securityMonitor.stopMonitoring();
    }
    if (this.networkMonitor) {
      this.networkMonitor.stopMonitoring();
    }
    if (this.processMonitor) {
      this.processMonitor.stopMonitoring();
    }

    // End exam session and generate report
    let sessionResult = null;
    if (this.examSession) {
      sessionResult = await this.examSession.endSession();
      await this.examSession.generateReport();
    }

    console.log('✅ Exam mode ended successfully');
    
    return {
      success: true,
      message: 'Exam mode deactivated',
      suspiciousActivities: this.suspiciousActivities,
      examDuration: this.examStartTime ? Date.now() - this.examStartTime.getTime() : 0,
      sessionResult: sessionResult
    };
  }

  startFocusMonitoring() {
    // Only start focus monitoring during active exam
    // Check more frequently to catch Alt+Tab and window switching attempts
    this.focusCheckInterval = setInterval(() => {
      // CRITICAL: Only log if exam mode is active
      if (this.isExamMode && !this.mainWindow.isFocused()) {
        this.logSuspiciousActivity('Focus lost', 'Window not in focus during exam - possible Alt+Tab or window switch');
        
        // Immediately force focus back (aggressive)
        if (!this.safeMode) {
          this.mainWindow.focus();
          this.mainWindow.show();
          this.mainWindow.moveTop();
          
          // Also re-enable kiosk mode if somehow disabled
          if (!this.mainWindow.isKiosk()) {
            this.mainWindow.setKiosk(true);
          }
          if (!this.mainWindow.isFullScreen()) {
            this.mainWindow.setFullScreen(true);
          }
          if (!this.mainWindow.isAlwaysOnTop()) {
            this.mainWindow.setAlwaysOnTop(true);
          }
        }
      }
    }, 500); // Check every 500ms (more aggressive than before)
  }

  stopFocusMonitoring() {
    if (this.focusCheckInterval) {
      clearInterval(this.focusCheckInterval);
      this.focusCheckInterval = null;
    }
  }

  startPeriodicChecks() {
    // Check for suspicious activities every 5 seconds
    this.periodicCheckInterval = setInterval(() => {
      this.performSecurityChecks();
    }, 5000);
  }

  stopPeriodicChecks() {
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }
  }

  performSecurityChecks() {
    if (!this.isExamMode) return;

    // Check if window is still focused
    if (!this.mainWindow.isFocused()) {
      this.logSuspiciousActivity('Focus check failed', 'Window lost focus during periodic check');
    }

    // Check if window is still in kiosk mode (CRITICAL)
    if (!this.safeMode && !this.mainWindow.isKiosk()) {
      console.warn('⚠️ Kiosk mode was disabled! Re-enabling...');
      this.logSuspiciousActivity('Kiosk mode disabled', 'Student attempted to exit fullscreen');
      this.mainWindow.setKiosk(true);
      this.mainWindow.setAlwaysOnTop(true);
      this.mainWindow.setFullScreen(true);
    }
    
    // Check if window is still fullscreen
    if (!this.safeMode && !this.mainWindow.isFullScreen()) {
      console.warn('⚠️ Fullscreen was disabled! Re-enabling...');
      this.logSuspiciousActivity('Fullscreen disabled', 'Student attempted to exit fullscreen');
      this.mainWindow.setFullScreen(true);
    }
    
    // Check if window is still on top
    if (!this.safeMode && !this.mainWindow.isAlwaysOnTop()) {
      console.warn('⚠️ Always-on-top was disabled! Re-enabling...');
      this.logSuspiciousActivity('Always-on-top disabled', 'Window lost always-on-top status');
      this.mainWindow.setAlwaysOnTop(true);
    }
  }

  isUrlAllowed(url) {
    try {
      const urlObj = new URL(url);
      
      // Allow file:// protocol for local pages
      if (urlObj.protocol === 'file:') {
        return true;
      }
      
      // Check against allowed domains
      return this.allowedDomains.some(domain => {
        return urlObj.host === domain || urlObj.hostname === domain.split(':')[0];
      });
    } catch (error) {
      return false;
    }
  }

  logSuspiciousActivity(type, details) {
    const activity = {
      timestamp: new Date().toISOString(),
      type: type,
      details: details,
      url: this.mainWindow.webContents.getURL()
    };
    
    this.suspiciousActivities.push(activity);
    console.warn('Suspicious activity detected:', activity);

    // Log to exam session if active
    if (this.examSession && this.isExamMode) {
      this.examSession.logActivity(type, details, 'violation');
      this.examSession.setCurrentUrl(this.mainWindow.webContents.getURL());
    }

    // Send to renderer process for display
    this.mainWindow.webContents.send('suspicious-activity', activity);
  }

  showFocusWarning() {
    this.mainWindow.webContents.send('show-warning', {
      type: 'focus',
      message: 'Please keep the exam window in focus. Switching away from the exam is not allowed.'
    });
  }

  showExitWarning() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'warning',
      title: 'Exam in Progress',
      message: 'You cannot close the browser during an active exam.',
      detail: 'Please complete your exam or contact your administrator.',
      buttons: ['Continue Exam'],
      defaultId: 0
    });
  }

  setupSafeModeShortcuts() {
    // Emergency exit shortcut (Ctrl+Shift+Q)
    globalShortcut.register('CommandOrControl+Shift+Q', () => {
      console.log('Emergency exit triggered');
      app.quit();
    });

    // Toggle developer tools (F12)
    globalShortcut.register('F12', () => {
      if (this.mainWindow.webContents.isDevToolsOpened()) {
        this.mainWindow.webContents.closeDevTools();
      } else {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Escape key counter for emergency exit
    globalShortcut.register('Escape', () => {
      this.handleEmergencyExit();
    });
  }

  setupSafeModeMenu() {
    const template = [
      {
        label: 'ExamEye (Safe Mode)',
        submenu: [
          {
            label: 'About ExamEye',
            click: () => {
              dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'About ExamEye Secure Browser',
                message: 'ExamEye Secure Browser v1.0.0',
                detail: 'Running in Safe Mode for development and testing.\n\nSafe Mode Features:\n• Window controls enabled\n• Developer tools accessible (F12)\n• Emergency exit available (Ctrl+Shift+Q)\n• Kiosk mode disabled'
              });
            }
          },
          { type: 'separator' },
          {
            label: 'Emergency Exit',
            accelerator: 'CommandOrControl+Shift+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            click: () => {
              if (this.mainWindow.webContents.isDevToolsOpened()) {
                this.mainWindow.webContents.closeDevTools();
              } else {
                this.mainWindow.webContents.openDevTools();
              }
            }
          },
          { type: 'separator' },
          { role: 'reload' },
          { role: 'forceReload' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  handleEmergencyExit() {
    this.emergencyExitCount++;
    
    if (this.emergencyExitTimer) {
      clearTimeout(this.emergencyExitTimer);
    }

    if (this.emergencyExitCount >= config.safeMode.emergencyExitSequence) {
      console.log('Emergency exit sequence completed - Exiting application');
      app.quit();
      return;
    }

    this.emergencyExitTimer = setTimeout(() => {
      this.emergencyExitCount = 0;
    }, config.safeMode.timeoutMs);

    console.log(`Emergency exit: ${this.emergencyExitCount}/${config.safeMode.emergencyExitSequence} (Press Escape ${config.safeMode.emergencyExitSequence - this.emergencyExitCount} more times quickly)`);
  }

  initializeSecurityMonitor() {
    this.securityMonitor = new SecurityMonitor(this.mainWindow, (type, details) => {
      this.logSuspiciousActivity(type, details);
    });
    
    this.networkMonitor = new NetworkMonitor((type, details) => {
      this.logSuspiciousActivity(type, details);
    });
    
    this.processMonitor = new ProcessMonitor((type, details) => {
      this.logSuspiciousActivity(type, details);
    });
  }

  navigateToSystemCheck() {
    // Navigate to system check page in the same window
    this.mainWindow.loadFile(path.join(__dirname, 'system-check.html'));
    return { success: true, message: 'Navigating to system check' };
  }

  async handleSystemCheckComplete(results) {
    console.log('System check completed:', results);
    
    // Store results
    this.systemCheckResults = results;
    
    // Navigate back to student login
    this.mainWindow.loadFile(path.join(__dirname, 'pages', 'student-login.html'));
    
    // Send results after page loads
    this.mainWindow.webContents.once('did-finish-load', () => {
      if (results.passed) {
        console.log('✅ All system checks passed - Ready for exam');
        this.mainWindow.webContents.send('system-check-passed', results);
      } else {
        console.log('⚠️ System check completed with issues');
        this.mainWindow.webContents.send('system-check-failed', results);
      }
    });
    
    return { 
      success: results.passed, 
      message: results.passed ? 'System check passed' : 'System check failed - Please fix issues',
      results: results
    };
  }
}

// Initialize the secure exam browser
new SecureExamBrowser();