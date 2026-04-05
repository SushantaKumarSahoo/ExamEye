import { NextResponse } from 'next/server';

// In-memory storage for WebRTC signaling
// In production, use Redis or a proper signaling server
const signals = new Map();
const connections = new Map();

export async function POST(request) {
  try {
    const { type, from, to, signal, examId } = await request.json();
    
    console.log('📡 WebRTC Signal:', type, 'from:', from, 'to:', to);
    
    if (type === 'offer' || type === 'answer' || type === 'ice-candidate') {
      // Store signal for the recipient
      const key = `${examId}_${to}`;
      if (!signals.has(key)) {
        signals.set(key, []);
      }
      signals.get(key).push({ type, from, signal, timestamp: Date.now() });
      
      // Clean up old signals (older than 30 seconds)
      const thirtySecondsAgo = Date.now() - 30000;
      signals.forEach((value, key) => {
        signals.set(key, value.filter(s => s.timestamp > thirtySecondsAgo));
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WebRTC signaling error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const examId = searchParams.get('examId');
    
    const key = `${examId}_${userId}`;
    const userSignals = signals.get(key) || [];
    
    // Clear retrieved signals
    signals.delete(key);
    
    return NextResponse.json({ signals: userSignals });
  } catch (error) {
    console.error('WebRTC signal retrieval error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
