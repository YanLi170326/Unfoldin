import OpenAI from 'openai';

// Initialize OpenAI client
let openai: OpenAI | null = null;

export const initOpenAI = (apiKey: string) => {
  openai = new OpenAI({
    apiKey,
  });
};

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer | null> {
  if (!openai) {
    console.error('OpenAI client not initialized');
    throw new Error('OpenAI client not initialized. Please provide a valid API key.');
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