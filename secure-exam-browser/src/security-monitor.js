const { screen, powerMonitor, systemPreferences } = require('electron');
const os = require('os');

class SecurityMonitor {
  constructor(mainWindow, logCallback) {
    this.mainWindow = mainWindow;
    this.logCallback = logCallback;
    this.isMonitoring = false;
    this.intervals = [];
    this.lastActiveTime = Date.now();
    this.suspiciousProcesses = [
      'teamviewer', 'anydesk', 'chrome', 'firefox', 'safari', 'edge',
      'skype', 'zoom', 'discord', 'slack', 'telegram', 'whatsapp',
      'obs', 'bandicam', 'fraps', 'camtasia', 'snagit'
    ];
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Security monitoring started');

    // Monitor system resources
    this.intervals.push(setInterval(() => {
      this.checkSystemResources();
    }, 10000)); // Every 10 seconds

    // Monitor screen changes
    this.intervals.push(setInterval(() => {
      this.checkScreenChanges();
    }, 5000)); // Every 5 seconds

    // Monitor power events
    this.setupPowerMonitoring();

    // Monitor network activity
    this.intervals.push(setInterval(() => {
      this.checkNetworkActivity();
    }, 15000)); // Every 15 seconds

    // Monitor user activity
    this.intervals.push(setInterval(() => {
      this.checkUserActivity();
    }, 2000)); // Every 2 seconds

    // Monitor clipboard
    this.intervals.push(setInterval(() => {
      this.checkClipboard();
    }, 3000)); // Every 3 seconds
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.log('Security monitoring stopped');

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  checkSystemResources() {
    try {
      const cpuUsage = process.getCPUUsage();
      const memoryUsage = process.getProcessMemoryInfo();
      
      // Check for high CPU usage (might indicate screen recording or other suspicious activity)
      if (cpuUsage.percentCPUUsage > 80) {
        this.logCallback('High CPU usage detected', `CPU usage: ${cpuUsage.percentCPUUsage.toFixed(2)}%`);
      }

      // Check for high memory usage
      if (memoryUsage.private > 500 * 1024 * 1024) { // 500MB
        this.logCallback('High memory usage detected', `Memory usage: ${(memoryUsage.private / 1024 / 1024).toFixed(2)}MB`);
      }

      // Check system load
      const loadAverage = os.loadavg();
      if (loadAverage[0] > 2.0) {
        this.logCallback('High system load detected', `Load average: ${loadAverage[0].toFixed(2)}`);
      }

    } catch (error) {
      console.error('Error checking system resources:', error);
    }
  }

  checkScreenChanges() {
    try {
      const currentDisplays = screen.getAllDisplays();
      
      if (!this.lastDisplays) {
        this.lastDisplays = currentDisplays;
        return;
      }

      // Check for display changes (new monitors, resolution changes)
      if (currentDisplays.length !== this.lastDisplays.length) {
        this.logCallback('Display configuration changed', 
          `Display count changed from ${this.lastDisplays.length} to ${currentDisplays.length}`);
      }

      // Check for resolution changes
      currentDisplays.forEach((display, index) => {
        const lastDisplay = this.lastDisplays[index];
        if (lastDisplay && 
            (display.size.width !== lastDisplay.size.width || 
             display.size.height !== lastDisplay.size.height)) {
          this.logCallback('Screen resolution changed', 
            `Display ${index}: ${lastDisplay.size.width}x${lastDisplay.size.height} → ${display.size.width}x${display.size.height}`);
        }
      });

      this.lastDisplays = currentDisplays;

    } catch (error) {
      console.error('Error checking screen changes:', error);
    }
  }

  setupPowerMonitoring() {
    try {
      // Monitor system suspend/resume
      powerMonitor.on('suspend', () => {
        this.logCallback('System suspended', 'Computer went to sleep during exam');
      });

      powerMonitor.on('resume', () => {
        this.logCallback('System resumed', 'Computer woke up from sleep during exam');
      });

      // Monitor lock screen events
      powerMonitor.on('lock-screen', () => {
        this.logCallback('Screen locked', 'User locked the screen during exam');
      });

      powerMonitor.on('unlock-screen', () => {
        this.logCallback('Screen unlocked', 'User unlocked the screen during exam');
      });

    } catch (error) {
      console.error('Error setting up power monitoring:', error);
    }
  }

  checkNetworkActivity() {
    try {
      // Check network interfaces
      const networkInterfaces = os.networkInterfaces();
      const activeInterfaces = [];

      Object.keys(networkInterfaces).forEach(name => {
        const interfaces = networkInterfaces[name];
        interfaces.forEach(iface => {
          if (!iface.internal && iface.family === 'IPv4') {
            activeInterfaces.push({
              name: name,
              address: iface.address,
              mac: iface.mac
            });
          }
        });
      });

      // Check for new network connections
      if (!this.lastNetworkInterfaces) {
        this.lastNetworkInterfaces = activeInterfaces;
        return;
      }

      const newInterfaces = activeInterfaces.filter(current => 
        !this.lastNetworkInterfaces.some(last => 
          last.name === current.name && last.address === current.address
        )
      );

      if (newInterfaces.length > 0) {
        newInterfaces.forEach(iface => {
          this.logCallback('New network connection detected', 
            `Interface: ${iface.name}, IP: ${iface.address}`);
        });
      }

      this.lastNetworkInterfaces = activeInterfaces;

    } catch (error) {
      console.error('Error checking network activity:', error);
    }
  }

  checkUserActivity() {
    try {
      // Check if window still exists and is not destroyed
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        console.log('Window destroyed, stopping activity check');
        return;
      }

      // Check if window is still focused and visible
      if (!this.mainWindow.isFocused()) {
        this.logCallback('Window focus lost', 'Exam window is not in focus');
      }

      if (!this.mainWindow.isVisible()) {
        this.logCallback('Window not visible', 'Exam window is not visible');
      }

      if (this.mainWindow.isMinimized()) {
        this.logCallback('Window minimized', 'Exam window was minimized');
      }

      // Check window position and size
      const bounds = this.mainWindow.getBounds();
      const display = screen.getDisplayMatching(bounds);
      
      if (bounds.width < display.workAreaSize.width * 0.8 || 
          bounds.height < display.workAreaSize.height * 0.8) {
        this.logCallback('Window size changed', 
          `Window resized to ${bounds.width}x${bounds.height}`);
      }

    } catch (error) {
      console.error('Error checking user activity:', error);
    }
  }

