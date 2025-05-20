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
  const [recognitionStartTime, setRecognitionStartTime] = useState<number | null>(null);
  const [minRecordingDuration] = useState(3000); // Minimum 3 seconds recording time

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
      
      // Log diagnostic information
      console.log('Secure context check:', { 
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        result: isContextSecure
      });
      
      if (!isContextSecure) {
        console.error('Speech recognition requires a secure context (HTTPS) to work');
        toast.error('Voice input requires a secure connection (HTTPS). Please ensure you are using HTTPS or try the API-based input method.');
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

  // Function to check exact speech recognition support
  const checkExactSpeechSupport = useCallback(() => {
    const diagnosticInfo = {
      window: typeof window !== 'undefined',
      speechRecognition: 'SpeechRecognition' in window,
      webkitSpeechRecognition: 'webkitSpeechRecognition' in window,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      maxTouchPoints: navigator.maxTouchPoints,
      language: navigator.language,
      languages: navigator.languages,
      mediaDevices: !!navigator.mediaDevices,
      secureContext: window.isSecureContext,
      protocol: window.location.protocol,
      hostname: window.location.hostname
    };
    
    console.log('Speech recognition diagnostic info:', diagnosticInfo);
    return diagnosticInfo;
  }, []);

  // Check browser support for speech recognition
  useEffect(() => {
    const checkSupportAndPermission = async () => {
      // Log diagnostic information first
      const diagnosticInfo = checkExactSpeechSupport();
      
      // Check if we're in a secure context first
      if (!isSecureContext) {
        setSupported(false);
        return;
      }

      // Check if online
      if (!navigator.onLine) {
        setIsOnline(false);
        toast.error('Network disconnected. Speech recognition requires internet connection. Please check your network.');
      }

      // FIXED: Better check for speech recognition support - specifically check webkit prefix since 
      // Chrome reports only webkitSpeechRecognition as true
      const isStandardSupported = 'SpeechRecognition' in window;
      const isWebkitSupported = 'webkitSpeechRecognition' in window;
      const isSupported = isStandardSupported || isWebkitSupported;
      
      console.log('Speech support check:', { 
        standard: isStandardSupported, 
        webkit: isWebkitSupported,
        final: isSupported 
      });
      
      setSupported(isSupported);

      if (!isSupported) {
        toast.error('Your browser does not support this voice input method. Please use a modern browser like Chrome or Safari, or switch to the API-based input method.');
        return;
      } else {
        // Log which version will be used
        console.log(`Using ${isStandardSupported ? 'standard' : 'webkit'} Speech Recognition API`);
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
          console.log('Microphone permission status:', permissionStatus.state);
          
          if (permissionStatus.state === 'denied') {
            setPermissionDenied(true);
            toast.error('Microphone access denied. Please enable microphone permissions for this site in your browser settings. You can also try the API-based input method.');
          }
          
          // Listen for permission changes
          permissionStatus.onchange = () => {
            console.log('Permission status changed to:', permissionStatus.state);
            if (permissionStatus.state === 'denied') {
              setPermissionDenied(true);
              setIsListening(false);
              stopMicrophoneStream();
              toast.error('Microphone access denied. Please enable microphone permissions for this site in your browser settings. You can also try the API-based input method.');
            } else if (permissionStatus.state === 'granted') {
              setPermissionDenied(false);
            }
          };
        } catch (error) {
          console.log('Permission query not supported, will check on usage', error);
        }
      }
    };
    
    checkSupportAndPermission();
  }, [setIsListening, stopMicrophoneStream, isSecureContext, checkExactSpeechSupport]);

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
    toast.info(`Speech recognition language changed to ${language === 'zh-CN' ? 'English' : 'Chinese'}`);
  };

  const toggleListening = useCallback(() => {
    // First check if we're in a secure context
    if (!isSecureContext) {
      toast.error('Voice input requires a secure connection (HTTPS). Please ensure you are using HTTPS or try the API-based input method.');
      return;
    }

    if (!supported) {
      toast.error('Your browser does not support this voice input method. Please use a modern browser like Chrome or Safari, or switch to the API-based input method.');
      return;
    }

    if (permissionDenied) {
      toast.error('Microphone access denied. Please enable microphone permissions for this site in your browser settings. You can also try the API-based input method.');
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
      ? 'Continuous dialog mode disabled' 
      : 'Continuous dialog mode enabled - Speech recognition will auto-submit'
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
      console.error('Failed to get microphone permission:', error);
      
      // Handle specific error types
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        toast.error('Microphone access denied. Please enable microphone permissions for this site in your browser settings. You can also try the API-based input method.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found. Please check your device.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast.error('Microphone is being used by another application. Please close other apps using the microphone.');
      } else {
        toast.error('Cannot access microphone. Please ensure microphone permissions are granted.');
      }
      
      setIsListening(false);
    }
  };

  const startListening = (stream?: MediaStream) => {
    // Check if we're online before starting
    if (!navigator.onLine) {
      toast.error('Network disconnected. Speech recognition requires internet connection. Please check your network.');
      setIsListening(false);
      stopMicrophoneStream();
      return;
    }

    setIsListening(true);
    // Set the start time when we begin listening
    setRecognitionStartTime(Date.now());
    
    // FIXED: More explicit handling of standard vs webkit SpeechRecognition
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.error('Speech Recognition API not available despite earlier check');
      toast.error('Your browser does not support this voice input method. Please use a modern browser like Chrome or Safari, or switch to the API-based input method.');
      setIsListening(false);
      return;
    }

    try {
      console.log('Creating speech recognition instance');
      const recognition = new SpeechRecognitionAPI();
      setRecognitionInstance(recognition);
      
      // Log the recognition instance details for debugging
      console.log('Recognition instance created:', {
        exists: !!recognition,
        type: window.SpeechRecognition ? 'standard' : 'webkit',
        lang: language,
        continuous: continuousMode,
        constructor: recognition.constructor.name
      });
      
      recognition.lang = language; 
      recognition.continuous = continuousMode;
      // Set these to true to give more time for recognition to process
      recognition.interimResults = true;
      // Increase the max alternatives to improve recognition accuracy
      recognition.maxAlternatives = 3;

      // iOS Safari needs shorter timeouts
      if (isiOS) {
        recognition.interimResults = true; // Try this for iOS
        console.log('iOS detected, setting interimResults to true');
      }

      // Add all event listeners with error handling
      recognition.onstart = (event: Event) => {
        console.log('Speech recognition started successfully', event);
      };

      // Add diagnostic event handlers
      recognition.onaudiostart = () => console.log('Audio capturing started');
      recognition.onsoundstart = () => console.log('Sound detected');
      recognition.onspeechstart = () => console.log('Speech detected');
      recognition.onspeechend = () => console.log('Speech ended');
      recognition.onsoundend = () => console.log('Sound ended');
      recognition.onaudioend = () => console.log('Audio capturing ended');

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
              
              toast.success(`Speech recognition successful (${language === 'zh-CN' ? 'Chinese' : 'English'})`);
            } else {
              toast.warning('No speech detected, please try again');
            }
          } else {
            toast.warning('No speech detected, please try again');
          }
        } catch (error) {
          console.error('Error processing speech recognition result:', error);
          toast.error('Error processing speech recognition result, please try again');
        }
        
        if (!continuousMode) {
          recognition.stop();
        }
      };

      recognition.onerror = (event: SpeechRecognitionError) => {
        console.error('Speech recognition error:', event.error, event);
        
        // Provide more specific error messages based on the error type
        switch(event.error) {
          case 'no-speech':
            toast.warning('No speech was detected. Please check your microphone, speak clearly, or try the API-based input method if issues persist.');
            break;
          case 'aborted':
            toast.info('Speech recognition cancelled');
            break;
          case 'audio-capture':
            toast.error('Cannot capture audio. Please check your microphone.');
            break;
          case 'network':
            // Mark as offline and show detailed error
            setIsOnline(false);
            toast.error('Network error with browser voice input. Please check your connection or switch to the API-based input method.');
            // Try to recover network status after a delay
            setTimeout(() => {
              checkNetworkConnection().then(online => {
                setIsOnline(online);
                if (online && isListening) {
                  toast.info('Network restored, restarting speech recognition...');
                  try {
                    recognition.start();
                  } catch (e) {
                    console.error('Failed to restart speech recognition:', e);
                  }
                }
              });
            }, 3000);
            break;
          case 'not-allowed':
          case 'service-not-allowed':
            setPermissionDenied(true);
            toast.error('Microphone access denied. Please enable microphone permissions for this site in your browser settings. You can also try the API-based input method.');
            break;
          case 'bad-grammar':
            toast.error('Grammar error, recognition service cannot process');
            break;
          case 'language-not-supported':
            toast.error(`Current language (${language}) is not supported. Please try another language.`);
            break;
          default:
            // Check if it might be a network issue even though not reported as such
            if (!navigator.onLine) {
              setIsOnline(false);
              toast.error('Network error. Speech recognition requires internet connection. Please check your network settings.');
            } else {
              toast.error(`Speech recognition failed: ${event.error}`);
            }
        }
        
        if (!continuousMode) {
          setIsListening(false);
          stopMicrophoneStream();
        }
      };

      recognition.onend = () => {
        // Check if we've met the minimum recording duration
        const now = Date.now();
        const elapsed = recognitionStartTime ? now - recognitionStartTime : 0;
        console.log(`Speech recognition ended after ${elapsed}ms`);
        
        // If we haven't recorded for minimum duration and we're still meant to be listening,
        // restart the recognition process
        if (elapsed < minRecordingDuration && isListening) {
          console.log(`Restarting speech recognition - min duration not met (${elapsed}ms < ${minRecordingDuration}ms)`);
          try {
            if (navigator.onLine) {
              // Add a small delay before restarting to let the previous recognition session fully close
              setTimeout(() => {
                if (isListening) { // Double-check we're still supposed to be listening
                  recognition.start();
                  console.log('Restarted speech recognition to meet minimum duration');
                }
              }, 100);
              return; // Return here to prevent stopping the microphone
            }
          } catch (error) {
            console.error('Error restarting speech recognition:', error);
          }
        }
        
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
        
        console.log('Starting speech recognition...');
        recognition.start();
        console.log('Speech recognition started');
        
        toast.info(`Starting ${language === 'zh-CN' ? 'Chinese' : 'English'} speech recognition, please speak...`);
        
        if (isiOS) {
          toast.info('iOS devices require microphone permission and loud enough speech');
        }
        
        if (continuousMode) {
          toast.info('Continuous dialog mode enabled - Speech recognition will continue');
        }
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        
        // Enhance error logging for debugging speech recognition issues
        if (error instanceof Error) {
          console.error('Speech recognition startup error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            recognitionState: recognition?.state || 'unknown'
          });
        }
        
        // Handle network offline error
        if (error instanceof Error && error.message === 'Network offline') {
          setIsOnline(false);
          toast.error('Network error. Speech recognition requires internet connection. Please check your network settings.');
        }
        // Special handling for iOS "already running" error
        else if (error instanceof DOMException && 
            error.name === 'InvalidStateError' && 
            isiOS) {
          toast.error('iOS speech recognition already running. Please stop current recognition first');
          // Try to recover by stopping any existing session
          try {
            recognition.stop();
            setTimeout(() => {
              if (isListening) {
                recognition.start();
              }
            }, 500);
          } catch (e) {
            console.error('Could not recover speech recognition', e);
          }
        } else {
          toast.error('Could not start speech recognition. Please refresh the page and try again');
        }
        
        setIsListening(false);
        stopMicrophoneStream();
      }
    } catch (error) {
      console.error('Error creating speech recognition instance:', error);
      toast.error('Could not initialize speech recognition');
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
          toast.error('Voice input requires a secure connection (HTTPS). Please ensure you are using HTTPS or try the API-based input method.');
          // Prompt user to redirect to HTTPS version
          if (confirm('Voice input requires a secure connection (HTTPS). Do you want to switch to the HTTPS version of this page? This may resolve the issue.')) {
            window.location.href = httpsUrl;
          }
        }}
        title="HTTPS Required for Voice Input"
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
        onClick={() => toast.error('Your browser does not support this voice input method. Please use a modern browser like Chrome or Safari, or switch to the API-based input method.')}
        title="Browser voice input not supported. Try API method."
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
                toast.success('Network restored. Speech recognition is now available.');
              } else {
                toast.error('Network still unavailable. Speech recognition requires internet connection.');
              }
            });
          }}
          title="Network error, click to retry"
        >
          <Mic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={continuousMode ? "default" : "outline"}
          size="icon"
          onClick={toggleContinuousMode}
          title={continuousMode ? "Disable continuous dialog mode" : "Enable continuous dialog mode"}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleLanguage}
          title={`Switch to ${language === 'zh-CN' ? 'English' : 'Chinese'} recognition`}
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
            ? "Microphone permission denied. Click to try again" 
            : isListening 
              ? "Stop voice input" 
              : "Start voice input"
        }
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      
      <Button
        type="button"
        variant={continuousMode ? "default" : "outline"}
        size="icon"
        onClick={toggleContinuousMode}
        title={continuousMode ? "Disable continuous dialog mode" : "Enable continuous dialog mode"}
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
      
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={toggleLanguage}
        title={`Switch to ${language === 'zh-CN' ? 'English' : 'Chinese'} recognition`}
        disabled={isListening && !continuousMode}
      >
        <Globe className="h-4 w-4" />
      </Button>
    </>
  );
} 