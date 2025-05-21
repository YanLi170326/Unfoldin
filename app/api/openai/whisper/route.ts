import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to detect browser from user agent
function detectBrowser(userAgent: string) {
  const browsers = {
    isChrome: /Chrome/.test(userAgent) && !/Edge|Edg|OPR|Opera/.test(userAgent),
    isFirefox: /Firefox/.test(userAgent),
    isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
    isEdge: /Edge|Edg/.test(userAgent),
    isArc: /Chrome/.test(userAgent) && /Arc/.test(userAgent),
    isOpera: /OPR|Opera/.test(userAgent),
    isMobile: /Mobi|Android|iPhone|iPad|iPod/.test(userAgent),
    isIOS: /iPad|iPhone|iPod/.test(userAgent) || /Mac/.test(userAgent) && /Mobile/.test(userAgent)
  };
  
  return browsers;
}

export async function POST(request: NextRequest) {
  try {
    // Ensure API key is set
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Detect browser from user agent
    const userAgent = request.headers.get('user-agent') || '';
    const browserInfo = detectBrowser(userAgent);
    
    console.log('Whisper API request from browser:', browserInfo);

    // Get form data with audio file
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Log audio file details
    console.log('Audio file received:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      browser: browserInfo
    });
    
    // Ensure file has some content
    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Empty audio file provided' },
        { status: 400 }
      );
    }
    
    // Determine file extension based on mime type or fallback to webm
    let fileExtension = 'webm';
    if (audioFile.type) {
      if (audioFile.type.includes('webm')) fileExtension = 'webm';
      else if (audioFile.type.includes('ogg')) fileExtension = 'ogg';
      else if (audioFile.type.includes('mp4')) fileExtension = 'mp4';
      else if (audioFile.type.includes('mp3') || audioFile.type.includes('mpeg')) fileExtension = 'mp3';
      else if (audioFile.type.includes('wav')) fileExtension = 'wav';
    }

    // Convert to a proper File object that OpenAI SDK can use
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const file = new File([buffer], `audio.${fileExtension}`, { type: audioFile.type || `audio/${fileExtension}` });
    
    // Call OpenAI API directly
    try {
      const response = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      });

      // Return the transcription text
      console.log('Transcription successful:', {
        textLength: response.text.length,
        browser: browserInfo
      });
      
      return NextResponse.json({ text: response.text });
    } catch (openaiError) {
      console.error('OpenAI transcription error:', openaiError);
      
      // Try again with a different file extension if the first attempt fails
      if (fileExtension !== 'mp3') {
        try {
          console.log('Retrying with mp3 extension');
          const retryFile = new File([buffer], 'audio.mp3', { type: 'audio/mpeg' });
          
          const retryResponse = await openai.audio.transcriptions.create({
            file: retryFile,
            model: 'whisper-1',
          });
          
          console.log('Retry transcription successful');
          return NextResponse.json({ text: retryResponse.text });
        } catch (retryError) {
          console.error('Retry transcription also failed:', retryError);
          throw openaiError; // Throw the original error
        }
      } else {
        throw openaiError;
      }
    }
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