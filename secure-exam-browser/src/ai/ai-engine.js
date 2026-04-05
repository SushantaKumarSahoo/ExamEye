/**
 * ExamEye Offline AI Engine
 * Complete offline AI processing for exam monitoring and assistance
 * Lightweight version using pure JavaScript algorithms
 */

const natural = require('natural');
const sentiment = require('sentiment');
const { Matrix } = require('ml-matrix');

class OfflineAIEngine {
  constructor() {
    this.isInitialized = false;
    this.models = {};
    this.analyzers = {};
    this.sessionData = {
      behaviorPatterns: [],
      focusEvents: [],
      typingPatterns: [],
      anomalies: []
    };
    
    this.init();
  }

  async init() {
    console.log('🤖 Initializing Offline AI Engine...');
    
    try {
      // Initialize text analysis
      await this.initTextAnalysis();
      
      // Initialize behavior analysis
      await this.initBehaviorAnalysis();
      
      // Initialize face detection (if camera available)
      await this.initFaceDetection();
      
      // Initialize pattern recognition
      await this.initPatternRecognition();
      
      this.isInitialized = true;
      console.log('✅ Offline AI Engine initialized successfully');
      
    } catch (error) {
      console.error('❌ AI Engine initialization failed:', error);
    }
  }

  // Text Analysis & NLP
  async initTextAnalysis() {
    this.analyzers.sentiment = new sentiment();
    this.analyzers.tokenizer = new natural.WordTokenizer();
    this.analyzers.stemmer = natural.PorterStemmer;
    
    // Initialize text classification model
    this.models.textClassifier = await this.createTextClassificationModel();
    
    console.log('📝 Text analysis initialized');
  }

  // Behavior Pattern Analysis
  async initBehaviorAnalysis() {
    this.analyzers.behaviorClassifier = await this.createBehaviorModel();
    this.behaviorBaseline = {
      avgClickInterval: 0,
      avgScrollSpeed: 0,
      avgTypingSpeed: 0,
      focusRetentionRate: 0
    };
    
    console.log('👁️ Behavior analysis initialized');
  }

  // Face Detection & Tracking
  async initFaceDetection() {
    try {
      // Load face-api models (lightweight versions)
      this.models.faceDetection = await this.loadFaceDetectionModel();
      console.log('👤 Face detection initialized');
    } catch (error) {
      console.log('⚠️ Face detection not available (camera not found)');
    }
  }

  // Pattern Recognition
  async initPatternRecognition() {
    this.models.anomalyDetector = await this.createAnomalyDetectionModel();
    this.models.performancePredictor = await this.createPerformancePredictionModel();
    
    console.log('🔍 Pattern recognition initialized');
  }

  // Real-time Behavior Monitoring
  monitorBehavior(eventData) {
    if (!this.isInitialized) return;

    const timestamp = Date.now();
    const behaviorEvent = {
      timestamp,
      type: eventData.type,
      data: eventData.data
    };

    // Analyze different behavior types
    switch (eventData.type) {
      case 'click':
        this.analyzeClickPattern(behaviorEvent);
        break;
      case 'scroll':
        this.analyzeScrollPattern(behaviorEvent);
        break;
      case 'keypress':
        this.analyzeTypingPattern(behaviorEvent);
        break;
      case 'focus':
        this.analyzeFocusPattern(behaviorEvent);
        break;
      case 'mouse_movement':
        this.analyzeMouseMovement(behaviorEvent);
        break;
    }

    // Store for pattern analysis
    this.sessionData.behaviorPatterns.push(behaviorEvent);
    
    // Real-time anomaly detection
    this.detectAnomalies(behaviorEvent);
  }

  // Click Pattern Analysis
  analyzeClickPattern(event) {
    const recentClicks = this.sessionData.behaviorPatterns
      .filter(e => e.type === 'click' && Date.now() - e.timestamp < 10000)
      .slice(-10);

    if (recentClicks.length > 1) {
      const intervals = [];
      for (let i = 1; i < recentClicks.length; i++) {
        intervals.push(recentClicks[i].timestamp - recentClicks[i-1].timestamp);
      }
      
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = this.calculateVariance(intervals);
      
      // Detect rapid clicking (potential cheating)
      if (avgInterval < 100 && variance < 50) {
        this.flagAnomaly('rapid_clicking', {
          avgInterval,
          variance,
          severity: 'medium'
        });
      }
    }
  }

