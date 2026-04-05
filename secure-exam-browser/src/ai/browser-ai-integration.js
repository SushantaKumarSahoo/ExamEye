/**
 * Browser AI Integration
 * Connects the offline AI engine with the secure browser
 */

const OfflineAIEngine = require('./ai-engine');

class BrowserAIIntegration {
  constructor(browserWindow) {
    this.browserWindow = browserWindow;
    this.aiEngine = new OfflineAIEngine();
    this.isMonitoring = false;
    this.eventListeners = new Map();
    this.monitoringConfig = {
      behaviorMonitoring: true,
      faceDetection: false, // Enable if camera permission granted
      textAnalysis: true,
      performancePrediction: true,
      anomalyDetection: true
    };
    
    this.init();
  }

  async init() {
    console.log('🔗 Initializing Browser AI Integration...');
    
    // Wait for AI engine to initialize
    while (!this.aiEngine.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Setup browser event monitoring
    this.setupEventMonitoring();
    
    // Setup AI event handlers
    this.setupAIEventHandlers();
    
    // Setup periodic analysis
    this.setupPeriodicAnalysis();
    
    console.log('✅ Browser AI Integration initialized');
  }

  // Setup Event Monitoring
  setupEventMonitoring() {
    const webContents = this.browserWindow.webContents;
    
    // Inject monitoring script into the exam page
    webContents.on('dom-ready', () => {
      this.injectMonitoringScript();
    });
    
    // Listen for events from the injected script
    webContents.on('ipc-message', (event, channel, data) => {
      if (channel === 'ai-behavior-event') {
        this.handleBehaviorEvent(data);
      } else if (channel === 'ai-answer-submitted') {
        this.handleAnswerSubmission(data);
      } else if (channel === 'ai-question-viewed') {
        this.handleQuestionView(data);
      }
    });
  }

  // Inject monitoring script into exam page
  injectMonitoringScript() {
    const monitoringScript = `
      (function() {
        const { ipcRenderer } = require('electron');
        
        // Behavior monitoring
        let lastMousePosition = { x: 0, y: 0 };
        let lastClickTime = 0;
        let lastKeyTime = 0;
        let focusStartTime = Date.now();
        
        // Click monitoring
        document.addEventListener('click', (e) => {
          const now = Date.now();
          ipcRenderer.send('ai-behavior-event', {
            type: 'click',
            data: {
              x: e.clientX,
              y: e.clientY,
              target: e.target.tagName,
              timeSinceLastClick: now - lastClickTime,
              timestamp: now
            }
          });
          lastClickTime = now;
        });
        
        // Mouse movement monitoring
        let mouseMoveThrottle = null;
        document.addEventListener('mousemove', (e) => {
          if (mouseMoveThrottle) return;
          mouseMoveThrottle = setTimeout(() => {
            const deltaX = e.clientX - lastMousePosition.x;
            const deltaY = e.clientY - lastMousePosition.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            ipcRenderer.send('ai-behavior-event', {
              type: 'mouse_movement',
              data: {
                x: e.clientX,
                y: e.clientY,
                deltaX,
                deltaY,
                distance,
                timestamp: Date.now()
              }
            });
            
            lastMousePosition = { x: e.clientX, y: e.clientY };
            mouseMoveThrottle = null;
          }, 100);
        });
        
        // Keyboard monitoring
        document.addEventListener('keydown', (e) => {
          const now = Date.now();
          ipcRenderer.send('ai-behavior-event', {
            type: 'keypress',
            data: {
              key: e.key,
              code: e.code,
              ctrlKey: e.ctrlKey,
              altKey: e.altKey,
              shiftKey: e.shiftKey,
              timeSinceLastKey: now - lastKeyTime,
              timestamp: now
            }
          });
          lastKeyTime = now;
        });
        
        // Scroll monitoring
        let scrollThrottle = null;
        document.addEventListener('scroll', (e) => {
          if (scrollThrottle) return;
          scrollThrottle = setTimeout(() => {
            ipcRenderer.send('ai-behavior-event', {
              type: 'scroll',
              data: {
                scrollY: window.scrollY,
                scrollX: window.scrollX,
                timestamp: Date.now()
              }
            });
            scrollThrottle = null;
          }, 200);
        });
        
        // Focus monitoring
        window.addEventListener('focus', () => {
          focusStartTime = Date.now();
          ipcRenderer.send('ai-behavior-event', {
            type: 'focus',
            data: {
              type: 'focus',
              timestamp: Date.now()
            }
          });
        });
        
        window.addEventListener('blur', () => {
          const focusDuration = Date.now() - focusStartTime;
          ipcRenderer.send('ai-behavior-event', {
            type: 'focus',
            data: {
              type: 'blur',
              duration: focusDuration,
              timestamp: Date.now()
            }
          });
        });
        
        // Form submission monitoring
        document.addEventListener('submit', (e) => {
          const formData = new FormData(e.target);
          const answers = {};
          for (let [key, value] of formData.entries()) {
            answers[key] = value;
          }
          
          ipcRenderer.send('ai-answer-submitted', {
            answers,
            timestamp: Date.now()
          });
        });
        
        // Question view monitoring
        const observeQuestions = () => {
          const questions = document.querySelectorAll('[data-question-id]');
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                ipcRenderer.send('ai-question-viewed', {
                  questionId: entry.target.dataset.questionId,
                  timestamp: Date.now()
                });
              }
            });
          }, { threshold: 0.5 });
          
          questions.forEach(q => observer.observe(q));
        };
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', observeQuestions);
        } else {
          observeQuestions();
        }
        
        // AI anomaly notifications
        window.addEventListener('ai-anomaly-detected', (e) => {
          const anomaly = e.detail;
          
          // Show non-intrusive notification
          if (anomaly.data.severity === 'high') {
            const notification = document.createElement('div');
            notification.style.cssText = \`
              position: fixed;
              top: 20px;
              right: 20px;
              background: #fee2e2;
              border: 1px solid #fecaca;
              color: #991b1b;
              padding: 12px 16px;
              border-radius: 8px;
              font-size: 14px;
              z-index: 10000;
              max-width: 300px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            \`;
            
            let message = '';
            switch (anomaly.type) {
              case 'rapid_clicking':
                message = '⚠️ Unusual clicking pattern detected';
                break;
              case 'potential_copy_paste':
                message = '⚠️ Please type your answers manually';
                break;
              case 'excessive_focus_loss':
                message = '⚠️ Please keep focus on the exam';
                break;
              default:
                message = '⚠️ Unusual activity detected';
            }
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 5000);
          }
        });
        
        console.log('🤖 AI monitoring script injected successfully');
      })();
    `;
    
    this.browserWindow.webContents.executeJavaScript(monitoringScript);
  }

  // Handle behavior events from the browser
  handleBehaviorEvent(data) {
    if (!this.isMonitoring) return;
    
    // Pass to AI engine for analysis
    this.aiEngine.monitorBehavior(data);
  }

  // Handle answer submissions
  handleAnswerSubmission(data) {
    if (!this.monitoringConfig.textAnalysis) return;
    
    // Analyze each answer
    Object.entries(data.answers).forEach(([questionId, answer]) => {
      if (typeof answer === 'string' && answer.length > 10) {
        const analysis = this.aiEngine.analyzeAnswerText(answer, { questionId });
        
        // Store analysis results
        this.storeAnswerAnalysis(questionId, answer, analysis);
        
        // Check for potential issues
        if (analysis && analysis.originality < 0.3) {
          this.aiEngine.flagAnomaly('potential_plagiarism', {
            questionId,
            originalityScore: analysis.originality,
            severity: 'high'
          });
        }
      }
    });
  }

  // Handle question views
  handleQuestionView(data) {
    // Track question viewing patterns
    this.aiEngine.monitorBehavior({
      type: 'question_view',
      data: {
        questionId: data.questionId,
        timestamp: data.timestamp
      }
    });
  }

  // Setup AI event handlers
  setupAIEventHandlers() {
    // Listen for AI anomalies
    if (typeof window !== 'undefined') {
      window.addEventListener('ai-anomaly-detected', (e) => {
        this.handleAIAnomaly(e.detail);
      });
    }
  }

  // Handle AI anomalies
  handleAIAnomaly(anomaly) {
    console.log('🚨 AI Anomaly:', anomaly);
    
    // Log to secure storage
    this.logAnomalyToStorage(anomaly);
    
    // Send to main process for admin notification
    if (this.browserWindow && this.browserWindow.webContents) {
      this.browserWindow.webContents.send('ai-anomaly-detected', anomaly);
    }
    
    // Take action based on severity
    switch (anomaly.data.severity) {
      case 'high':
        this.handleHighSeverityAnomaly(anomaly);
        break;
      case 'medium':
        this.handleMediumSeverityAnomaly(anomaly);
        break;
      case 'low':
        this.handleLowSeverityAnomaly(anomaly);
        break;
    }
  }

  // Setup periodic analysis
  setupPeriodicAnalysis() {
    // Performance prediction every 5 minutes
    setInterval(() => {
      if (this.isMonitoring && this.monitoringConfig.performancePrediction) {
        this.performPeriodicAnalysis();
      }
    }, 5 * 60 * 1000);
    
    // Behavior pattern analysis every 2 minutes
    setInterval(() => {
      if (this.isMonitoring) {
        this.analyzeBehaviorTrends();
      }
    }, 2 * 60 * 1000);
  }

  // Start monitoring
  startMonitoring(config = {}) {
    this.monitoringConfig = { ...this.monitoringConfig, ...config };
    this.isMonitoring = true;
    
    console.log('🔍 AI monitoring started with config:', this.monitoringConfig);
    
    // Notify the browser
    if (this.browserWindow && this.browserWindow.webContents) {
      this.browserWindow.webContents.send('ai-monitoring-started', this.monitoringConfig);
    }
  }

  // Stop monitoring
  stopMonitoring() {
    this.isMonitoring = false;
    
    console.log('⏹️ AI monitoring stopped');
    
    // Generate final report
    const report = this.generateFinalReport();
    
    // Notify the browser
    if (this.browserWindow && this.browserWindow.webContents) {
      this.browserWindow.webContents.send('ai-monitoring-stopped', report);
    }
    
    return report;
  }

  // Generate final report
  generateFinalReport() {
    const report = this.aiEngine.generateSessionReport();
    
    // Add browser-specific data
    report.browserInfo = {
      userAgent: this.browserWindow.webContents.getUserAgent(),
      url: this.browserWindow.webContents.getURL(),
      title: this.browserWindow.webContents.getTitle()
    };
    
    // Save report to secure storage
    this.saveReportToStorage(report);
    
    return report;
  }

  // Storage methods
  storeAnswerAnalysis(questionId, answer, analysis) {
    // Store in secure local storage
    const storage = require('electron-store');
    const store = new storage({ name: 'ai-analysis' });
    
    const analyses = store.get('answer-analyses', {});
    analyses[questionId] = {
      answer: answer.substring(0, 100) + '...', // Store truncated for privacy
      analysis,
      timestamp: Date.now()
    };
    
    store.set('answer-analyses', analyses);
  }

  logAnomalyToStorage(anomaly) {
    const storage = require('electron-store');
    const store = new storage({ name: 'ai-anomalies' });
    
    const anomalies = store.get('anomalies', []);
    anomalies.push(anomaly);
    
    // Keep only last 1000 anomalies
    if (anomalies.length > 1000) {
      anomalies.splice(0, anomalies.length - 1000);
    }
    
    store.set('anomalies', anomalies);
  }

  saveReportToStorage(report) {
    const storage = require('electron-store');
    const store = new storage({ name: 'ai-reports' });
    
    const reports = store.get('reports', []);
    reports.push(report);
    
    // Keep only last 50 reports
    if (reports.length > 50) {
      reports.splice(0, reports.length - 50);
    }
    
    store.set('reports', reports);
  }

  // Severity handlers
  handleHighSeverityAnomaly(anomaly) {
    // High severity: Immediate action required
    console.log('🚨 HIGH SEVERITY ANOMALY:', anomaly.type);
    
    // Could implement:
    // - Screenshot capture
    // - Immediate admin notification
    // - Exam pause/warning
  }

  handleMediumSeverityAnomaly(anomaly) {
    // Medium severity: Warning to student
    console.log('⚠️ MEDIUM SEVERITY ANOMALY:', anomaly.type);
    
    // Show warning to student
    this.showWarningToStudent(anomaly);
  }

  handleLowSeverityAnomaly(anomaly) {
    // Low severity: Just log
    console.log('ℹ️ LOW SEVERITY ANOMALY:', anomaly.type);
  }

  showWarningToStudent(anomaly) {
    // Send warning to browser
    if (this.browserWindow && this.browserWindow.webContents) {
      this.browserWindow.webContents.send('show-ai-warning', {
        type: anomaly.type,
        message: this.getWarningMessage(anomaly.type)
      });
    }
  }

  getWarningMessage(anomalyType) {
    const messages = {
      'rapid_clicking': 'Please avoid rapid clicking. Take your time to read questions carefully.',
      'potential_copy_paste': 'Please type your answers manually. Copy-paste is not allowed.',
      'excessive_focus_loss': 'Please keep your focus on the exam window.',
      'suspicious_mouse_movement': 'Please use natural mouse movements.',
      'behavior_anomaly': 'Unusual behavior detected. Please continue normally.'
    };
    
    return messages[anomalyType] || 'Please follow exam guidelines.';
  }

  // Periodic analysis methods
  performPeriodicAnalysis() {
    // Get current exam state (would need to be implemented)
    const currentAnswers = this.getCurrentAnswers();
    const timeRemaining = this.getTimeRemaining();
    
    if (currentAnswers && timeRemaining) {
      const prediction = this.aiEngine.predictPerformance(currentAnswers, timeRemaining);
      
      if (prediction) {
        console.log('📊 Performance Prediction:', prediction);
        
        // Send to browser for student insights
        if (this.browserWindow && this.browserWindow.webContents) {
          this.browserWindow.webContents.send('performance-prediction', prediction);
        }
      }
    }
  }

  analyzeBehaviorTrends() {
    // Analyze recent behavior patterns
    const recentPatterns = this.aiEngine.sessionData.behaviorPatterns
      .filter(p => Date.now() - p.timestamp < 10 * 60 * 1000); // Last 10 minutes
    
    if (recentPatterns.length > 50) {
      // Analyze trends
      const trends = this.calculateBehaviorTrends(recentPatterns);
      
      console.log('📈 Behavior Trends:', trends);
      
      // Check for concerning trends
      if (trends.focusDecline > 0.3) {
        this.aiEngine.flagAnomaly('declining_focus', {
          trend: trends.focusDecline,
          severity: 'medium'
        });
      }
    }
  }

  calculateBehaviorTrends(patterns) {
    // Simplified trend analysis
    const clickEvents = patterns.filter(p => p.type === 'click');
    const focusEvents = patterns.filter(p => p.type === 'focus');
    
    return {
      clickFrequency: clickEvents.length / 10, // per minute
      focusDecline: this.calculateFocusDecline(focusEvents),
      activityLevel: patterns.length / 10 // events per minute
    };
  }

  calculateFocusDecline(focusEvents) {
    // Calculate if focus is declining over time
    if (focusEvents.length < 4) return 0;
    
    const blurEvents = focusEvents.filter(e => e.data.type === 'blur');
    const recentBlurs = blurEvents.filter(e => Date.now() - e.timestamp < 5 * 60 * 1000);
    const olderBlurs = blurEvents.filter(e => 
      Date.now() - e.timestamp >= 5 * 60 * 1000 && 
      Date.now() - e.timestamp < 10 * 60 * 1000
    );
    
    return recentBlurs.length > olderBlurs.length ? 
      (recentBlurs.length - olderBlurs.length) / Math.max(olderBlurs.length, 1) : 0;
  }

  // Placeholder methods (to be implemented based on exam interface)
  getCurrentAnswers() {
    // Would extract current answers from exam interface
    return null;
  }

  getTimeRemaining() {
    // Would get remaining time from exam timer
    return null;
  }
}

module.exports = BrowserAIIntegration;