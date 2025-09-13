import { NextRequest, NextResponse } from 'next/server';
import { parseRequest } from '@/lib/parsing';

// Parse natural language request into scheduling constraints
export async function POST(request: NextRequest) {
  try {
    const { transcript, timezone, nowIso } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { success: false, error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Parse the transcript
    const parsed = parseRequest(transcript);

    return NextResponse.json({
      success: true,
      constraints: parsed.constraints,
      normalizedSummary: parsed.normalizedSummary,
      assumptions: parsed.assumptions,
    });
  } catch (error) {
    console.error('Error parsing request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
