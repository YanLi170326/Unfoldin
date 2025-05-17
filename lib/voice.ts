import OpenAI from 'openai';

// Initialize OpenAI client
let openai: OpenAI | null = null;

// Lazy initialize OpenAI client
function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
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
    
    // Create a FormData object to send the audio file
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    
    // Call OpenAI API
    const response = await client.audio.transcriptions.create({
      file: new File([audioBlob], 'recording.webm', { type: audioBlob.type }),
      model: 'whisper-1',
    });
    
    return response.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio');
  }
}

// Audio recorder class for the fallback solution
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  
  async start(): Promise<void> {
    try {
      this.audioChunks = [];
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      });
      
      this.mediaRecorder.start();
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw new Error('Failed to start audio recording');
    }
  }
  
  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }
      
      this.mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Stop all tracks in the stream
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }
        
        resolve(audioBlob);
      });
      
      this.mediaRecorder.stop();
    });
  }
  
  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
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