  // Typing Pattern Analysis
  analyzeTypingPattern(event) {
    const recentKeystrokes = this.sessionData.behaviorPatterns
      .filter(e => e.type === 'keypress' && Date.now() - e.timestamp < 30000);

    if (recentKeystrokes.length > 10) {
      const intervals = [];
      for (let i = 1; i < recentKeystrokes.length; i++) {
        intervals.push(recentKeystrokes[i].timestamp - recentKeystrokes[i-1].timestamp);
      }
      
      const avgTypingSpeed = 60000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length);
      const consistency = 1 - (this.calculateVariance(intervals) / Math.pow(intervals.reduce((a, b) => a + b, 0) / intervals.length, 2));
      
      // Detect copy-paste behavior (very fast, inconsistent typing)
      if (avgTypingSpeed > 200 && consistency < 0.3) {
        this.flagAnomaly('potential_copy_paste', {
          typingSpeed: avgTypingSpeed,
          consistency,
          severity: 'high'
        });
      }
      
      // Detect unusually slow typing (potential external assistance)
      if (avgTypingSpeed < 10 && recentKeystrokes.length > 50) {
        this.flagAnomaly('unusually_slow_typing', {
          typingSpeed: avgTypingSpeed,
          severity: 'low'
        });
      }
    }
  }

  // Focus Pattern Analysis
  analyzeFocusPattern(event) {
    this.sessionData.focusEvents.push(event);
    
    const recentFocusEvents = this.sessionData.focusEvents
      .filter(e => Date.now() - e.timestamp < 60000);
    
    const focusLossCount = recentFocusEvents
      .filter(e => e.data.type === 'blur').length;
    
    // Detect excessive focus loss (potential cheating)
    if (focusLossCount > 5) {
      this.flagAnomaly('excessive_focus_loss', {
        focusLossCount,
        timeWindow: '1 minute',
        severity: 'high'
      });
    }
  }

  // Mouse Movement Analysis
  analyzeMouseMovement(event) {
    const recentMovements = this.sessionData.behaviorPatterns
      .filter(e => e.type === 'mouse_movement' && Date.now() - e.timestamp < 5000)
      .slice(-20);

    if (recentMovements.length > 10) {
      // Calculate movement smoothness and patterns
      const movements = recentMovements.map(e => e.data);
      const smoothness = this.calculateMovementSmoothness(movements);
      const velocity = this.calculateAverageVelocity(movements);
      
      // Detect bot-like movements (too smooth or erratic)
      if (smoothness > 0.95 || smoothness < 0.1) {
        this.flagAnomaly('suspicious_mouse_movement', {
          smoothness,
          velocity,
          severity: 'medium'
        });
      }
    }
  }

  // Text Analysis for Answers
  analyzeAnswerText(text, questionContext) {
    if (!this.isInitialized) return null;

    const analysis = {
      sentiment: this.analyzers.sentiment.analyze(text),
      complexity: this.calculateTextComplexity(text),
      coherence: this.calculateCoherence(text),
      relevance: this.calculateRelevance(text, questionContext),
      originality: this.detectPotentialPlagiarism(text)
    };

    return analysis;
  }

  // Performance Prediction
  predictPerformance(currentAnswers, timeRemaining) {
    if (!this.models.performancePredictor) return null;

    const features = this.extractPerformanceFeatures(currentAnswers, timeRemaining);
    const prediction = this.models.performancePredictor.predict(features);
    
    return {
      estimatedScore: prediction.score,
      completionProbability: prediction.completion,
      recommendedPacing: prediction.pacing,
      riskFactors: prediction.risks
    };
  }

  // Anomaly Detection
  detectAnomalies(event) {
    if (!this.models.anomalyDetector) return;

    const features = this.extractBehaviorFeatures(event);
    const anomalyScore = this.models.anomalyDetector.predict(features);
    
    if (anomalyScore > 0.8) {
      this.flagAnomaly('behavior_anomaly', {
        score: anomalyScore,
        event: event.type,
        severity: anomalyScore > 0.9 ? 'high' : 'medium'
      });
    }
  }

  // Flag Anomaly
  flagAnomaly(type, data) {
    const anomaly = {
      timestamp: Date.now(),
      type,
      data,
      id: this.generateAnomalyId()
    };
    
    this.sessionData.anomalies.push(anomaly);
    
    // Emit event for UI notification
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ai-anomaly-detected', {
        detail: anomaly
      }));
    }
    
    // Emit IPC event for Electron monitoring integration
    if (typeof require !== 'undefined') {
      try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('ai-anomaly-detected', {
          anomalyType: type,
          details: JSON.stringify(data),
          severity: data.severity || 'medium',
          timestamp: anomaly.timestamp
        });
      } catch (e) {
        // Not in Electron environment
      }
    }
    
    console.log(`🚨 Anomaly detected: ${type}`, data);
  }

  // Generate Session Report
  generateSessionReport() {
    const report = {
      sessionId: this.generateSessionId(),
      timestamp: Date.now(),
      duration: this.getSessionDuration(),
      
      // Behavior Analysis
      behaviorSummary: {
        totalEvents: this.sessionData.behaviorPatterns.length,
        clickPatterns: this.analyzeBehaviorPatterns('click'),
        typingPatterns: this.analyzeBehaviorPatterns('keypress'),
        focusPatterns: this.analyzeFocusPatterns(),
        mousePatterns: this.analyzeBehaviorPatterns('mouse_movement')
      },
      
      // Anomalies
      anomalies: this.sessionData.anomalies,
      riskScore: this.calculateOverallRiskScore(),
      
      // Performance Insights
      performanceMetrics: this.calculatePerformanceMetrics(),
      
      // Recommendations
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  // Helper Methods
  calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  calculateTextComplexity(text) {
    const words = this.analyzers.tokenizer.tokenize(text);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = words.length / sentences.length;
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    const lexicalDiversity = uniqueWords / words.length;
    
    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence,
      lexicalDiversity,
      complexityScore: (avgWordsPerSentence * lexicalDiversity) / 10
    };
  }

  generateAnomalyId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getSessionDuration() {
    if (this.sessionData.behaviorPatterns.length === 0) return 0;
    const firstEvent = this.sessionData.behaviorPatterns[0].timestamp;
    return Date.now() - firstEvent;
  }

  // Model Creation Methods (simplified JavaScript-based models)
  async createTextClassificationModel() {
    // Simple rule-based text classifier
    return {
      predict: (text) => {
        const words = this.analyzers.tokenizer.tokenize(text.toLowerCase());
        const complexity = this.calculateTextComplexity(text);
        
        // Simple classification based on complexity and sentiment
        if (complexity.complexityScore > 0.7) return { category: 'complex', confidence: 0.8 };
        if (complexity.complexityScore < 0.3) return { category: 'simple', confidence: 0.7 };
        return { category: 'moderate', confidence: 0.6 };
      }
    };
  }

  async createBehaviorModel() {
    // Simple statistical behavior model
    return {
      predict: (features) => {
        // Simple anomaly detection based on statistical thresholds
        const score = features.reduce((sum, val, idx) => {
          const weight = [0.2, 0.15, 0.1, 0.15, 0.1, 0.1, 0.1, 0.05, 0.05][idx] || 0.1;
          return sum + (val * weight);
        }, 0);
        
        return score > 0.7 ? 1 : 0; // 1 = anomaly, 0 = normal
      }
    };
  }

  async createAnomalyDetectionModel() {
    // Simple statistical anomaly detection
    return {
      predict: (features) => {
        // Calculate z-score based anomaly detection
        const mean = features.reduce((a, b) => a + b, 0) / features.length;
        const variance = features.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / features.length;
        const stdDev = Math.sqrt(variance);
        
        const maxZScore = Math.max(...features.map(val => Math.abs((val - mean) / stdDev)));
        
        // Return anomaly score (0-1)
        return Math.min(maxZScore / 3, 1); // Normalize to 0-1 range
      }
    };
  }

  async createPerformancePredictionModel() {
    // Simple performance prediction based on current metrics
    return {
      predict: (features) => {
        // Features: [currentScore, timeSpent, questionsAnswered, avgTimePerQuestion, ...]
        const [currentScore = 0, timeSpent = 0, questionsAnswered = 0, avgTimePerQuestion = 0] = features;
        
        // Simple linear prediction
        const estimatedScore = Math.max(0, Math.min(100, currentScore + (questionsAnswered * 2)));
        const completionRate = Math.min(1, questionsAnswered / 20); // Assuming 20 questions
        const pacing = avgTimePerQuestion > 300 ? 'slow' : avgTimePerQuestion < 60 ? 'fast' : 'normal';
        const riskScore = timeSpent > 3600 ? 0.8 : timeSpent < 600 ? 0.3 : 0.1;
        
        return {
          score: estimatedScore,
          completion: completionRate,
          pacing: pacing,
          risks: riskScore
        };
      }
    };
  }
}

module.exports = OfflineAIEngine;