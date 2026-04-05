import { NextResponse } from 'next/server';

// This endpoint helps test WebRTC from Electron browser
// It acts as a simple responder to verify signaling works

export async function POST(request) {
  try {
    const { action, testId, signal } = await request.json();
    
    console.log('📡 [Electron WebRTC Test]', action, 'testId:', testId);
    
    if (action === 'ping') {
      // Simple ping test
      return NextResponse.json({
        success: true,
        message: 'WebRTC signaling server is reachable',
        timestamp: new Date().toISOString(),
        testId
      });
    }
    
    if (action === 'offer-received') {
      // Acknowledge offer received
      return NextResponse.json({
        success: true,
        message: 'Offer received by server',
        testId,
        note: 'In production, admin would respond with answer'
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test request processed',
      testId
    });
    
  } catch (error) {
    console.error('Electron WebRTC test error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');
    
    return NextResponse.json({
      success: true,
      message: 'WebRTC test endpoint is working',
      testId,
      endpoints: {
        signal: '/api/webrtc/signal',
        test: '/api/webrtc/test',
        electronTest: '/api/webrtc/electron-test'
      },
      instructions: {
        step1: 'Send POST with action=ping to test connectivity',
        step2: 'Use /api/webrtc/signal for actual WebRTC signaling',
        step3: 'Open /test-webrtc in browser to act as receiver'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
