'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { atom, useAtom } from 'jotai';
import { toast } from 'sonner';
import { ExternalLink, Repeat, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SpeechInput from './speech-input';
import FallbackSpeechInput from './fallback-speech-input';

// Knowledge files content
import sedonaKnowledgeMap from './knowledge/sedona-knowledge-map';
import frameworkMinimal from './knowledge/framework-minimal';
import emotionMap from './knowledge/emotion-map';
import fallbackFramework from './knowledge/fallback-framework';
import shortResponseGuide from './knowledge/short-response-guide';

// Define form schema
const formSchema = z.object({
  userMessage: z.string().min(1, 'Please enter a message'),
});

// Define state atoms
const assistantResponseAtom = atom<string | null>(null);
const isLoadingAtom = atom<boolean>(false);
const conversationHistoryAtom = atom<{role: string, content: string}[]>([]);
const isListeningAtom = atom<boolean>(false);
const isSpeakingAtom = atom<boolean>(false);
const modelAtom = atom<"gpt-4o" | "gpt-3.5-turbo">("gpt-4o"); // Default to gpt-4o, fallback to gpt-3.5-turbo

export default function UnfoldinAssistant() {
  const [assistantResponse, setAssistantResponse] = useAtom(assistantResponseAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [conversationHistory, setConversationHistory] = useAtom(conversationHistoryAtom);
  const [isListening, setIsListening] = useAtom(isListeningAtom);
  const [isSpeaking, setIsSpeaking] = useAtom(isSpeakingAtom);
  const [model, setModel] = useAtom(modelAtom);
  const [autoListenAfterResponse, setAutoListenAfterResponse] = useState(false);
  const [webSpeechSupported, setWebSpeechSupported] = useState<boolean | null>(null);
  const [useFallbackSpeech, setUseFallbackSpeech] = useState(false);
  
  // Unfoldin GPT System Prompt
  const systemPrompt = `# Unfoldin Emotional Release Conversation Guide

You are an emotionally attuned AI facilitator for emotional release, focusing on natural, flowing conversation.
Your goal is to guide users through emotional release in a conversational way that feels like talking with a skilled human facilitator.

## Core Principles

1. **Natural Conversation**: Respond conversationally, avoiding scripted or robotic language. Each response should feel fresh and unique.

2. **Emotional Attunement**: Stay attuned to the emotions the user expresses, responding with empathy and understanding.

3. **No Analysis**: Don't analyze, interpret, or explain the user's experience. Simply acknowledge and guide.

4. **Language Selection**: DEFAULT TO ENGLISH for all responses unless the user explicitly writes in Chinese. If the user writes in Chinese, respond in Chinese. Always match the user's language choice.

5. **Release Framework**: Guide conversations toward emotional release using the Sedona Method framework, but do so naturally without rigid adherence to scripts.

## Emotional Release Flow

While keeping the conversation natural, guide users through this general flow:

1. **Awareness**: Help users become aware of their emotions. Ask what they're feeling or experiencing.

2. **Exploration**: Explore the feeling without getting caught in the story. Focus on the emotion itself.

3. **Acceptance**: Encourage acceptance of the emotion as it is without trying to change it.

4. **Release Questions**: When appropriate, naturally integrate these three questions into the conversation:
   - "Could you let this feeling go?" or "Can you let this go?"
   - "Would you let this feeling go?" or "Would you let this go?"
   - "When?" or "When would you be willing to let this go?"

5. **Integration**: After releasing, check in on what's present now and repeat if needed.

## Conversation Guidelines

- **Short Responses**: Keep responses concise and focused.
- **Flexible Approach**: Adapt to the user's needs rather than following a rigid script.
- **Multiple Rounds**: Be prepared to go through multiple rounds of the release process in a single conversation.
- **Natural Ending**: Allow conversations to end naturally when the user seems complete.
- **Body Awareness**: When helpful, encourage awareness of bodily sensations.

## Special Response Patterns

- For resistance: "I notice you might be feeling some resistance. That's completely normal. Would you be willing to feel that resistance for a moment?"

- For unclear emotions: "What is most present for you right now?" or "What sensation do you notice in your body right now?"

- For short answers: Acknowledge briefly and ask an open question to encourage deeper exploration.

Use the knowledge from the reference files to identify emotions and guide the release process, but integrate this knowledge naturally into the conversation rather than applying it mechanically.`;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userMessage: '',
    },
  });

  // Modify the onSubmit function to no longer require API key
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      
      // Add user message to conversation history
      const updatedHistory = [...conversationHistory, {role: "user", content: values.userMessage}];
      setConversationHistory(updatedHistory);
      
      // Reset form
      form.reset();
      
      // Use our backend API instead of calling OpenAI directly
      const response = await fetch('/api/openai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: values.userMessage,
          systemPrompt: systemPrompt,
          knowledgeContent: `
            Knowledge file 1: Unfoldin_Sedona_Knowledge_Map_FINAL.md\n\n${sedonaKnowledgeMap}
            Knowledge file 2: Unfoldin_GPT_Framework_Minimal_with_Reference.md\n\n${frameworkMinimal}
            Knowledge file 3: Imperturbability_Emotion_Map_ENHANCED.txt\n\n${emotionMap}
            Knowledge file 4: Emotional_Release_AI_GPT_Framework_Bilingual_Fallback.md\n\n${fallbackFramework}
            Knowledge file 5: Short_Response_Guide.md\n\n${shortResponseGuide}
          `,
          // Pass the entire conversation history (excluding the latest user message which we just added)
          conversationHistory: conversationHistory,
          model: model
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Check if quota exceeded or rate limited
        if (errorData.error?.message?.includes("exceeded your current quota") && model === "gpt-4o") {
          // Downgrade to gpt-3.5-turbo
          setModel("gpt-3.5-turbo");
          toast.warning("Switching to GPT-3.5 model (API quota exceeded)");
          
          // Retry with gpt-3.5-turbo
          const fallbackResponse = await fetch('/api/openai/assistant', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userMessage: values.userMessage,
              systemPrompt: systemPrompt,
              knowledgeContent: `
                Knowledge file 1: Unfoldin_Sedona_Knowledge_Map_FINAL.md\n\n${sedonaKnowledgeMap}
                Knowledge file 2: Unfoldin_GPT_Framework_Minimal_with_Reference.md\n\n${frameworkMinimal}
                Knowledge file 3: Imperturbability_Emotion_Map_ENHANCED.txt\n\n${emotionMap}
                Knowledge file 4: Emotional_Release_AI_GPT_Framework_Bilingual_Fallback.md\n\n${fallbackFramework}
                Knowledge file 5: Short_Response_Guide.md\n\n${shortResponseGuide}
              `,
              // Pass the conversation history
              conversationHistory: conversationHistory,
              model: "gpt-3.5-turbo"
            }),
          });
          
          if (!fallbackResponse.ok) {
            const fallbackErrorData = await fallbackResponse.json();
            throw new Error(`OpenAI API error: ${fallbackErrorData.error?.message || 'Unknown error'}`);
          }
          
          const fallbackData = await fallbackResponse.json();
          const assistantMessage = fallbackData.message;
          
          // Add assistant response to conversation history
          setConversationHistory([...updatedHistory, {role: "assistant", content: assistantMessage}]);
          setAssistantResponse(assistantMessage);
          
          // Auto read response
          speakText(assistantMessage);
          
          return;
        } else {
          throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
        }
      }

      const data = await response.json();
      const assistantMessage = data.message;
      
      // Add assistant response to conversation history
      setConversationHistory([...updatedHistory, {role: "assistant", content: assistantMessage}]);
      setAssistantResponse(assistantMessage);
      
      // Auto read response
      speakText(assistantMessage);
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      toast.error(`Failed to get a response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 添加事件监听器，用于处理语音识别完成后自动提交表单
  useEffect(() => {
    const handleSpeechSubmit = (event: CustomEvent) => {
      // 如果正在加载响应，则不处理语音提交
      if (isLoading) return;
      
      // 确保表单有内容并且提交
      if (form.getValues('userMessage').trim()) {
        try {
          form.handleSubmit(onSubmit)();
        } catch (error) {
          console.error('处理语音提交时出错:', error);
          toast.error('提交语音输入失败，请重试');
        }
      }
    };

    // 添加事件监听
    document.addEventListener('speech-submit', handleSpeechSubmit as EventListener);
    
    // 清理函数
    return () => {
      document.removeEventListener('speech-submit', handleSpeechSubmit as EventListener);
    };
  }, [form, isLoading, onSubmit]);

  // 添加助手响应完成后自动开始监听的功能
  useEffect(() => {
    if (autoListenAfterResponse && !isLoading && assistantResponse && !isListening) {
      // 延迟一小段时间后自动开始下一次语音输入
      const timer = setTimeout(() => {
        setIsListening(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [autoListenAfterResponse, isLoading, assistantResponse, isListening, setIsListening]);

  const clearConversation = () => {
    setConversationHistory([]);
    setAssistantResponse(null);
    form.reset();
    toast.success('Conversation cleared');
  };

  // Check for Web Speech API support
  useEffect(() => {
    const checkSpeechSupport = () => {
      const isSecureContext = window.isSecureContext || 
                             window.location.protocol === 'https:' || 
                             window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1';
                             
      const isSpeechRecognitionSupported = 
        'SpeechRecognition' in window || 
        'webkitSpeechRecognition' in window;
      
      // Speech Recognition is supported only if both secure context and browser API support
      setWebSpeechSupported(isSecureContext && isSpeechRecognitionSupported);
    };
    
    checkSpeechSupport();
  }, []);

  // Toggle between Web Speech API and Fallback method
  const toggleSpeechInputMethod = useCallback(() => {
    setUseFallbackSpeech(prev => !prev);
    toast.info(useFallbackSpeech 
      ? 'Switched to browser speech recognition (WebSpeech API)' 
      : 'Switched to API-based speech recognition (OpenAI Whisper)');
  }, [useFallbackSpeech]);

  // 语音输入内容更新
  const handleSpeechInput = useCallback((text: string) => {
    form.setValue('userMessage', text);
  }, [form]);

  // 切换自动持续对话模式
  const toggleAutoContinue = () => {
    setAutoListenAfterResponse(!autoListenAfterResponse);
    toast.info(autoListenAfterResponse ? 'Auto-dialog enabled' : 'Auto-dialog disabled');
  };

  // 文字转语音功能
  const speakText = (text: string) => {
    // 检查浏览器是否支持语音合成
    if (!('speechSynthesis' in window)) {
      console.log('您的浏览器不支持语音合成');
      return;
    }

    // 如果当前正在朗读，先停止
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // 根据文本内容自动检测语言
    // 简单判断：如果包含中文字符，使用中文
    if (/[\u4e00-\u9fa5]/.test(text)) {
      utterance.lang = 'zh-CN';
    } else {
      utterance.lang = 'en-US';
    }

    // 设置语速和音量
    utterance.rate = 1.0;
    utterance.volume = 1.0;

    // 开始/结束事件处理
    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };

    // 开始朗读
    window.speechSynthesis.speak(utterance);
  };

  // 停止朗读
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // 切换模型
  const handleModelChange = (newModel: "gpt-4o" | "gpt-3.5-turbo") => {
    setModel(newModel);
    toast.info(`Switched to ${newModel === "gpt-4o" ? "GPT-4o" : "GPT-3.5-turbo"} model`);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Unfoldin Emotional Release Assistant</CardTitle>
            <CardDescription>
              A guided emotional release chat
              {model === "gpt-3.5-turbo" && <span className="ml-2 text-yellow-500">(Using GPT-3.5 model)</span>}
            </CardDescription>
          </div>
          <div className="w-40">
            <Select 
              value={model} 
              onValueChange={(value: string) => handleModelChange(value as "gpt-4o" | "gpt-3.5-turbo")}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5-turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Optional: Add informational box about using the built-in API */}
        <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 text-center mb-4">
          <p className="text-sm text-muted-foreground mb-1">
            Chat with this assistant to identify, feel, and release emotions through a guided conversation.
          </p>
        </div>

        {conversationHistory.length > 0 && (
          <div className="my-4 space-y-4">
            {conversationHistory.map((message, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-primary/10 ml-8' 
                    : 'bg-secondary/20 mr-8'
                }`}
              >
                <div className="font-semibold mb-1 flex justify-between items-center">
                  <span>{message.role === 'user' ? 'You' : 'Assistant'}:</span>
                  {message.role === 'assistant' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => speakText(message.content)}
                      title="播放语音"
                      className="h-6 w-6"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                      </svg>
                    </Button>
                  )}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            ))}
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex justify-between items-center">
                    <span>Your Message</span>
                    <Button
                      type="button"
                      variant={autoListenAfterResponse ? "default" : "outline"}
                      size="sm"
                      onClick={toggleAutoContinue}
                      className="text-xs h-7 px-2 gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      {autoListenAfterResponse ? 'Auto-dialog enabled' : 'Auto-dialog disabled'}
                    </Button>
                  </FormLabel>
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Textarea 
                        placeholder="Share what you're feeling..." 
                        className="min-h-20"
                        {...field} 
                      />
                    </FormControl>
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex items-center space-x-2">
                        {webSpeechSupported !== null && (
                          <>
                            {useFallbackSpeech || !webSpeechSupported ? (
                              <FallbackSpeechInput 
                                onTranscript={handleSpeechInput}
                                isListening={isListening}
                                setIsListening={setIsListening}
                                autoSubmit={true}
                              />
                            ) : (
                              <SpeechInput 
                                onTranscript={handleSpeechInput}
                                isListening={isListening}
                                setIsListening={setIsListening}
                                autoSubmit={true}
                              />
                            )}
                            
                            {webSpeechSupported && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={toggleSpeechInputMethod}
                                title={useFallbackSpeech 
                                  ? "切换到浏览器语音识别" 
                                  : "切换到API语音识别"
                                }
                              >
                                <RotateCw className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading || isListening} className="flex-1">
                {isLoading ? 'Thinking...' : 'Send'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={clearConversation}
                disabled={conversationHistory.length === 0}
              >
                Clear
              </Button>

              {isSpeaking && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={stopSpeaking}
                  title="Stop reading"
                >
                  Stop Reading
                </Button>
              )}
            </div>
          </form>
        </Form>
        
        {isLoading && (
          <div className="w-full py-2">
            <Progress value={45} className="w-full" />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <p className="text-xs text-muted-foreground">
          Powered by the Unfoldin emotional release framework
        </p>
      </CardFooter>
    </Card>
  );
} 