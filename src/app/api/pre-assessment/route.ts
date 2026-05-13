import { NextRequest, NextResponse } from 'next/server';

const TARGET_SERVER_BASE_URL =
  process.env.SERVER_BASE_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const backendResponse = await fetch(
      `${TARGET_SERVER_BASE_URL}/api/pre-assessment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      }
    );

    const backendPayload = await backendResponse.json().catch(() => null);

    if (!backendResponse.ok) {
      return NextResponse.json(
        backendPayload || { detail: 'Pre-assessment request failed.' },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(backendPayload);
  } catch (error) {
    console.error('Error in /api/pre-assessment:', error);
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? error.message
            : 'Unexpected pre-assessment error occurred.',
      },
      { status: 500 }
    );
  }
}
