const { exec } = require('child_process');
const os = require('os');
const config = require('./config');

class ProcessMonitor {
  constructor(logCallback) {
    this.logCallback = logCallback;
    this.blockedProcesses = config.security.blockedProcesses;
    this.runningProcesses = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Process monitoring started');
    
    // Initial scan
    this.scanProcesses();
    
    // Set up periodic scanning
    this.monitoringInterval = setInterval(() => {
      this.scanProcesses();
    }, config.security.monitoring.processCheckInterval);
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Process monitoring stopped');
  }

  async scanProcesses() {
    try {
      const processes = await this.getRunningProcesses();
      const suspiciousProcesses = this.identifySuspiciousProcesses(processes);
      
      // Log any new suspicious processes
      suspiciousProcesses.forEach(process => {
        if (!this.runningProcesses.some(p => p.name === process.name && p.pid === process.pid)) {
          this.logCallback('Suspicious process detected', `${process.name} (PID: ${process.pid})`);
        }
      });
      
      this.runningProcesses = processes;
      
    } catch (error) {
      console.error('Failed to scan processes:', error);
    }
  }

  getRunningProcesses() {
    return new Promise((resolve, reject) => {
      let command;
      
      switch (os.platform()) {
        case 'win32':
          command = 'tasklist /fo csv /nh';
          break;
        case 'darwin':
          command = 'ps -ax -o pid,comm';
          break;
        case 'linux':
          command = 'ps -ax -o pid,comm --no-headers';
          break;
        default:
          reject(new Error('Unsupported platform'));
          return;
      }
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        try {
          const processes = this.parseProcessList(stdout, os.platform());
          resolve(processes);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  parseProcessList(output, platform) {
    const processes = [];
    const lines = output.trim().split('\n');
    
    switch (platform) {
      case 'win32':
        lines.forEach(line => {
          if (line.trim()) {
            const parts = line.split('","');
            if (parts.length >= 2) {
              const name = parts[0].replace(/"/g, '').toLowerCase();
              const pid = parts[1].replace(/"/g, '');
              processes.push({ name, pid: parseInt(pid) });
            }
          }
        });
        break;
        
      case 'darwin':
      case 'linux':
        lines.forEach(line => {
          const match = line.trim().match(/^\s*(\d+)\s+(.+)$/);
          if (match) {
            const pid = parseInt(match[1]);
            const name = match[2].toLowerCase();
            processes.push({ name, pid });
          }
        });
        break;
    }
    
    return processes;
  }

  identifySuspiciousProcesses(processes) {
    return processes.filter(process => {
      return this.blockedProcesses.some(blocked => {
        const processName = process.name.toLowerCase();
        const blockedName = blocked.toLowerCase();
        
        // Exact match or contains match
        return processName === blockedName || 
               processName.includes(blockedName.replace('.exe', '')) ||
               processName.endsWith(blockedName);
      });
    });
  }

  // Get system resource usage
  async getSystemResources() {
    try {
      const cpuUsage = await this.getCPUUsage();
      const memoryUsage = this.getMemoryUsage();
      const diskUsage = await this.getDiskUsage();
      
      return {
        cpu: cpuUsage,
        memory: memoryUsage,
        disk: diskUsage,
        processCount: this.runningProcesses.length,
        suspiciousProcessCount: this.identifySuspiciousProcesses(this.runningProcesses).length
      };
      
    } catch (error) {
      console.error('Failed to get system resources:', error);
      return null;
    }
  }

  getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = (endUsage.user + endUsage.system) / 1000; // Convert to milliseconds
        const percentage = (totalUsage / 1000) * 100; // Rough percentage
        resolve(Math.min(100, Math.max(0, percentage)));
      }, 1000);
    });
  }

  getMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      percentage: (usedMemory / totalMemory) * 100
    };
  }

  getDiskUsage() {
    return new Promise((resolve) => {
      // This is a simplified disk usage check
      // In a real implementation, you might use a library like 'node-disk-info'
      resolve({
        percentage: 0, // Placeholder
        available: 0,
        used: 0,
        total: 0
      });
    });
  }

  // Check for screen recording software
  detectScreenRecording() {
    const screenRecordingProcesses = [
      'obs64.exe', 'obs32.exe', 'obs.exe',
      'bandicam.exe', 'fraps.exe', 'camtasia.exe',
      'snagit32.exe', 'snagit64.exe', 'screencast.exe',
      'quicktime player', 'screen recording'
    ];
    
    const detectedRecording = this.runningProcesses.filter(process => {
      return screenRecordingProcesses.some(recorder => 
        process.name.toLowerCase().includes(recorder.toLowerCase())
      );
    });
    
    if (detectedRecording.length > 0) {
      detectedRecording.forEach(process => {
        this.logCallback('Screen recording software detected', 
          `${process.name} (PID: ${process.pid})`);
      });
    }
    
    return detectedRecording;
  }

  // Check for remote access software
  detectRemoteAccess() {
    const remoteAccessProcesses = [
      'teamviewer.exe', 'anydesk.exe', 'chrome remote desktop',
      'vnc', 'rdp', 'remote desktop', 'logmein', 'gotomypc'
    ];
    
    const detectedRemote = this.runningProcesses.filter(process => {
      return remoteAccessProcesses.some(remote => 
        process.name.toLowerCase().includes(remote.toLowerCase())
      );
    });
    
    if (detectedRemote.length > 0) {
      detectedRemote.forEach(process => {
        this.logCallback('Remote access software detected', 
          `${process.name} (PID: ${process.pid})`);
      });
    }
    
    return detectedRemote;
  }

  // Check for communication software
  detectCommunicationSoftware() {
    const communicationProcesses = [
      'skype.exe', 'zoom.exe', 'discord.exe', 'slack.exe',
      'telegram.exe', 'whatsapp.exe', 'messenger.exe',
      'teams.exe', 'webex.exe'
    ];
    
    const detectedComm = this.runningProcesses.filter(process => {
      return communicationProcesses.some(comm => 
        process.name.toLowerCase().includes(comm.toLowerCase())
      );
    });
    
    if (detectedComm.length > 0) {
      detectedComm.forEach(process => {
        this.logCallback('Communication software detected', 
          `${process.name} (PID: ${process.pid})`);
      });
    }
    
    return detectedComm;
  }

  // Perform comprehensive security scan
  async performSecurityScan() {
    const results = {
      timestamp: new Date().toISOString(),
      totalProcesses: this.runningProcesses.length,
      suspiciousProcesses: this.identifySuspiciousProcesses(this.runningProcesses),
      screenRecording: this.detectScreenRecording(),
      remoteAccess: this.detectRemoteAccess(),
      communication: this.detectCommunicationSoftware(),
      systemResources: await this.getSystemResources()
    };
    
    // Calculate risk score based on findings
    let riskScore = 0;
    riskScore += results.suspiciousProcesses.length * 20;
    riskScore += results.screenRecording.length * 30;
    riskScore += results.remoteAccess.length * 40;
    riskScore += results.communication.length * 15;
    
    if (results.systemResources) {
      if (results.systemResources.cpu > 80) riskScore += 10;
      if (results.systemResources.memory.percentage > 90) riskScore += 10;
    }
    
    results.riskScore = Math.min(100, riskScore);
    
    return results;
  }

  // Get monitoring statistics
  getMonitoringStats() {
    return {
      isMonitoring: this.isMonitoring,
      totalProcesses: this.runningProcesses.length,
      blockedProcessesCount: this.blockedProcesses.length,
      suspiciousProcessesDetected: this.identifySuspiciousProcesses(this.runningProcesses).length,
      lastScanTime: new Date().toISOString()
    };
  }
}

module.exports = ProcessMonitor;