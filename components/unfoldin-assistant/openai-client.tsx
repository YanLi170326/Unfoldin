import React, { useState, useCallback, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';

// Add proper type declarations
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function OpenAIClient() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Cleanup function for speech recognition
  const stopListening = useCallback(() => {
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
    setListening(false);
  }, [recognitionInstance]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (error) {
          console.error('Error stopping speech recognition:', error);
        }
      }
    };
  }, [recognitionInstance]);

  const callOpenAI = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer YOUR_OPENAI_API_KEY`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: input }
          ]
        })
      });

      const data = await res.json();
      setResponse(data.choices?.[0]?.message?.content || "No response.");
    } catch (error: unknown) {
      setResponse("Error: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const startListening = useCallback(() => {
    // Check if we're in a secure context
    if (!window.isSecureContext) {
      toast.error('Speech recognition requires HTTPS. Please use HTTPS to access this site.');
      return;
    }

    // Check browser support
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error('Your browser does not support speech recognition. Please use Chrome, Safari or other modern browsers.');
      return;
    }

    // Check if we're online
    if (!navigator.onLine) {
      toast.error('Network disconnected. Speech recognition requires internet connection.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      setRecognitionInstance(recognition);

      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setListening(true);
        toast.info('Speech recognition started. Please speak...');
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        switch(event.error) {
          case 'no-speech':
            toast.warning('No speech detected. Please speak clearly.');
            break;
          case 'aborted':
            toast.info('Speech recognition cancelled');
            break;
          case 'audio-capture':
            toast.error('Cannot capture audio. Please check your microphone.');
            break;
          case 'network':
            toast.error('Network error. Please check your internet connection.');
            break;
          case 'not-allowed':
          case 'service-not-allowed':
            setPermissionDenied(true);
            toast.error('Microphone permission denied. Please enable it in your browser settings.');
            break;
          case 'language-not-supported':
            toast.error('Language not supported. Please try another language.');
            break;
          default:
            toast.error(`Speech recognition failed: ${event.error}`);
        }
        
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.onresult = (event: any) => {
        try {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInput(transcript);
            toast.success('Speech recognition successful');
          } else {
            toast.warning('No speech detected, please try again');
          }
        } catch (err) {
          console.error('Error processing speech recognition result:', err);
          toast.error('Error processing speech recognition result');
        }
      };

      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast.error('Could not start speech recognition. Please try again.');
      setListening(false);
    }
  }, []);

  return (
    <div className="p-4 max-w-xl mx-auto">
      <Card className="mb-4">
        <CardContent className="p-4 space-y-2">
          <Input
            placeholder="请输入问题..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex space-x-2">
            <Button onClick={callOpenAI} disabled={loading}>
              {loading ? "请求中..." : "发送"}
            </Button>
            <Button 
              variant="outline" 
              onClick={listening ? stopListening : startListening}
              disabled={permissionDenied}
            >
              {listening ? "🎤 识别中..." : "🎤 语音输入"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {response && (
        <Card>
          <CardContent className="p-4 whitespace-pre-wrap">
            {response}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 