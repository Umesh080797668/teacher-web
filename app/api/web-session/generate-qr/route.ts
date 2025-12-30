import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json();

    // Generate a unique session ID
    const sessionId = randomBytes(16).toString('hex');

    // In a real implementation, you'd store this session in a database with expiration
    // For now, just return the session ID

    return NextResponse.json({
      sessionId,
      qrData: `web-login:${sessionId}:${companyId || ''}`
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate QR' }, { status: 500 });
  }
}