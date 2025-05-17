'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PauseCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AudioRecorder } from '@/lib/voice';

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
      
      toast.info('正在录音，说话后点击停止按钮...');
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('麦克风权限被拒绝，请在浏览器设置中启用麦克风权限');
      } else {
        toast.error('无法启动录音，请检查您的麦克风设置');
      }
      
      setIsRecording(false);
      setIsListening(false);
    }
  }, [setIsListening]);

  // Stop recording and process audio
  const stopRecording = useCallback(async () => {
    if (!recorderRef.current) {
      setIsRecording(false);
      setIsListening(false);
      return;
    }

    try {
      setIsProcessing(true);
      toast.info('正在处理语音...');
      
      // Stop recording and get the audio blob
      const audioBlob = await recorderRef.current.stop();
      
      // Create a FormData object to send to our API
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      // Send to our API endpoint
      const response = await fetch('/api/openai/whisper', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || `Server responded with ${response.status}`;
        throw new Error(errorMessage);
      }
      
      if (data.text) {
        // Update the transcript
        onTranscript(data.text);
        
        // Automatically submit if enabled
        if (autoSubmit) {
          const event = new CustomEvent('speech-submit', { detail: { transcript: data.text } });
          document.dispatchEvent(event);
        }
        
        toast.success('语音识别成功');
      } else {
        toast.error('未能识别到语音内容，请重试');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      
      // Extract useful error message
      let errorMessage = '处理语音时出错，请重试';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsRecording(false);
      setIsProcessing(false);
      setIsListening(false);
    }
  }, [onTranscript, autoSubmit, setIsListening]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
      setIsRecording(false);
      setIsListening(false);
      toast.info('录音已取消');
    }
  }, [setIsListening]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={isRecording ? "destructive" : isProcessing ? "secondary" : "outline"}
        size="icon"
        onClick={toggleRecording}
        disabled={isProcessing}
        title={
          isRecording 
            ? "点击停止录音并识别" 
            : isProcessing 
              ? "正在处理语音..." 
              : "开始语音录制 (API方式)"
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
          title="取消录音"
        >
          <PauseCircle className="h-4 w-4" />
        </Button>
      )}
      
      {isProcessing && (
        <div className="text-xs text-muted-foreground mt-1">
          正在处理语音...
        </div>
      )}
    </div>
  );
} 