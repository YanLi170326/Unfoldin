"use client";

import { useState, useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import { 
  emotionQuestionsAtom, 
  nextQuestionAtom, 
  sessionHistoryAtom, 
  addMessageAtom,
  clearHistoryAtom 
} from '@/lib/gpt';
import { 
  timerAtom, 
  timerControlsAtom, 
  decrementTimerAtom, 
  formatTime 
} from '@/lib/timer';

export function EmotionReleaseFlow() {
  const [isListening, setIsListening] = useState(false);
  const [userResponse, setUserResponse] = useState('');
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [emotionQuestions] = useAtom(emotionQuestionsAtom);
  const [, nextQuestion] = useAtom(nextQuestionAtom);
  const [timer, setTimerControls] = useAtom(timerControlsAtom);
  const [, decrementTimer] = useAtom(decrementTimerAtom);
  const [sessionHistory, addMessage] = useAtom(addMessageAtom);
  const [, clearHistory] = useAtom(clearHistoryAtom);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle timer
  useEffect(() => {
    if (timer.isRunning && timer.timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        decrementTimer();
      }, 1000);
    } else if (!timer.isRunning && timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timer.isRunning, decrementTimer]);

  // Handle completion of silence period
  useEffect(() => {
    if (timer.isRunning && timer.timeRemaining === 0) {
      handleNextQuestion();
    }
  }, [timer.timeRemaining]);

  const initializeOpenAI = async () => {
    try {
      const response = await fetch('/api/openai/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        toast.error('Failed to initialize OpenAI');
        return false;
      }

      setIsInitialized(true);
      return true;
    } catch (error) {
      toast.error('Error initializing OpenAI');
      return false;
    }
  };

  const speakText = async (text: string) => {
    try {
      const response = await fetch('/api/openai/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Speech synthesis failed:', errorData);
        toast.error(`Speech synthesis failed: ${errorData.message || 'Unknown error'}`);
        
        // Continue without speech - don't throw error
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      setAudioElement(audio);
      
      return new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.play().catch(err => {
          console.error('Error playing audio:', err);
          URL.revokeObjectURL(audioUrl);
          resolve(); // Continue even if audio playback fails
        });
      });
    } catch (error) {
      console.error('Error speaking text:', error);
      toast.error('Failed to synthesize speech. Continuing without audio.');
      // Don't throw, just continue without speech
    }
  };

  const handleStartSession = async () => {
    if (!isInitialized) {
      const initialized = await initializeOpenAI();
      if (!initialized) return;
    }

    setIsProcessing(true);
    try {
      // Clear previous session history
      clearHistory();
      
      // Try to speak the current question, but continue if it fails
      try {
        await speakText(emotionQuestions.current);
      } catch (error) {
        console.error('Failed to speak text, continuing with session:', error);
        // Continue with the session even if speech fails
      }
      
      // Add the question to the session history
      addMessage({ role: 'assistant', content: emotionQuestions.current });
      
      // Start the silence timer after the question is spoken (or after speech attempt fails)
      setTimerControls({ type: 'START' });
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePauseResume = () => {
    if (timer.isRunning) {
      setTimerControls({ type: 'PAUSE' });
    } else {
      setTimerControls({ type: 'START' });
    }
  };

  const handleNextQuestion = () => {
    // Stop the current timer
    setTimerControls({ type: 'PAUSE' });
    
    // Save the user's response if any
    if (userResponse) {
      addMessage({ role: 'user', content: userResponse });
      setUserResponse('');
    }
    
    // Move to the next question or end the session
    const hasMoreQuestions = nextQuestion();
    if (hasMoreQuestions) {
      // Reset the timer for the next question
      setTimerControls({ type: 'SET_DURATION', duration: 60 });
      
      // Speak the next question
      handleStartSession();
    } else {
      // End of session
      saveSession();
      toast.success('Session completed');
    }
  };

  const saveSession = async () => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          timestamp: new Date().toISOString(),
          conversation: sessionHistory
        }),
      });

      if (!response.ok) {
        toast.error('Failed to save session');
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const handleUserResponseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserResponse(e.target.value);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Emotion Release Session</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-md min-h-32 flex items-center justify-center">
          <p className="text-center text-lg">{emotionQuestions.current}</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="response">Your thoughts (optional)</Label>
          <Input
            id="response"
            value={userResponse}
            onChange={handleUserResponseChange}
            placeholder="Type your response here..."
            disabled={isProcessing || timer.isRunning}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Silence Period</span>
            <span>{formatTime(timer.timeRemaining)}</span>
          </div>
          <Progress value={(timer.timeRemaining / timer.totalDuration) * 100} />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          onClick={handleStartSession} 
          disabled={isProcessing || timer.isRunning}
        >
          {isProcessing ? 'Processing...' : 'Start'}
        </Button>
        
        <Button 
          onClick={handlePauseResume}
          disabled={isProcessing || !timer.isRunning && timer.timeRemaining === timer.totalDuration}
        >
          {timer.isRunning ? 'Pause' : 'Resume'}
        </Button>
        
        <Button 
          onClick={handleNextQuestion}
          disabled={isProcessing || timer.isRunning}
        >
          Next Question
        </Button>
      </CardFooter>
    </Card>
  );
} 