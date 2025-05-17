'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PauseCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AudioRecorder, transcribeAudio } from '@/lib/voice';

interface FallbackSpeechInputProps {
  onTranscript: (text: string) => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  autoSubmit?: boolean;
}

export default function FallbackSpeechInput({
  onTranscript,
  isListening,
  setIsListening,
  autoSubmit = false,
}: FallbackSpeechInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Check browser for permission status on mount
  useEffect(() => {
    const checkPermission = async () => {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (result.state === 'denied') {
            setPermissionDenied(true);
          }
          
          // Listen for permission changes
          result.onchange = () => {
            setPermissionDenied(result.state === 'denied');
          };
        } catch (error) {
          console.log('Permission check not supported');
        }
      }
    };
    
    checkPermission();
  }, []);

  // Update parent component's isListening state when our state changes
  useEffect(() => {
    if (!isRecording && isListening) {
      setIsListening(false);
    }
  }, [isRecording, isListening, setIsListening]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Initialize recorder if not already done
      if (!recorderRef.current) {
        recorderRef.current = new AudioRecorder();
      }

      // Request microphone permissions
      await recorderRef.current.start();
      
      setIsRecording(true);
      setIsListening(true);
      
      toast.info('Recording... Click the button again to stop and process speech.');
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      if (error instanceof Error && (error.name === 'NotAllowedError' || error.message.includes('permission'))) {
        setPermissionDenied(true);
        toast.error('Microphone permission denied. Please enable it in your browser settings.');
      } else {
        toast.error('Could not start recording. Please check your microphone.');
      }
      
      setIsRecording(false);
      setIsListening(false);
    }
  }, [setIsListening]);

  // Process audio using either the API or direct client-side approach
  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      // Try client-side processing first using the imported function
      try {
        const text = await transcribeAudio(audioBlob);
        return text;
      } catch (clientError) {
        console.error('Client-side processing failed, falling back to API:', clientError);
        
        // Fall back to API if client-side fails
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        const response = await fetch('/api/openai/whisper', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.text) {
          throw new Error('No transcription returned');
        }
        
        return data.text;
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    }
  }, []);

  // Stop recording and process audio
  const stopRecording = useCallback(async () => {
    if (!recorderRef.current) {
      setIsRecording(false);
      setIsListening(false);
      return;
    }

    try {
      setIsProcessing(true);
      toast.info('Processing speech...');
      
      // Stop recording and get the audio blob
      const audioBlob = await recorderRef.current.stop();
      
      // Process the audio
      const transcript = await processAudio(audioBlob);
      
      // Update the transcript
      onTranscript(transcript);
      
      // Automatically submit if enabled
      if (autoSubmit) {
        const event = new CustomEvent('speech-submit', { detail: { transcript } });
        document.dispatchEvent(event);
      }
      
      toast.success('Speech recognition successful');
    } catch (error) {
      console.error('Error processing audio:', error);
      
      // Extract useful error message
      let errorMessage = 'Failed to process speech. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsRecording(false);
      setIsProcessing(false);
      setIsListening(false);
    }
  }, [onTranscript, autoSubmit, setIsListening, processAudio]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
      setIsRecording(false);
      setIsListening(false);
      toast.info('Recording cancelled');
    }
  }, [setIsListening]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      if (permissionDenied) {
        toast.error('Microphone permission denied. Please enable it in your browser settings and reload the page.');
        return;
      }
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording, permissionDenied]);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={isRecording ? "destructive" : isProcessing ? "secondary" : permissionDenied ? "secondary" : "outline"}
        size="icon"
        onClick={toggleRecording}
        disabled={isProcessing}
        title={
          permissionDenied
            ? "Microphone permission denied"
            : isRecording 
              ? "Click to stop recording and process" 
              : isProcessing 
                ? "Processing speech..." 
                : "Start voice recording (API method)"
        }
      >
        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      
      {isRecording && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          title="Cancel recording"
        >
          <PauseCircle className="h-4 w-4" />
        </Button>
      )}
      
      {isProcessing && (
        <div className="text-xs text-muted-foreground mt-1">
          Processing speech...
        </div>
      )}
    </div>
  );
} 