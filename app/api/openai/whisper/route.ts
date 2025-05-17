import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Ensure API key is set
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Get form data with audio file
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert to a proper File object that OpenAI SDK can use
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const file = new File([buffer], 'audio.webm', { type: audioFile.type });
    
    // Call OpenAI API directly
    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });

    // Return the transcription text
    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false, // Don't parse the body, we're using formData
  },
}; 