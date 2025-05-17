'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Globe, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

// 使用正确的类型声明方式
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechInputProps {
  onTranscript: (text: string) => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  autoSubmit?: boolean; // Optional prop to automatically submit form on transcript
}

type SpeechLanguage = 'zh-CN' | 'en-US';

export default function SpeechInput({ onTranscript, isListening, setIsListening, autoSubmit = false }: SpeechInputProps) {
  const [supported, setSupported] = useState(true);
  const [language, setLanguage] = useState<SpeechLanguage>('zh-CN'); // 默认中文
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [continuousMode, setContinuousMode] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // 检查浏览器是否支持 SpeechRecognition
    const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setSupported(isSupported);
  }, []);

  // 清理函数，确保在组件卸载时停止语音识别
  useEffect(() => {
    return () => {
      stopMicrophoneStream();
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (error) {
          console.error('停止语音识别时出错:', error);
        }
      }
    };
  }, [recognitionInstance]);

  // 停止麦克风流
  const stopMicrophoneStream = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh-CN' ? 'en-US' : 'zh-CN');
    toast.info(`语音识别语言已切换为${language === 'zh-CN' ? '英文' : '中文'}`);
  };

  const toggleListening = () => {
    if (!supported) {
      toast.error('您的浏览器不支持语音识别功能');
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      requestMicrophonePermission();
    }
  };

  // 切换连续对话模式
  const toggleContinuousMode = () => {
    setContinuousMode(!continuousMode);
    toast.info(continuousMode 
      ? '已关闭连续对话模式' 
      : '已开启连续对话模式 - 语音识别后将自动提交'
    );
  };

  // 请求麦克风权限
  const requestMicrophonePermission = async () => {
    try {
      // 显式请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      // 获取到权限后开始语音识别
      startListening(stream);
    } catch (error) {
      console.error('获取麦克风权限失败:', error);
      toast.error('无法访问麦克风，请确保已授予麦克风权限');
      setIsListening(false);
    }
  };

  const startListening = (stream?: MediaStream) => {
    setIsListening(true);
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      toast.error('您的浏览器不支持语音识别功能');
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      setRecognitionInstance(recognition);
      
      recognition.lang = language; // 使用当前选择的语言
      recognition.continuous = continuousMode; // 连续模式下启用持续识别
      recognition.interimResults = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        
        if (continuousMode || autoSubmit) {
          // 自动提交，但保持麦克风开启
          // 这里通过事件或回调触发 unfoldin-assistant.tsx 中的表单提交
          const event = new CustomEvent('speech-submit', { detail: { transcript } });
          document.dispatchEvent(event);
        } else {
          // 非连续模式下，完成识别后关闭麦克风
          setIsListening(false);
          stopMicrophoneStream();
        }
        
        toast.success(`语音识别成功 (${language === 'zh-CN' ? '中文' : '英文'})`);
        
        if (!continuousMode) {
          recognition.stop();
        }
      };

      recognition.onerror = (event: SpeechRecognitionError) => {
        console.error('语音识别错误:', event.error);
        toast.error(`语音识别失败: ${event.error}`);
        if (!continuousMode) {
          setIsListening(false);
          stopMicrophoneStream();
        }
      };

      recognition.onend = () => {
        // 连续模式下，在onend后重新开始识别
        if (continuousMode && isListening) {
          try {
            recognition.start();
          } catch (error) {
            console.error('重启语音识别失败:', error);
            setIsListening(false);
            stopMicrophoneStream();
          }
        } else {
          setIsListening(false);
          stopMicrophoneStream();
        }
      };

      recognition.start();
      toast.info(`开始${language === 'zh-CN' ? '中文' : '英文'}语音识别，请说话...`);
      
      if (continuousMode) {
        toast.info('连续对话模式已启用，语音识别会自动继续');
      }
    } catch (error) {
      console.error('启动语音识别时出错:', error);
      toast.error('无法启动语音识别');
      setIsListening(false);
      stopMicrophoneStream();
    }
  };

  const stopListening = () => {
    setIsListening(false);
    stopMicrophoneStream();
    
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (error) {
        console.error('停止语音识别时出错:', error);
      }
    }
  };

  if (!supported) {
    return null; // 如果不支持，可以选择不显示按钮
  }

  return (
    <>
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        size="icon"
        onClick={toggleListening}
        title={isListening ? "停止语音输入" : "开始语音输入"}
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      
      <Button
        type="button"
        variant={continuousMode ? "default" : "outline"}
        size="icon"
        onClick={toggleContinuousMode}
        title={continuousMode ? "关闭连续对话模式" : "开启连续对话模式"}
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
      
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={toggleLanguage}
        title={`切换为${language === 'zh-CN' ? '英文' : '中文'}识别`}
        disabled={isListening && !continuousMode}
      >
        <Globe className="h-4 w-4" />
      </Button>
    </>
  );
} 