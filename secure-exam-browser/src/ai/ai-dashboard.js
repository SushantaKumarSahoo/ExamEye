/**
 * AI Dashboard for Real-time Monitoring
 * Displays AI insights and anomalies during exam sessions
 */

class AIDashboard {
  constructor() {
    this.isVisible = false;
    this.anomalies = [];
    this.performanceData = [];
    this.behaviorMetrics = {};
    
    this.createDashboard();
    this.setupEventListeners();
  }

  createDashboard() {
    // Create dashboard container
    this.dashboard = document.createElement('div');
    this.dashboard.id = 'ai-dashboard';
    this.dashboard.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 350px;
      max-height: 80vh;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border-radius: 10px;
      padding: 15px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      z-index: 10000;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      display: none;
      transition: all 0.3s ease;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    const title = document.createElement('h3');
    title.textContent = '🤖 AI Monitor';
    title.style.cssText = 'margin: 0; color: #4ade80; font-size: 16px;';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '×';
    toggleBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 25px;
      height: 25px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    toggleBtn.onclick = () => this.hide();
    
    header.appendChild(title);
    header.appendChild(toggleBtn);

    // Create status section
    this.statusSection = document.createElement('div');
    this.statusSection.style.cssText = 'margin-bottom: 15px;';
    
    // Create metrics section
    this.metricsSection = document.createElement('div');
    this.metricsSection.style.cssText = 'margin-bottom: 15px;';
    
    // Create anomalies section
    this.anomaliesSection = document.createElement('div');
    this.anomaliesSection.style.cssText = 'margin-bottom: 15px;';
    
    // Create performance section
    this.performanceSection = document.createElement('div');
    
    // Assemble dashboard
    this.dashboard.appendChild(header);
    this.dashboard.appendChild(this.statusSection);
    this.dashboard.appendChild(this.metricsSection);
    this.dashboard.appendChild(this.anomaliesSection);
    this.dashboard.appendChild(this.performanceSection);
    
    document.body.appendChild(this.dashboard);
    
    // Create toggle button
    this.createToggleButton();
  }

  createToggleButton() {
    this.toggleButton = document.createElement('button');
    this.toggleButton.innerHTML = '🤖';
    this.toggleButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    `;
    
    this.toggleButton.onmouseover = () => {
      this.toggleButton.style.transform = 'scale(1.1)';
    };
    
    this.toggleButton.onmouseout = () => {
      this.toggleButton.style.transform = 'scale(1)';
    };
    
    this.toggleButton.onclick = () => this.toggle();
    
    document.body.appendChild(this.toggleButton);
  }

  setupEventListeners() {
    // Listen for AI events
    window.addEventListener('ai-anomaly-detected', (e) => {
      this.addAnomaly(e.detail);
    });
    
    window.addEventListener('ai-monitoring-started', (e) => {
      this.updateStatus('Monitoring Active', '#4ade80');
    });
    
    window.addEventListener('ai-monitoring-stopped', (e) => {
      this.updateStatus('Monitoring Stopped', '#ef4444');
    });
    
    window.addEventListener('performance-prediction', (e) => {
      this.updatePerformance(e.detail);
    });
    
    // Update metrics periodically
    setInterval(() => {
      this.updateMetrics();
    }, 5000);
  }

  show() {
    this.isVisible = true;
    this.dashboard.style.display = 'block';
    this.toggleButton.style.display = 'none';
    
    // Animate in
    setTimeout(() => {
      this.dashboard.style.opacity = '1';
      this.dashboard.style.transform = 'translateY(0)';
    }, 10);
  }

  hide() {
    this.isVisible = false;
    this.dashboard.style.display = 'none';
    this.toggleButton.style.display = 'block';
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  updateStatus(message, color = '#4ade80') {
    this.statusSection.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
        <span style="color: ${color}; font-weight: 500;">${message}</span>
      </div>
    `;
  }