  checkClipboard() {
    try {
      const { clipboard } = require('electron');
      const currentClipboard = clipboard.readText();
      
      if (!this.lastClipboard) {
        this.lastClipboard = currentClipboard;
        return;
      }

      if (currentClipboard !== this.lastClipboard && currentClipboard.length > 0) {
        this.logCallback('Clipboard activity detected', 
          `Clipboard content changed (${currentClipboard.length} characters)`);
        this.lastClipboard = currentClipboard;
      }

    } catch (error) {
      console.error('Error checking clipboard:', error);
    }
  }

  // Additional security checks
  performAdvancedSecurityCheck() {
    return new Promise((resolve) => {
      const securityReport = {
        timestamp: new Date().toISOString(),
        checks: []
      };

      try {
        // Check system information
        securityReport.checks.push({
          name: 'System Info',
          status: 'pass',
          details: {
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            uptime: os.uptime(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem()
          }
        });

        // Check CPU information
        const cpus = os.cpus();
        securityReport.checks.push({
          name: 'CPU Info',
          status: 'pass',
          details: {
            model: cpus[0].model,
            cores: cpus.length,
            speed: cpus[0].speed
          }
        });

        // Check network interfaces
        const networkInterfaces = os.networkInterfaces();
        securityReport.checks.push({
          name: 'Network Interfaces',
          status: 'pass',
          details: Object.keys(networkInterfaces).map(name => ({
            name: name,
            addresses: networkInterfaces[name].map(iface => ({
              address: iface.address,
              family: iface.family,
              internal: iface.internal
            }))
          }))
        });

        resolve(securityReport);

      } catch (error) {
        securityReport.checks.push({
          name: 'Security Check Error',
          status: 'fail',
          details: error.message
        });
        resolve(securityReport);
      }
    });
  }

  // Get current security status
  getSecurityStatus() {
    return {
      isMonitoring: this.isMonitoring,
      windowFocused: this.mainWindow.isFocused(),
      windowVisible: this.mainWindow.isVisible(),
      windowMinimized: this.mainWindow.isMinimized(),
      windowBounds: this.mainWindow.getBounds(),
      systemUptime: os.uptime(),
      processUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.getCPUUsage()
    };
  }
}

module.exports = SecurityMonitor;