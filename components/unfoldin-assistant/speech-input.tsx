'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [supported, setSupported] = useState<boolean | null>(null); // Start with null to indicate "checking"
  const [language, setLanguage] = useState<SpeechLanguage>('zh-CN'); // 默认中文
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [continuousMode, setContinuousMode] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isiOS, setIsiOS] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSecureContext, setIsSecureContext] = useState(true);

  // 停止麦克风流
  const stopMicrophoneStream = useCallback(() => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
  }, [audioStream]);

  // Define stopListening early to avoid linter errors
  const stopListening = useCallback(() => {
    setIsListening(false);
    stopMicrophoneStream();
    
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (error) {
        console.error('停止语音识别时出错:', error);
      }
    }
  }, [recognitionInstance, stopMicrophoneStream, setIsListening]);

  // Check if we're in a secure context (HTTPS or localhost)
  useEffect(() => {
    // Check if window.isSecureContext is available and is true
    if (typeof window !== 'undefined') {
      const isContextSecure = window.isSecureContext || 
                             window.location.protocol === 'https:' || 
                             window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1';
      
      setIsSecureContext(isContextSecure);
      
      if (!isContextSecure) {
        console.error('语音识别需要安全上下文 (HTTPS) 才能运行');
        toast.error('语音识别需要在HTTPS环境下使用，请使用HTTPS访问此网站');
      }
    }
  }, []);

  // Check online status
  useEffect(() => {
    // Initialize with current online status
    setIsOnline(navigator.onLine);
    
    // Add event listeners for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('网络已连接，语音识别功能已恢复');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('网络已断开，语音识别功能将不可用');
      if (isListening) {
        stopListening();
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isListening, stopListening]);

  // Check iOS
  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsiOS(iOS);
  }, []);

  // Check browser support for speech recognition
  useEffect(() => {
    const checkSupportAndPermission = async () => {
      // Check if we're in a secure context first
      if (!isSecureContext) {
        setSupported(false);
        return;
      }

      // Check if online
      if (!navigator.onLine) {
        setIsOnline(false);
        toast.error('网络已断开，语音识别功能将不可用');
      }

      // Check if speech recognition is supported
      const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      setSupported(isSupported);

      if (!isSupported) {
        toast.error('您的浏览器不支持语音识别功能，请使用Chrome, Safari等现代浏览器');
        return;
      }

      // iOS Safari requires user interaction to start speech recognition
      if (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        console.log('Running on iOS - speech recognition requires user interaction');
      }

      // Try to get permission status if available
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          
          if (permissionStatus.state === 'denied') {
            setPermissionDenied(true);
            toast.error('麦克风权限被拒绝，请在浏览器设置中启用麦克风权限');
          }
          
          // Listen for permission changes
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'denied') {
              setPermissionDenied(true);
              setIsListening(false);
              stopMicrophoneStream();
              toast.error('麦克风权限被拒绝，请在浏览器设置中启用麦克风权限');
            } else if (permissionStatus.state === 'granted') {
              setPermissionDenied(false);
            }
          };
        } catch (error) {
          console.log('Permission query not supported, will check on usage');
        }
      }
    };
    
    checkSupportAndPermission();
  }, [setIsListening, stopMicrophoneStream, isSecureContext]);

  // Function to check network connectivity
  const checkNetworkConnection = useCallback(() => {
    // Ping a reliable server to check if the network is truly accessible
    return new Promise<boolean>((resolve) => {
      // Use a timeout to ensure we don't wait too long
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, 5000);
      
      // Try to fetch a small resource
      fetch('https://www.google.com/generate_204', { 
        mode: 'no-cors',
        cache: 'no-store'
      })
        .then(() => {
          clearTimeout(timeoutId);
          resolve(true);
        })
        .catch(() => {
          clearTimeout(timeoutId);
          resolve(false);
        });
    });
  }, []);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh-CN' ? 'en-US' : 'zh-CN');
    toast.info(`语音识别语言已切换为${language === 'zh-CN' ? '英文' : '中文'}`);
  };

  const toggleListening = useCallback(() => {
    // First check if we're in a secure context
    if (!isSecureContext) {
      toast.error('语音识别需要在HTTPS环境下使用，请使用HTTPS访问此网站');
      return;
    }

    if (!supported) {
      toast.error('您的浏览器不支持语音识别功能，请使用Chrome, Safari等现代浏览器');
      return;
    }

    if (permissionDenied) {
      toast.error('麦克风权限被拒绝，请在浏览器设置中启用麦克风权限');
      return;
    }

    if (!isOnline) {
      // Double-check network connection before showing error
      checkNetworkConnection().then(online => {
        if (online) {
          // We're actually online, just navigator.onLine was wrong
          setIsOnline(true);
          if (!isListening) {
            requestMicrophonePermission();
          }
        } else {
          toast.error('网络错误，请检查您的网络连接后重试。语音识别需要互联网连接。');
        }
      });
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      requestMicrophonePermission();
    }
  }, [supported, permissionDenied, isListening, stopMicrophoneStream, isOnline, checkNetworkConnection, isSecureContext]);

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
      setPermissionDenied(false);
      
      // 获取到权限后开始语音识别
      startListening(stream);
    } catch (error: any) {
      console.error('获取麦克风权限失败:', error);
      
      // Handle specific error types
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        toast.error('麦克风权限被拒绝，请在浏览器设置中启用麦克风权限');
      } else if (error.name === 'NotFoundError') {
        toast.error('找不到麦克风设备，请检查您的设备');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast.error('麦克风被其他应用程序占用，请关闭其他使用麦克风的应用');
      } else {
        toast.error('无法访问麦克风，请确保已授予麦克风权限');
      }
      
      setIsListening(false);
    }
  };

  const startListening = (stream?: MediaStream) => {
    // Check if we're online before starting
    if (!navigator.onLine) {
      toast.error('网络已断开，语音识别功能将不可用，请检查您的网络连接');
      setIsListening(false);
      stopMicrophoneStream();
      return;
    }

    setIsListening(true);
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      toast.error('您的浏览器不支持语音识别功能，请使用Chrome, Safari等现代浏览器');
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      setRecognitionInstance(recognition);
      
      recognition.lang = language; // 使用当前选择的语言
      recognition.continuous = continuousMode; // 连续模式下启用持续识别
      recognition.interimResults = false;

      // iOS Safari needs shorter timeouts
      if (isiOS) {
        // Apple's implementation might have different requirements
        // iOS Safari has different timeout behavior
        // Adjust as needed based on testing
        recognition.interimResults = true; // Try this for iOS
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        try {
          // Check if results exist and are not empty
          if (event.results && event.results.length > 0 && event.results[0].length > 0) {
            const transcript = event.results[0][0].transcript;
            if (transcript && transcript.trim()) {
              onTranscript(transcript);
              
              if (continuousMode || autoSubmit) {
                // 自动提交，但保持麦克风开启
                // 这里通过事件或回调触发 unfoldin-assistant.tsx 中的表单提交
                const customEvent = new CustomEvent('speech-submit', { detail: { transcript } });
                document.dispatchEvent(customEvent);
              } else {
                // 非连续模式下，完成识别后关闭麦克风
                setIsListening(false);
                stopMicrophoneStream();
              }
              
              toast.success(`语音识别成功 (${language === 'zh-CN' ? '中文' : '英文'})`);
            } else {
              toast.warning('未能识别到语音内容，请重试');
            }
          } else {
            toast.warning('未能识别到语音内容，请重试');
          }
        } catch (error) {
          console.error('处理语音识别结果时出错:', error);
          toast.error('处理语音识别结果时出错，请重试');
        }
        
        if (!continuousMode) {
          recognition.stop();
        }
      };

      recognition.onerror = (event: SpeechRecognitionError) => {
        console.error('语音识别错误:', event.error, event);
        
        // Provide more specific error messages based on the error type
        switch(event.error) {
          case 'no-speech':
            toast.warning('未检测到语音，请确保您正在说话并且麦克风工作正常');
            break;
          case 'aborted':
            toast.info('语音识别已取消');
            break;
          case 'audio-capture':
            toast.error('无法捕获音频，请检查麦克风设备');
            break;
          case 'network':
            // Mark as offline and show detailed error
            setIsOnline(false);
            toast.error('网络错误，语音识别需要稳定的网络连接。请检查您的网络连接后重试。');
            // Try to recover network status after a delay
            setTimeout(() => {
              checkNetworkConnection().then(online => {
                setIsOnline(online);
                if (online && isListening) {
                  toast.info('网络已恢复，正在重新启动语音识别...');
                  try {
                    recognition.start();
                  } catch (e) {
                    console.error('重启语音识别失败:', e);
                  }
                }
              });
            }, 3000);
            break;
          case 'not-allowed':
          case 'service-not-allowed':
            setPermissionDenied(true);
            toast.error('麦克风权限被拒绝，请在浏览器设置中启用麦克风权限');
            break;
          case 'bad-grammar':
            toast.error('语法错误，识别服务无法处理');
            break;
          case 'language-not-supported':
            toast.error(`当前语言 (${language}) 不受支持，请尝试其他语言`);
            break;
          default:
            // Check if it might be a network issue even though not reported as such
            if (!navigator.onLine) {
              setIsOnline(false);
              toast.error('网络错误，语音识别需要互联网连接。请检查您的网络设置。');
            } else {
              toast.error(`语音识别失败: ${event.error}`);
            }
        }
        
        if (!continuousMode) {
          setIsListening(false);
          stopMicrophoneStream();
        }
      };

      recognition.onend = () => {
        // 连续模式下，在onend后重新开始识别
        if (continuousMode && isListening) {
          try {
            // Check network status before restarting
            if (navigator.onLine) {
              // Add a small delay before restarting
              setTimeout(() => {
                if (isListening) { // Double-check we're still supposed to be listening
                  recognition.start();
                }
              }, 100);
            } else {
              toast.error('网络已断开，语音识别已停止。请检查网络连接后重试。');
              setIsListening(false);
              stopMicrophoneStream();
            }
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

      // Additional error handling
      recognition.onnomatch = () => {
        toast.warning('未能匹配识别结果，请重试');
      };

      // Start recognition with a try-catch to handle any errors
      try {
        // Check network again right before starting
        if (!navigator.onLine) {
          throw new Error('Network offline');
        }
        
        // iOS Safari requires speech recognition to be started from a user interaction
        // We're already within a user interaction here when the button is clicked
        recognition.start();
        
        toast.info(`开始${language === 'zh-CN' ? '中文' : '英文'}语音识别，请说话...`);
        
        if (isiOS) {
          toast.info('iOS设备需要允许麦克风权限，并需要说话时声音足够大');
        }
        
        if (continuousMode) {
          toast.info('连续对话模式已启用，语音识别会自动继续');
        }
      } catch (error) {
        console.error('启动语音识别时出错:', error);
        
        // Handle network offline error
        if (error instanceof Error && error.message === 'Network offline') {
          setIsOnline(false);
          toast.error('网络错误，语音识别需要互联网连接。请检查您的网络设置。');
        }
        // Special handling for iOS "already running" error
        else if (error instanceof DOMException && 
            error.name === 'InvalidStateError' && 
            isiOS) {
          toast.error('iOS语音识别已在运行，请先停止当前识别');
          // Try to recover by stopping any existing session
          try {
            recognition.stop();
            setTimeout(() => {
              if (isListening) {
                recognition.start();
              }
            }, 500);
          } catch (e) {
            console.error('无法恢复语音识别', e);
          }
        } else {
          toast.error('无法启动语音识别，请刷新页面重试');
        }
        
        setIsListening(false);
        stopMicrophoneStream();
      }
    } catch (error) {
      console.error('创建语音识别实例时出错:', error);
      toast.error('无法启动语音识别');
      setIsListening(false);
      stopMicrophoneStream();
    }
  };

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
  }, [recognitionInstance, stopMicrophoneStream]);

  // Show loading state while checking support
  if (supported === null) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={true}
        >
          <Mic className="h-4 w-4" />
        </Button>
      </>
    );
  }

  // Show not secure context warning
  if (!isSecureContext) {
    return (
      <Button
        type="button"
        variant="destructive"
        size="icon"
        onClick={() => {
          const httpsUrl = window.location.href.replace('http://', 'https://');
          toast.error('语音识别需要HTTPS环境，点击切换到HTTPS版本');
          // Prompt user to redirect to HTTPS version
          if (confirm('语音识别需要在HTTPS环境下使用，是否切换到HTTPS版本？')) {
            window.location.href = httpsUrl;
          }
        }}
        title="需要HTTPS环境"
      >
        <Mic className="h-4 w-4" />
      </Button>
    );
  }

  // If not supported, show button with warning on hover
  if (!supported) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => toast.error('您的浏览器不支持语音识别功能，请使用Chrome, Safari等现代浏览器')}
        title="您的浏览器不支持语音识别功能"
      >
        <Mic className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  // If offline, show button with network error on hover
  if (!isOnline) {
    return (
      <>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => {
            // On click, check if network is actually available
            checkNetworkConnection().then(online => {
              if (online) {
                setIsOnline(true);
                toast.success('网络已恢复，语音识别功能已可用');
              } else {
                toast.error('网络仍然不可用，语音识别需要互联网连接');
              }
            });
          }}
          title="网络错误，点击重试"
        >
          <Mic className="h-4 w-4" />
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
        >
          <Globe className="h-4 w-4" />
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={isListening ? "destructive" : permissionDenied ? "secondary" : "outline"}
        size="icon"
        onClick={toggleListening}
        title={
          permissionDenied 
            ? "麦克风权限被拒绝，点击尝试重新获取权限" 
            : isListening 
              ? "停止语音输入" 
              : "开始语音输入"
        }
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