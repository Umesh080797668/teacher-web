import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    // In a real implementation, you'd check if the session is authenticated
    // For now, just return a mock response

    return NextResponse.json({
      authenticated: true,
      sessionId
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check auth' }, { status: 500 });
  }
}