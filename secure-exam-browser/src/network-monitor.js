const { net } = require('electron');
const config = require('./config');

class NetworkMonitor {
  constructor(logCallback) {
    this.logCallback = logCallback;
    this.allowedDomains = config.security.allowedDomains;
    this.blockedRequests = [];
    this.networkRequests = [];
    this.isMonitoring = false;
  }

  startMonitoring(session) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Network monitoring started');

    // Monitor all network requests
    session.webRequest.onBeforeRequest((details, callback) => {
      const result = this.analyzeRequest(details);
      
      if (!result.allowed) {
        this.logCallback('Blocked network request', `${details.method} ${details.url}`);
        this.blockedRequests.push({
          timestamp: new Date().toISOString(),
          url: details.url,
          method: details.method,
          reason: result.reason
        });
        callback({ cancel: true });
      } else {
        this.networkRequests.push({
          timestamp: new Date().toISOString(),
          url: details.url,
          method: details.method,
          resourceType: details.resourceType
        });
        callback({ cancel: false });
      }
    });

    // Monitor response headers for suspicious content
    session.webRequest.onHeadersReceived((details, callback) => {
      const headers = details.responseHeaders || {};
      
      // Check for suspicious headers
      if (headers['x-frame-options'] || headers['content-security-policy']) {
        // These might indicate attempts to embed content
        this.logCallback('Suspicious response headers detected', details.url);
      }
      
      callback({ responseHeaders: headers });
    });

    // Monitor completed requests
    session.webRequest.onCompleted((details) => {
      if (details.statusCode >= 400) {
        this.logCallback('Network request failed', `${details.method} ${details.url} - Status: ${details.statusCode}`);
      }
    });

    // Monitor request errors
    session.webRequest.onErrorOccurred((details) => {
      this.logCallback('Network request error', `${details.method} ${details.url} - Error: ${details.error}`);
    });
  }

  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Network monitoring stopped');
  }

  analyzeRequest(details) {
    try {
      const url = new URL(details.url);
      
      // Allow data URLs and blob URLs
      if (url.protocol === 'data:' || url.protocol === 'blob:') {
        return { allowed: true };
      }
      
      // Allow chrome-extension URLs (for Electron internal use)
      if (url.protocol === 'chrome-extension:') {
        return { allowed: true };
      }
      
      // Allow file URLs for local resources
      if (url.protocol === 'file:') {
        return { allowed: true };
      }
      
      // Check against allowed domains
      const isAllowed = this.allowedDomains.some(domain => {
        if (domain.includes(':')) {
          return url.host === domain;
        } else {
          return url.hostname === domain || url.hostname.endsWith('.' + domain);
        }
      });
      
      if (!isAllowed) {
        console.log(`❌ Blocked: ${url.hostname} not in allowed list:`, this.allowedDomains);
        return { 
          allowed: false, 
          reason: `Domain ${url.hostname} not in allowed list` 
        };
      }
      
      // Check for suspicious URL patterns
      const suspiciousPatterns = [
        /\/admin/i,
        /\/api\/.*delete/i,
        /\/api\/.*admin/i,
        /password/i,
        /login.*admin/i,
        /backdoor/i,
        /exploit/i
      ];
      
      const isSuspicious = suspiciousPatterns.some(pattern => 
        pattern.test(url.pathname + url.search)
      );
      
      if (isSuspicious) {
        return { 
          allowed: false, 
          reason: `Suspicious URL pattern detected: ${url.pathname}` 
        };
      }
      
      // Check resource type restrictions
      const blockedResourceTypes = ['webrtc', 'websocket'];
      if (blockedResourceTypes.includes(details.resourceType)) {
        return { 
          allowed: false, 
          reason: `Blocked resource type: ${details.resourceType}` 
        };
      }
      
      return { allowed: true };
      
    } catch (error) {
      return { 
        allowed: false, 
        reason: `Invalid URL: ${error.message}` 
      };
    }
  }

  // Check for DNS manipulation attempts
  async performDNSCheck(domain) {
    try {
      const request = net.request(`https://${domain}`);
      
      return new Promise((resolve) => {
        request.on('response', (response) => {
          resolve({
            success: true,
            statusCode: response.statusCode,
            headers: response.headers
          });
        });
        
        request.on('error', (error) => {
          resolve({
            success: false,
            error: error.message
          });
        });
        
        request.end();
      });
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Analyze network traffic patterns
  analyzeTrafficPatterns() {
    const now = Date.now();
    const recentRequests = this.networkRequests.filter(req => 
      now - new Date(req.timestamp).getTime() < 60000 // Last minute
    );
    
    const analysis = {
      totalRequests: recentRequests.length,
      uniqueDomains: new Set(recentRequests.map(req => {
        try {
          return new URL(req.url).hostname;
        } catch {
          return 'unknown';
        }
      })).size,
      requestTypes: {},
      suspiciousActivity: []
    };
    
    // Count request types
    recentRequests.forEach(req => {
      analysis.requestTypes[req.resourceType] = 
        (analysis.requestTypes[req.resourceType] || 0) + 1;
    });
    
    // Check for suspicious patterns
    if (analysis.totalRequests > 100) {
      analysis.suspiciousActivity.push('High request volume detected');
    }
    
    if (analysis.uniqueDomains > 5) {
      analysis.suspiciousActivity.push('Multiple domains accessed');
    }
    
    if (analysis.requestTypes.script > 20) {
      analysis.suspiciousActivity.push('Excessive script loading');
    }
    
    return analysis;
  }

  // Get network statistics
  getNetworkStats() {
    return {
      totalRequests: this.networkRequests.length,
      blockedRequests: this.blockedRequests.length,
      isMonitoring: this.isMonitoring,
      allowedDomains: this.allowedDomains.length,
      recentActivity: this.analyzeTrafficPatterns()
    };
  }

  // Export network logs
  exportLogs() {
    return {
      networkRequests: this.networkRequests,
      blockedRequests: this.blockedRequests,
      statistics: this.getNetworkStats(),
      exportTime: new Date().toISOString()
    };
  }

  // Clear logs (for privacy)
  clearLogs() {
    this.networkRequests = [];
    this.blockedRequests = [];
    console.log('Network logs cleared');
  }
}

module.exports = NetworkMonitor;