import { NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/voice';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { message: 'Text is required' },
        { status: 400 }
      );
    }

    // Synthesize speech
    const audioBuffer = await synthesizeSpeech(text);
    
    if (!audioBuffer) {
      return NextResponse.json(
        { message: 'Failed to synthesize speech. Please check your OpenAI API key and permissions.' },
        { status: 500 }
      );
    }

    // Create a response with the audio buffer
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    let errorMessage = 'Failed to synthesize speech';
    
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
} 