  updateMetrics() {
    // Simulate real-time metrics (would be connected to actual AI engine)
    const metrics = {
      'Focus Score': Math.floor(Math.random() * 30) + 70,
      'Behavior Score': Math.floor(Math.random() * 20) + 80,
      'Activity Level': Math.floor(Math.random() * 40) + 30,
      'Anomaly Count': this.anomalies.length
    };

    let metricsHTML = '<h4 style="margin: 0 0 10px 0; color: #94a3b8;">📊 Metrics</h4>';
    
    Object.entries(metrics).forEach(([key, value]) => {
      let color = '#4ade80';
      if (key.includes('Score')) {
        if (value < 60) color = '#ef4444';
        else if (value < 80) color = '#f59e0b';
      }
      
      metricsHTML += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="color: #cbd5e1;">${key}:</span>
          <span style="color: ${color}; font-weight: 500;">${value}${key.includes('Score') ? '%' : ''}</span>
        </div>
      `;
    });
    
    this.metricsSection.innerHTML = metricsHTML;
  }

  addAnomaly(anomaly) {
    this.anomalies.unshift(anomaly);
    
    // Keep only last 10 anomalies
    if (this.anomalies.length > 10) {
      this.anomalies = this.anomalies.slice(0, 10);
    }
    
    this.updateAnomaliesDisplay();
    
    // Flash the toggle button
    this.flashToggleButton(anomaly.data.severity);
  }

  updateAnomaliesDisplay() {
    let anomaliesHTML = '<h4 style="margin: 0 0 10px 0; color: #94a3b8;">🚨 Recent Anomalies</h4>';
    
    if (this.anomalies.length === 0) {
      anomaliesHTML += '<div style="color: #4ade80; font-style: italic;">No anomalies detected</div>';
    } else {
      this.anomalies.forEach((anomaly, index) => {
        const severityColor = {
          'high': '#ef4444',
          'medium': '#f59e0b',
          'low': '#6b7280'
        }[anomaly.data.severity] || '#6b7280';
        
        const timeAgo = this.getTimeAgo(anomaly.timestamp);
        const description = this.getAnomalyDescription(anomaly.type);
        
        anomaliesHTML += `
          <div style="
            background: rgba(255, 255, 255, 0.05);
            border-left: 3px solid ${severityColor};
            padding: 8px;
            margin-bottom: 5px;
            border-radius: 4px;
            font-size: 11px;
          ">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: ${severityColor}; font-weight: 500; text-transform: uppercase;">
                ${anomaly.data.severity}
              </span>
              <span style="color: #94a3b8;">${timeAgo}</span>
            </div>
            <div style="color: #e2e8f0;">${description}</div>
          </div>
        `;
      });
    }
    
    this.anomaliesSection.innerHTML = anomaliesHTML;
  }

  updatePerformance(prediction) {
    this.performanceData.unshift(prediction);
    
    // Keep only last 5 predictions
    if (this.performanceData.length > 5) {
      this.performanceData = this.performanceData.slice(0, 5);
    }
    
    let performanceHTML = '<h4 style="margin: 0 0 10px 0; color: #94a3b8;">📈 Performance</h4>';
    
    if (prediction) {
      performanceHTML += `
        <div style="background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="color: #cbd5e1;">Estimated Score:</span>
            <span style="color: #4ade80; font-weight: 500;">${Math.round(prediction.estimatedScore)}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="color: #cbd5e1;">Completion:</span>
            <span style="color: #60a5fa; font-weight: 500;">${Math.round(prediction.completionProbability * 100)}%</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #cbd5e1;">Pacing:</span>
            <span style="color: #f59e0b; font-weight: 500;">${prediction.recommendedPacing}</span>
          </div>
        </div>
      `;
    } else {
      performanceHTML += '<div style="color: #6b7280; font-style: italic;">No predictions available</div>';
    }
    
    this.performanceSection.innerHTML = performanceHTML;
  }

  flashToggleButton(severity) {
    const colors = {
      'high': '#ef4444',
      'medium': '#f59e0b',
      'low': '#6b7280'
    };
    
    const originalBackground = this.toggleButton.style.background;
    this.toggleButton.style.background = colors[severity] || '#6b7280';
    this.toggleButton.style.animation = 'pulse 0.5s ease-in-out';
    
    setTimeout(() => {
      this.toggleButton.style.background = originalBackground;
      this.toggleButton.style.animation = '';
    }, 1000);
  }

  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  getAnomalyDescription(type) {
    const descriptions = {
      'rapid_clicking': 'Rapid clicking pattern detected',
      'potential_copy_paste': 'Possible copy-paste behavior',
      'excessive_focus_loss': 'Frequent window focus changes',
      'suspicious_mouse_movement': 'Unusual mouse movement pattern',
      'behavior_anomaly': 'Behavioral anomaly detected',
      'declining_focus': 'Focus declining over time',
      'potential_plagiarism': 'Answer similarity detected'
    };
    
    return descriptions[type] || 'Unknown anomaly detected';
  }

  // Export data for admin review
  exportData() {
    const data = {
      anomalies: this.anomalies,
      performanceData: this.performanceData,
      behaviorMetrics: this.behaviorMetrics,
      exportTime: Date.now()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-monitoring-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear all data
  clearData() {
    this.anomalies = [];
    this.performanceData = [];
    this.behaviorMetrics = {};
    
    this.updateAnomaliesDisplay();
    this.updateMetrics();
    this.updatePerformance(null);
  }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  window.aiDashboard = new AIDashboard();
  
  // Add CSS for animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

module.exports = AIDashboard;