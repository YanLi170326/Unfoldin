'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SpeechDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<Record<string, any> | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const runDiagnostics = () => {
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      browser: {
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        maxTouchPoints: navigator.maxTouchPoints,
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        isSecureContext: window.isSecureContext,
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage,
      },
      location: {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port,
        href: window.location.href,
      },
      speech: {
        speechRecognition: 'SpeechRecognition' in window,
        webkitSpeechRecognition: 'webkitSpeechRecognition' in window,
        speechSynthesis: 'speechSynthesis' in window,
        voicesAvailable: window.speechSynthesis ? window.speechSynthesis.getVoices().length : 0,
      },
      mediaDevices: {
        available: !!navigator.mediaDevices,
        getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        enumerateDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
      },
      features: {
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
        isAndroid: /Android/.test(navigator.userAgent),
        isMobile: /Mobi|Android/i.test(navigator.userAgent),
        isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
        isChrome: /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome|Edge|Edg/.test(navigator.userAgent),
        isFirefox: /Firefox/.test(navigator.userAgent),
        isEdge: /Edge|Edg/.test(navigator.userAgent),
      }
    };

    // Check microphone permission
    const checkMicrophonePermission = async () => {
      try {
        results.permissions = { microphone: { supported: false, state: 'unknown' } };
        
        if (navigator.permissions && navigator.permissions.query) {
          results.permissions.microphone.supported = true;
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          results.permissions.microphone.state = permissionStatus.state;
        }
      } catch (error) {
        results.permissions = { microphone: { error: String(error) } };
      }
      
      setDiagnostics(results);
    };

    checkMicrophonePermission();
    
    // Log results to console for easier debugging
    console.log('Speech Diagnostics Results:', results);
  };

  useEffect(() => {
    // Run diagnostics on mount
    runDiagnostics();
  }, []);

  const testMicrophone = async () => {
    try {
      toast.info('Testing microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check if we got audio tracks
      if (stream.getAudioTracks().length > 0) {
        toast.success('Microphone access successful!');
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      } else {
        toast.error('No audio tracks found. Microphone might not be working.');
      }
    } catch (error) {
      console.error('Microphone test failed:', error);
      toast.error(`Microphone test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testSpeechRecognition = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast.error('Speech Recognition API not available in this browser');
        return;
      }
      
      toast.info('Testing speech recognition...');
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onstart = () => {
        toast.info('Speech recognition started. Please speak...');
      };
      
      recognition.onresult = (event: any) => {
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0][0].transcript;
          toast.success(`Speech recognized: "${transcript}"`);
        } else {
          toast.warning('No speech results received');
        }
      };
      
      recognition.onerror = (event: any) => {
        toast.error(`Speech recognition error: ${event.error}`);
      };
      
      recognition.onend = () => {
        toast.info('Speech recognition ended');
      };
      
      recognition.start();
    } catch (error) {
      console.error('Speech recognition test failed:', error);
      toast.error(`Speech recognition test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (!diagnostics) {
    return <div>Loading diagnostics...</div>;
  }

  return (
    <div className="speech-diagnostics my-4">
      <Button 
        variant="outline" 
        onClick={() => setIsVisible(!isVisible)}
        className="mb-2"
      >
        {isVisible ? 'Hide' : 'Show'} Speech Diagnostics
      </Button>
      
      {isVisible && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Speech Recognition Diagnostics</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={runDiagnostics}>
                  Refresh
                </Button>
                <Button size="sm" variant="outline" onClick={testMicrophone}>
                  Test Mic
                </Button>
                <Button size="sm" variant="outline" onClick={testSpeechRecognition}>
                  Test Speech
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Browser Support</h3>
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant={diagnostics.speech.speechRecognition ? "default" : "destructive"}>
                      SpeechRecognition: {diagnostics.speech.speechRecognition ? 'Yes' : 'No'}
                    </Badge>
                    <Badge variant={diagnostics.speech.webkitSpeechRecognition ? "default" : "destructive"}>
                      webkitSpeechRecognition: {diagnostics.speech.webkitSpeechRecognition ? 'Yes' : 'No'}
                    </Badge>
                    <Badge variant={diagnostics.window.isSecureContext ? "default" : "destructive"}>
                      Secure Context: {diagnostics.window.isSecureContext ? 'Yes' : 'No'}
                    </Badge>
                    <Badge variant={diagnostics.mediaDevices.getUserMedia ? "default" : "destructive"}>
                      getUserMedia: {diagnostics.mediaDevices.getUserMedia ? 'Yes' : 'No'}
                    </Badge>
                    <Badge variant={diagnostics.browser.onLine ? "default" : "destructive"}>
                      Online: {diagnostics.browser.onLine ? 'Yes' : 'No'}
                    </Badge>
                    <Badge variant={diagnostics.location.protocol === 'https:' ? "default" : "destructive"}>
                      Protocol: {diagnostics.location.protocol}
                    </Badge>
                    {diagnostics.permissions?.microphone && (
                      <Badge variant={diagnostics.permissions.microphone.state === 'granted' ? "default" : "destructive"}>
                        Mic Permission: {diagnostics.permissions.microphone.state}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Device Info</h3>
                <div className="text-sm space-y-1">
                  <p>Browser: {
                    diagnostics.features.isChrome ? 'Chrome' :
                    diagnostics.features.isSafari ? 'Safari' :
                    diagnostics.features.isFirefox ? 'Firefox' :
                    diagnostics.features.isEdge ? 'Edge' : 'Other'
                  }</p>
                  <p>Device: {
                    diagnostics.features.isIOS ? 'iOS' :
                    diagnostics.features.isAndroid ? 'Android' :
                    diagnostics.features.isMobile ? 'Mobile' :
                    diagnostics.features.isTablet ? 'Tablet' : 'Desktop'
                  }</p>
                  <p>Platform: {diagnostics.browser.platform}</p>
                  <p>Language: {diagnostics.browser.language}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <details>
                <summary className="cursor-pointer font-medium">Full Diagnostic Data</summary>
                <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(diagnostics, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 