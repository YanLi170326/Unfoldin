import OpenAI from 'openai';

// Initialize OpenAI client
let openai: OpenAI | null = null;

// Lazy initialize OpenAI client
function getOpenAIClient() {
  if (!openai) {
    // Only use the server-side environment variable, not the public one
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer | null> {
  if (!openai) {
    try {
      openai = getOpenAIClient();
    } catch (error) {
      console.error('OpenAI client not initialized');
      throw new Error('OpenAI client not initialized. Please provide a valid API key.');
    }
  }

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const buffer = await mp3.arrayBuffer();
    return buffer;
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    if (error instanceof Error) {
      throw new Error(`OpenAI Speech Synthesis failed: ${error.message}`);
    }
    throw new Error('Unknown error occurred during speech synthesis');
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const client = getOpenAIClient();
    
    // Determine the audio file type based on the blob MIME type
    let fileName = 'recording.webm';
    let fileType = audioBlob.type || 'audio/webm';
    
    // Map MIME type to appropriate file extension
    if (fileType.includes('webm')) fileName = 'recording.webm';
    else if (fileType.includes('ogg')) fileName = 'recording.ogg';
    else if (fileType.includes('mp4')) fileName = 'recording.mp4';
    else if (fileType.includes('mp3') || fileType.includes('mpeg')) fileName = 'recording.mp3';
    else if (fileType.includes('wav')) fileName = 'recording.wav';
    else {
      // Default to webm if unknown type
      fileType = 'audio/webm';
      fileName = 'recording.webm';
    }
    
    // Log detailed information about the audio we're processing
    console.log('Preparing to transcribe audio:', {
      size: audioBlob.size,
      type: fileType,
      filename: fileName
    });
    
    // Check if audio has content
    if (audioBlob.size === 0) {
      throw new Error('Empty audio recording provided');
    }
    
    // Call OpenAI API
    try {
      const response = await client.audio.transcriptions.create({
        file: new File([audioBlob], fileName, { type: fileType }),
        model: 'whisper-1',
      });
      
      console.log('Transcription successful:', {
        textLength: response.text.length
      });
      
      return response.text;
    } catch (initialError) {
      console.error('Initial transcription attempt failed:', initialError);
      
      // If first attempt fails, try with MP3 format as a fallback
      // This can help with some browser compatibility issues
      try {
        console.log('Retrying transcription with MP3 format');
        const retryResponse = await client.audio.transcriptions.create({
          file: new File([audioBlob], 'recording.mp3', { type: 'audio/mpeg' }),
          model: 'whisper-1',
        });
        
        console.log('Retry transcription successful');
        return retryResponse.text;
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
        
        // If client-side processing fails, fall back to the server API
        console.log('Falling back to server API');
        const formData = new FormData();
        formData.append('audio', audioBlob, fileName);
        
        const response = await fetch('/api/openai/whisper', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server API error: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.text) {
          throw new Error('No transcription returned from server API');
        }
        
        return data.text;
      }
    }
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Audio recorder class for the fallback solution
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private mimeType: string = 'audio/webm';
  
  private getBestMimeType() {
    // Try to determine the best supported MIME type for this browser
    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/aac'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`Using supported MIME type: ${type}`);
        return type;
      }
    }
    
    // Default fallback
    console.log('No preferred MIME types supported, using default');
    return 'audio/webm';
  }
  
  async start(): Promise<void> {
    try {
      this.audioChunks = [];
      
      // Request microphone with audio constraints optimized for speech
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100, // Standard for most browsers
          channelCount: 1 // Mono audio is best for speech recognition
        }
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Get the best supported MIME type
      this.mimeType = this.getBestMimeType();
      
      // Create MediaRecorder with optimized options
      const options: MediaRecorderOptions = {
        mimeType: this.mimeType,
        audioBitsPerSecond: 128000 // 128kbps is good for speech
      };
      
      try {
        this.mediaRecorder = new MediaRecorder(this.stream, options);
      } catch (err) {
        // If options fail, try without options
        console.warn('Failed to create MediaRecorder with options, trying without:', err);
        this.mediaRecorder = new MediaRecorder(this.stream);
      }
      
      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      });
      
      // Log MediaRecorder info for debugging
      console.log('MediaRecorder started with:', {
        mimeType: this.mediaRecorder.mimeType,
        state: this.mediaRecorder.state,
        audioBitsPerSecond: this.mediaRecorder.audioBitsPerSecond
      });
      
      // Use a shorter timeslice for more frequent dataavailable events
      // This helps ensure we capture audio in case of errors
      this.mediaRecorder.start(1000); // Get data every 1 second
    } catch (error) {
      console.error('Error starting audio recording:', error);
      
      // Provide more detailed error information
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error('Microphone permission denied. Please enable it in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please check your device.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          throw new Error('Cannot access microphone. It may be in use by another application.');
        } else if (error.name === 'AbortError') {
          throw new Error('Recording aborted. Please try again.');
        } else if (error.name === 'SecurityError') {
          throw new Error('Security error. Secure context (HTTPS) required for microphone access.');
        }
      }
      
      throw new Error(`Failed to start audio recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }
      
      // Create a listener for the 'stop' event
      const handleStop = () => {
        try {
          // Remove the event listener to prevent memory leaks
          this.mediaRecorder?.removeEventListener('stop', handleStop);
          
          if (this.audioChunks.length === 0) {
            reject(new Error('No audio data captured'));
            return;
          }
          
          // Determine correct MIME type for the blob
          let blobType = this.mimeType;
          if (!blobType || blobType === '') {
            blobType = 'audio/webm'; // Default fallback
          }
          
          // Create the audio blob
          const audioBlob = new Blob(this.audioChunks, { type: blobType });
          
          // Log blob info for debugging
          console.log('Audio recorded:', { 
            size: audioBlob.size, 
            type: audioBlob.type, 
            chunks: this.audioChunks.length 
          });
          
          // Stop all tracks in the stream
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }
          
          // If the blob is too small, it may indicate a recording problem
          if (audioBlob.size < 1000) {
            console.warn('Warning: Audio blob is very small, recording may be empty');
          }
          
          resolve(audioBlob);
        } catch (error) {
          reject(new Error(`Error finalizing recording: ${error instanceof Error ? error.message : String(error)}`));
        }
      };
      
      // Add the event listener and stop recording
      this.mediaRecorder.addEventListener('stop', handleStop);
      
      // Add error handling for the stopping process
      this.mediaRecorder.addEventListener('error', (event) => {
        reject(new Error(`MediaRecorder error during stop: ${event.error}`));
      });
      
      // Only call stop if not already stopped
      if (this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
        } catch (error) {
          reject(new Error(`Error stopping MediaRecorder: ${error instanceof Error ? error.message : String(error)}`));
        }
      } else {
        // If already inactive, manually trigger the stop handler
        handleStop();
      }
    });
  }
  
  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (error) {
        console.error('Error stopping MediaRecorder during cancel:', error);
      }
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.audioChunks = [];
  }
}

export function playAudio(audioBuffer: ArrayBuffer) {
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  
  return {
    play: () => audio.play(),
    pause: () => audio.pause(),
    onEnded: (callback: () => void) => {
      audio.onended = callback;
    },
    cleanup: () => URL.revokeObjectURL(url)
  };
} 