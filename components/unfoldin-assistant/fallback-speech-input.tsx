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
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [minRecordingDuration] = useState(3000); // Minimum 3 seconds for better results
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      
      // Set the recording start time
      const startTime = Date.now();
      setRecordingStartTime(startTime);
      setRecordingDuration(0);
      
      // Start a timer to update the recording duration
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setRecordingDuration(elapsed);
      }, 100);
      
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
      console.log('Processing audio with Whisper API fallback', {
        size: audioBlob.size,
        type: audioBlob.type
      });
      
      // Try client-side processing first using the imported function
      try {
        console.log('Attempting client-side audio processing');
        const text = await transcribeAudio(audioBlob);
        console.log('Client-side audio processing successful');
        return text;
      } catch (clientError) {
        console.error('Client-side processing failed, falling back to API:', clientError);
        
        // Fall back to API if client-side fails
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        console.log('Sending audio to server API for processing');
        const response = await fetch('/api/openai/whisper', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          let errorJson;
          try {
            errorJson = await response.json();
          } catch (e) {
            // Not a JSON response, or other parsing error
            console.error('API response was not valid JSON:', response.statusText);
            const fetchError = new Error(`API request failed with status ${response.status}. ${response.statusText || 'Server error'}`);
            (fetchError as any).status = response.status; // Attach status for later handling
            throw fetchError;
          }
          // Log the detailed error from API
          console.error('Server API error response:', errorJson, 'Status:', response.status);
          // Create an error object that includes the message from the API and the status
          const apiError = new Error(errorJson.error || `API Error: Status ${response.status}`);
          (apiError as any).status = response.status; // Attach status for later handling
          throw apiError;
        }

        const data = await response.json();
        if (!data.text) {
          // This case might indicate an API success (200 OK) but no actual transcription text
          console.warn('API success but no transcription text returned:', data);
          const noTextError = new Error('No transcription text returned by API.');
          (noTextError as any).status = response.status; // include status for consistency
          throw noTextError;
        }

        console.log('Server API processing successful');
        return data.text;
      }
    } catch (error) {
      // Log the error that will be caught by stopRecording
      console.error('Error in processAudio, propagating to stopRecording:', error);
      // Ensure it's an error object and propagate it
      if (error instanceof Error) {
        throw error; // Propagate error (with status if attached)
      }
      // Fallback for non-Error objects thrown
      throw new Error('An unknown error occurred during audio processing.');
    }
  }, []);

  // Stop recording and process audio
  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!recorderRef.current) {
      setIsRecording(false);
      setIsListening(false);
      return;
    }

    try {
      const elapsed = recordingStartTime ? Date.now() - recordingStartTime : 0;
      if (elapsed < minRecordingDuration) {
        toast.warning(`Recording too short (${(elapsed / 1000).toFixed(1)}s), please record for at least ${minRecordingDuration / 1000}s`);
        // To prevent processing, we should return or set isRecording to false and exit.
        // However, to match previous behavior of attempting to process anyway:
        // setIsRecording(false); // User has to click again
        // return; 
        // For now, it proceeds to process as per original logic.
      }

      setIsProcessing(true);
      toast.info('Processing speech...');
      const audioBlob = await recorderRef.current.stop();
      const transcript = await processAudio(audioBlob);
      onTranscript(transcript);

      if (autoSubmit) {
        const event = new CustomEvent('speech-submit', { detail: { transcript } });
        document.dispatchEvent(event);
      }
      toast.success('Speech recognition successful');

    } catch (error) {
      console.error('Error caught in stopRecording:', error);
      const err = error as any; // To easily access potential 'status' property
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      const errorStatus = err?.status;

      if (errorStatus === 500 && (errorMessage.includes('OpenAI API key not configured') || errorMessage.includes('Invalid API key'))) {
        toast.error("Transcription service error. Please contact support or check server configuration.");
      } else if (errorStatus === 400 && errorMessage.includes('No audio file provided')) {
        // This specific message comes from the server route, not client-side check for audioBlob
        toast.error("No audio data received by server. Please try recording again.");
      } else if (errorMessage.includes('No transcription text returned by API')) {
        toast.warning('Transcription successful but no text was returned. The audio might have been silent.');
      } else if (errorMessage.includes('API request failed') || errorMessage.includes('API Error: Status')) {
        // Covers errors from non-JSON responses or explicitly set API errors from processAudio
        toast.error(errorMessage);
      }
      // Check for client-side specific errors (e.g., from transcribeAudio if it were to throw these directly here)
      // For now, these are assumed to be caught by the fallback logic in processAudio or are generic.
      // else if (clientProcessingErrorMessages.some(msg => errorMessage.includes(msg))) {
      // toast.error(`Client-side transcription error: ${errorMessage}`);
      // }
      else {
        // Generic fallback for other errors, including those from client-side transcribeAudio if they reach here
        toast.error(`Transcription failed: ${errorMessage}`);
      }
    } finally {
      setIsRecording(false);
      setIsProcessing(false);
      setIsListening(false);
      setRecordingDuration(0);
    }
  }, [onTranscript, autoSubmit, setIsListening, processAudio, recordingStartTime, minRecordingDuration]);

  // Helper for client-side error messages - can be expanded if needed
  // const clientProcessingErrorMessages = [
  //   "AudioBufferSourceNode has not been started",
  //   "AudioContext is not allowed to start"
  // ];

  // Cancel recording
  const cancelRecording = useCallback(() => {
    // Clear the duration update timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (recorderRef.current) {
      recorderRef.current.cancel();
      setIsRecording(false);
      setIsListening(false);
      setRecordingDuration(0);
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

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            title="Cancel recording"
          >
            <PauseCircle className="h-4 w-4" />
          </Button>
          <div className="text-xs text-muted-foreground mt-1">
            Recording: {(recordingDuration / 1000).toFixed(1)}s
          </div>
        </>
      )}
      
      {isProcessing && (
        <div className="text-xs text-muted-foreground mt-1">
          Processing speech...
        </div>
      )}
    </div>
  );
} 