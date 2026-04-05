// Example: How to integrate WebRTC into the admin live monitor

// 1. Import the WebRTC component at the top of app/admin/live-monitor/[examId]/page.js
import WebRTCStudentView from '../../../../components/WebRTCStudentView';

// 2. Add a toggle state to switch between screenshot and WebRTC modes
const [viewMode, setViewMode] = useState('webrtc'); // 'webrtc' or 'screenshot'

// 3. Replace the Camera Feed section with this code:

{/* Camera Feed with Mode Toggle */}
<div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
      📸 Live Camera Feed
    </h3>
    
    {/* Toggle Buttons */}
    <div style={{ display: 'flex', gap: '0.5rem', background: '#f3f4f6', padding: '0.25rem', borderRadius: '0.5rem' }}>
      <button
        onClick={() => setViewMode('webrtc')}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          border: 'none',
          cursor: 'pointer',
          fontWeight: '500',
          fontSize: '0.875rem',
          background: viewMode === 'webrtc' ? '#3b82f6' : 'transparent',
          color: viewMode === 'webrtc' ? 'white' : '#6b7280',
          transition: 'all 0.2s'
        }}
      >
        🎥 WebRTC (Live)
      </button>
      <button
        onClick={() => setViewMode('screenshot')}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          border: 'none',
          cursor: 'pointer',
          fontWeight: '500',
          fontSize: '0.875rem',
          background: viewMode === 'screenshot' ? '#3b82f6' : 'transparent',
          color: viewMode === 'screenshot' ? 'white' : '#6b7280',
          transition: 'all 0.2s'
        }}
      >
        📷 Screenshot
      </button>
    </div>
  </div>
  
  {/* Conditional Rendering */}
  {viewMode === 'webrtc' ? (
    <WebRTCStudentView
      examId={examId}
      studentId={selectedStudent._id}
      studentName={selectedStudent.name}
      studentEmail={selectedStudent.email}
    />
  ) : (
    <StudentCameraView
      examId={examId}
      studentId={selectedStudent._id}
      studentName={selectedStudent.name}
      studentEmail={selectedStudent.email}
    />
  )}
  
  <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem' }}>
    {viewMode === 'webrtc' 
      ? 'Real-time video stream via WebRTC' 
      : 'Updates every 2 seconds • Stored in memory only'
    }
  </p>
</div>

// ============================================
// Student Side Integration
// ============================================

// In the student exam interface (e.g., secure-exam-browser or exam page):

// 1. Import the component
import WebRTCStudentSender from '../components/WebRTCStudentSender';

// 2. Add it to your exam interface component (it will be hidden)
export default function ExamInterface({ examId, studentId }) {
  return (
    <div>
      {/* Your existing exam UI */}
      
      {/* Add WebRTC sender - it's hidden but streams video to admin */}
      <WebRTCStudentSender
        examId={examId}
        studentId={studentId}
      />
      
      {/* Rest of your exam interface */}
    </div>
  );
}

// ============================================
// Testing Checklist
// ============================================

/*
Before integrating into production:

1. ✅ Test the standalone page at /test-webrtc
   - Open in two browser windows
   - Test sender and receiver roles
   - Verify video appears on both sides
   - Check connection logs for errors

2. ✅ Verify API endpoint
   - Visit /api/webrtc/test
   - Should return success message

3. ⏳ Test in admin panel
   - Navigate to live monitor
   - Select a student
   - Toggle to WebRTC mode
   - Verify connection status

4. ⏳ Test student side
   - Start an exam as a student
   - Check if camera indicator appears
   - Verify admin can see the stream

5. ⏳ Test edge cases
   - Connection loss/recovery
   - Multiple students simultaneously
   - Different browsers
   - Mobile devices

6. ⏳ Production readiness
   - Add Redis for signaling
   - Configure TURN servers
   - Add authentication
   - Implement monitoring
*/

// ============================================
// Environment Variables (for production)
// ============================================

/*
Add to .env:

# WebRTC Configuration
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=your-username
TURN_PASSWORD=your-password

# Redis (for signaling in production)
REDIS_URL=your-redis-url
REDIS_TOKEN=your-redis-token
*/

// ============================================
// Troubleshooting Common Issues
// ============================================

/*
Issue: "Connection failed"
Solution: 
- Check if both peers granted camera/microphone permissions
- Verify STUN servers are accessible
- Try adding TURN servers for NAT traversal

Issue: "No video appears"
Solution:
- Check browser console for getUserMedia errors
- Verify camera is not in use by another app
- Test in Chrome/Firefox (best WebRTC support)

Issue: "Connection drops frequently"
Solution:
- Check network stability
- Add TURN servers
- Reduce video quality/bitrate
- Implement better reconnection logic

Issue: "Signaling not working"
Solution:
- Verify /api/webrtc/signal endpoint is accessible
- Check if signals are being stored/retrieved
- Look for CORS issues
- Verify examId and userId are correct
*/
