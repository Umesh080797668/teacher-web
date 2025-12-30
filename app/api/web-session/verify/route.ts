import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    // In a real implementation, you'd check if the session exists and is valid
    // For now, just create a JWT token

    const token = jwt.sign(
      { sessionId, type: 'web' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 });
  }
}