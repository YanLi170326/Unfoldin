import { NextResponse } from 'next/server';
import { initOpenAI } from '@/lib/voice';

export async function POST(request: Request) {
  try {
    // Use the API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { message: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Initialize OpenAI with the API key from environment
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