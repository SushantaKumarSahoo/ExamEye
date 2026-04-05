const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ExamSession {
  constructor(machineId) {
    this.machineId = machineId;
    this.sessionId = this.generateSessionId();
    this.startTime = null;
    this.endTime = null;
    this.examData = null;
    this.activities = [];
    this.screenshots = [];
    this.keystrokes = [];
    this.mouseEvents = [];
    this.networkRequests = [];
    this.systemEvents = [];
    this.violations = [];
    this.sessionPath = null;
  }

  generateSessionId() {
    return `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async startSession(examData) {
    this.startTime = new Date();
    this.examData = examData;
    
    // Create session directory
    const sessionsDir = path.join(os.homedir(), '.exameyebrowser', 'sessions');
    this.sessionPath = path.join(sessionsDir, this.sessionId);
    
    try {
      await fs.mkdir(this.sessionPath, { recursive: true });
      
      // Create session metadata file
      const metadata = {
        sessionId: this.sessionId,
        machineId: this.machineId,
        startTime: this.startTime.toISOString(),
        examData: this.examData,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        systemInfo: {
          hostname: os.hostname(),
          type: os.type(),
          release: os.release(),
          uptime: os.uptime(),
          totalMemory: os.totalmem(),
          cpus: os.cpus().length
        }
      };
      
      await fs.writeFile(
        path.join(this.sessionPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      console.log(`Exam session started: ${this.sessionId}`);
      return { success: true, sessionId: this.sessionId };
      
    } catch (error) {
      console.error('Failed to start exam session:', error);
      return { success: false, error: error.message };
    }
  }

  async endSession() {
    this.endTime = new Date();
    
    if (!this.sessionPath) {
      return { success: false, error: 'Session not properly initialized' };
    }

    try {
      // Save final session data
      const sessionSummary = {
        sessionId: this.sessionId,
        machineId: this.machineId,
        startTime: this.startTime.toISOString(),
        endTime: this.endTime.toISOString(),
        duration: this.endTime.getTime() - this.startTime.getTime(),
        examData: this.examData,
        statistics: {
          totalActivities: this.activities.length,
          totalViolations: this.violations.length,
          totalScreenshots: this.screenshots.length,
          totalKeystrokes: this.keystrokes.length,
          totalMouseEvents: this.mouseEvents.length,
          totalNetworkRequests: this.networkRequests.length,
          totalSystemEvents: this.systemEvents.length
        },
        violationsSummary: this.getViolationsSummary(),
        riskScore: this.calculateRiskScore()
      };

      await fs.writeFile(
        path.join(this.sessionPath, 'session-summary.json'),
        JSON.stringify(sessionSummary, null, 2)
      );

      // Save detailed logs
      await this.saveDetailedLogs();
      
      console.log(`Exam session ended: ${this.sessionId}`);
      return { 
        success: true, 
        sessionId: this.sessionId,
        summary: sessionSummary 
      };
      
    } catch (error) {
      console.error('Failed to end exam session:', error);
      return { success: false, error: error.message };
    }
  }

  logActivity(type, details, severity = 'info') {
    const activity = {
      timestamp: new Date().toISOString(),
      type: type,
      details: details,
      severity: severity,
      url: this.currentUrl || 'unknown'
    };
    
    this.activities.push(activity);
    
    // If it's a violation, add to violations list
    if (severity === 'violation' || severity === 'critical') {
      this.violations.push(activity);
    }
    
    // Auto-save activities periodically
    if (this.activities.length % 10 === 0) {
      this.saveActivitiesLog();
    }
    
    return activity;
  }

  logKeystroke(key, modifiers = []) {
    const keystroke = {
      timestamp: new Date().toISOString(),
      key: key,
      modifiers: modifiers,
      url: this.currentUrl || 'unknown'
    };
    
    this.keystrokes.push(keystroke);
    
    // Check for suspicious key combinations
    if (this.isSuspiciousKeystroke(key, modifiers)) {
      this.logActivity('Suspicious keystroke', `${modifiers.join('+')}+${key}`, 'violation');
    }
  }

  logMouseEvent(type, x, y, button = null) {
    const mouseEvent = {
      timestamp: new Date().toISOString(),
      type: type, // click, move, scroll, etc.
      x: x,
      y: y,
      button: button,
      url: this.currentUrl || 'unknown'
    };
    
    this.mouseEvents.push(mouseEvent);
  }

  logNetworkRequest(url, method, status) {
    const request = {
      timestamp: new Date().toISOString(),
      url: url,
      method: method,
      status: status,
      fromUrl: this.currentUrl || 'unknown'
    };
    
    this.networkRequests.push(request);
    
    // Check for suspicious network activity
    if (this.isSuspiciousNetworkRequest(url)) {
      this.logActivity('Suspicious network request', url, 'violation');
    }
  }

  logSystemEvent(type, details) {
    const systemEvent = {
      timestamp: new Date().toISOString(),
      type: type,
      details: details
    };
    
    this.systemEvents.push(systemEvent);
  }

  setCurrentUrl(url) {
    this.currentUrl = url;
  }

  isSuspiciousKeystroke(key, modifiers) {
    // Check for developer tools shortcuts
    const devToolsShortcuts = [
      { key: 'F12', modifiers: [] },
      { key: 'I', modifiers: ['ctrl', 'shift'] },
      { key: 'J', modifiers: ['ctrl', 'shift'] },
      { key: 'U', modifiers: ['ctrl'] }
    ];
    
    // Check for copy/paste shortcuts
    const clipboardShortcuts = [
      { key: 'C', modifiers: ['ctrl'] },
      { key: 'V', modifiers: ['ctrl'] },
      { key: 'X', modifiers: ['ctrl'] }
    ];
    
    // Check for window switching shortcuts
    const switchingShortcuts = [
      { key: 'Tab', modifiers: ['alt'] },
      { key: 'Tab', modifiers: ['ctrl'] }
    ];
    
    const allSuspicious = [...devToolsShortcuts, ...clipboardShortcuts, ...switchingShortcuts];
    
    return allSuspicious.some(shortcut => 
      shortcut.key.toLowerCase() === key.toLowerCase() &&
      shortcut.modifiers.every(mod => modifiers.includes(mod))
    );
  }

  isSuspiciousNetworkRequest(url) {
    try {
      const urlObj = new URL(url);
      
      // Check for external domains
      const suspiciousDomains = [
        'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
        'stackoverflow.com', 'github.com', 'wikipedia.org',
        'facebook.com', 'twitter.com', 'instagram.com',
        'whatsapp.com', 'telegram.org', 'discord.com'
      ];
      
      return suspiciousDomains.some(domain => 
        urlObj.hostname.includes(domain)
      );
      
    } catch (error) {
      return false;
    }
  }

  getViolationsSummary() {
    const summary = {};
    
    this.violations.forEach(violation => {
      if (!summary[violation.type]) {
        summary[violation.type] = 0;
      }
      summary[violation.type]++;
    });
    
    return summary;
  }

  calculateRiskScore() {
    let score = 0;
    
    // Base score factors
    const factors = {
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
      'Display configuration changed': 25
    };
    
    this.violations.forEach(violation => {
      const factor = factors[violation.type] || 10;
      score += factor;
    });
    
    // Normalize score (0-100)
    return Math.min(100, score);
  }

  async saveActivitiesLog() {
    if (!this.sessionPath) return;
    
    try {
      await fs.writeFile(
        path.join(this.sessionPath, 'activities.json'),
        JSON.stringify(this.activities, null, 2)
      );
    } catch (error) {
      console.error('Failed to save activities log:', error);
    }
  }

  async saveDetailedLogs() {
    if (!this.sessionPath) return;
    
    try {
      // Save all detailed logs
      const logs = {
        activities: this.activities,
        violations: this.violations,
        keystrokes: this.keystrokes,
        mouseEvents: this.mouseEvents,
        networkRequests: this.networkRequests,
        systemEvents: this.systemEvents
      };
      
      for (const [logType, logData] of Object.entries(logs)) {
        await fs.writeFile(
          path.join(this.sessionPath, `${logType}.json`),
          JSON.stringify(logData, null, 2)
        );
      }
      
    } catch (error) {
      console.error('Failed to save detailed logs:', error);
    }
  }

  async generateReport() {
    if (!this.sessionPath) {
      return { success: false, error: 'Session not initialized' };
    }

    try {
      const report = {
        sessionInfo: {
          sessionId: this.sessionId,
          machineId: this.machineId,
          startTime: this.startTime.toISOString(),
          endTime: this.endTime?.toISOString(),
          duration: this.endTime ? this.endTime.getTime() - this.startTime.getTime() : null,
          examData: this.examData
        },
        statistics: {
          totalActivities: this.activities.length,
          totalViolations: this.violations.length,
          riskScore: this.calculateRiskScore()
        },
        violationsSummary: this.getViolationsSummary(),
        timeline: this.generateTimeline(),
        recommendations: this.generateRecommendations()
      };

      await fs.writeFile(
        path.join(this.sessionPath, 'exam-report.json'),
        JSON.stringify(report, null, 2)
      );

      return { success: true, report: report };

    } catch (error) {
      console.error('Failed to generate report:', error);
      return { success: false, error: error.message };
    }
  }

  generateTimeline() {
    const timeline = [];
    
    // Combine all events and sort by timestamp
    const allEvents = [
      ...this.activities.map(a => ({ ...a, category: 'activity' })),
      ...this.violations.map(v => ({ ...v, category: 'violation' })),
      ...this.systemEvents.map(s => ({ ...s, category: 'system' }))
    ];
    
    allEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return allEvents.slice(0, 100); // Return last 100 events
  }

  generateRecommendations() {
    const recommendations = [];
    const riskScore = this.calculateRiskScore();
    
    if (riskScore > 70) {
      recommendations.push({
        level: 'critical',
        message: 'High risk score detected. Manual review recommended.',
        details: 'Multiple security violations detected during exam session.'
      });
    } else if (riskScore > 40) {
      recommendations.push({
        level: 'warning',
        message: 'Moderate risk score. Review flagged activities.',
        details: 'Some suspicious activities detected during exam session.'
      });
    } else {
      recommendations.push({
        level: 'info',
        message: 'Low risk score. Session appears normal.',
        details: 'No significant security concerns detected.'
      });
    }
    
    // Specific recommendations based on violations
    const violationTypes = Object.keys(this.getViolationsSummary());
    
    if (violationTypes.includes('Developer tools opened')) {
      recommendations.push({
        level: 'critical',
        message: 'Developer tools access detected.',
        details: 'Student attempted to access browser developer tools during exam.'
      });
    }
    
    if (violationTypes.includes('Clipboard operation attempted')) {
      recommendations.push({
        level: 'warning',
        message: 'Copy/paste operations detected.',
        details: 'Student attempted to use clipboard during exam.'
      });
    }
    
    return recommendations;
  }

  // Static method to list all sessions
  static async listSessions() {
    try {
      const sessionsDir = path.join(os.homedir(), '.exameyebrowser', 'sessions');
      const sessions = await fs.readdir(sessionsDir);
      
      const sessionList = [];
      for (const sessionId of sessions) {
        try {
          const metadataPath = path.join(sessionsDir, sessionId, 'metadata.json');
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          sessionList.push(metadata);
        } catch (error) {
          console.error(`Failed to read session ${sessionId}:`, error);
        }
      }
      
      return sessionList;
      
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  }
}

module.exports = ExamSession;