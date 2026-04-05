import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test endpoint to verify WebRTC API is accessible
    return NextResponse.json({
      success: true,
      message: 'WebRTC API is working',
      endpoints: {
        signal: '/api/webrtc/signal',
        test: '/api/webrtc/test'
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
