// ExamEye Secure Browser Monitor
// This script should be included in exam pages to communicate with the Electron browser

(function() {
  'use strict';

  // Check if running in Electron secure browser
  const isSecureBrowser = typeof window.electronAPI !== 'undefined';
  
  if (!isSecureBrowser) {
    console.warn('Not running in ExamEye Secure Browser - security features disabled');
    return;
  }

  // Exam state
  let examActive = false;
  let focusLossCount = 0;
  let examTerminated = false;

  // Initialize exam monitoring
  window.ExamMonitor = {
    // Start exam monitoring
    startExam: function() {
      if (examActive) return;
      
      examActive = true;
      window.examInProgress = true;
      
      // Notify Electron that exam has started
      window.electronAPI.send('exam-started', {
        timestamp: new Date().toISOString()
      });
      
      console.log('Exam monitoring started');
      
      // Set up listeners
      this.setupListeners();
    },

    // End exam monitoring
    endExam: function() {
      examActive = false;
      window.examInProgress = false;
      
      // Notify Electron that exam has ended
      window.electronAPI.send('exam-ended', {
        timestamp: new Date().toISOString()
      });
      
      console.log('Exam monitoring ended');
    },

    // Setup event listeners
    setupListeners: function() {
      // Listen for focus loss
      window.electronAPI.on('focus-lost', (data) => {
        focusLossCount++;
        console.error('CRITICAL: Browser focus lost!', data);
        
        // Show warning to user
        this.showWarning('⚠️ Warning: Browser focus lost! Do not switch windows or tabs.');
        
        // Log the violation
        this.logViolation('focus-loss', data);
      });

      // Listen for focus regained
      window.electronAPI.on('focus-regained', (data) => {
        console.log('Browser focus regained', data);
      });

      // Listen for exam termination
      window.electronAPI.on('terminate-exam', (data) => {
        console.error('EXAM TERMINATED:', data.reason);
        examTerminated = true;
        
        // Auto-submit exam
        this.terminateExam(data.reason);
      });

      // Listen for close attempts
      window.electronAPI.on('close-attempt', (data) => {
        console.warn('Close attempt blocked:', data.message);
        this.showWarning('⚠️ Cannot close browser during exam!');
      });
    },

    // Terminate exam due to violation
    terminateExam: function(reason) {
      // Show termination message
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        font-family: Arial, sans-serif;
      `;
      
      overlay.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <h1 style="font-size: 48px; color: #ff4444; margin-bottom: 20px;">⚠️ EXAM TERMINATED</h1>
          <p style="font-size: 24px; margin-bottom: 30px;">${reason}</p>
          <p style="font-size: 18px; color: #ffaa00;">Your exam has been automatically submitted.</p>
          <p style="font-size: 16px; margin-top: 20px;">This window will close in 5 seconds...</p>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      // Try to submit exam
      if (typeof window.submitExam === 'function') {
        window.submitExam(true); // Force submit
      } else {
        // Trigger submit button click if exists
        const submitBtn = document.querySelector('[data-exam-submit]') || 
                         document.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
        }
      }
      
      // Close browser after 5 seconds
      setTimeout(() => {
        this.endExam();
        if (window.electronAPI) {
          window.electronAPI.send('exam-completed', {});
        }
      }, 5000);
    },

    // Show warning message
    showWarning: function(message) {
      // Create warning toast
      const warning = document.createElement('div');
      warning.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff4444;
        color: white;
        padding: 15px 30px;
        border-radius: 8px;
        font-size: 18px;
        font-weight: bold;
        z-index: 999998;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease-out;
      `;
      
      warning.textContent = message;
      document.body.appendChild(warning);
      
      // Remove after 5 seconds
      setTimeout(() => {
        warning.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => warning.remove(), 300);
      }, 5000);
    },

    // Log security violation
    logViolation: function(type, data) {
      // Send to server
      fetch('/api/exam/log-violation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: new Date().toISOString(),
          examId: window.currentExamId || null
        })
      }).catch(err => console.error('Failed to log violation:', err));
    },

    // Get current status
    getStatus: function() {
      return {
        examActive,
        focusLossCount,
        examTerminated,
        isSecureBrowser
      };
    }
  };

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
    @keyframes slideUp {
      from {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      to {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Auto-start monitoring if on exam page
  if (window.location.pathname.includes('/exam/') || window.location.pathname.includes('/student/exam')) {
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.ExamMonitor.startExam(), 1000);
      });
    } else {
      setTimeout(() => window.ExamMonitor.startExam(), 1000);
    }
  }

  // Warn before page unload during exam
  window.addEventListener('beforeunload', (e) => {
    if (examActive && !examTerminated) {
      e.preventDefault();
      e.returnValue = 'Exam is in progress. Are you sure you want to leave?';
      return e.returnValue;
    }
  });

  console.log('ExamEye Secure Browser Monitor initialized');
})();
