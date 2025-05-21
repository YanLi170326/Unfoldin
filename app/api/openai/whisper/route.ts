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
    
    // Warning for very large files that might exceed API limits
    if (audioFile.size > 25 * 1024 * 1024) { // 25MB limit for Whisper API
      console.warn('Audio file is very large and may exceed API limits:', audioFile.size);
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
    
    // Set a longer timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    // Call OpenAI API directly
    try {
      console.log('Starting transcription with Whisper API');
      const startTime = Date.now();
      
      const response = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      });
      
      const processingTime = Date.now() - startTime;
      
      // Return the transcription text
      console.log('Transcription successful:', {
        textLength: response.text.length,
        processingTime: `${processingTime}ms`,
        browser: browserInfo
      });
      
      clearTimeout(timeoutId); // Clear the timeout
      return NextResponse.json({ text: response.text });
    } catch (openaiError) {
      console.error('OpenAI transcription error:', openaiError);
      clearTimeout(timeoutId); // Clear the timeout
      
      // Check if error is due to timeout
      if (openaiError instanceof Error && openaiError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Transcription request timed out. The audio might be too long to process.' },
          { status: 408 } // Request Timeout status
        );
      }
      
      // Try again with a different file extension if the first attempt fails
      if (fileExtension !== 'mp3') {
        try {
          console.log('Retrying with mp3 extension');
          const retryFile = new File([buffer], 'audio.mp3', { type: 'audio/mpeg' });
          
          const retryStartTime = Date.now();
          const retryResponse = await openai.audio.transcriptions.create({
            file: retryFile,
            model: 'whisper-1',
          });
          
          const retryProcessingTime = Date.now() - retryStartTime;
          console.log('Retry transcription successful', {
            processingTime: `${retryProcessingTime}ms`
          });
          
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
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Try to provide more helpful error messages for common issues
      if (errorMessage.includes('file too large')) {
        errorMessage = 'Audio file is too large. Please limit recordings to under 25MB.';
        statusCode = 413; // Payload Too Large
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Processing timed out. Try recording a shorter message.';
        statusCode = 408; // Request Timeout
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

export const config = {
  api: {
    bodyParser: false, // Don't parse the body, we're using formData
  },
}; 