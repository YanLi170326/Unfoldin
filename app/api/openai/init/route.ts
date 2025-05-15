import { NextResponse } from 'next/server';
import { initOpenAI } from '@/lib/voice';

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { message: 'API key is required' },
        { status: 400 }
      );
    }

    // Initialize OpenAI with the provided API key
    initOpenAI(apiKey);

    return NextResponse.json(
      { message: 'OpenAI initialized successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error initializing OpenAI:', error);
    return NextResponse.json(
      { message: 'Failed to initialize OpenAI' },
      { status: 500 }
    );
  }
} 