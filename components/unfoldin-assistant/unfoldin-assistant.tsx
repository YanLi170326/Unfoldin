'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { atom, useAtom } from 'jotai';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SpeechInput from './speech-input';

// Knowledge files content
import sedonaKnowledgeMap from './knowledge/sedona-knowledge-map';
import frameworkMinimal from './knowledge/framework-minimal';
import emotionMap from './knowledge/emotion-map';
import fallbackFramework from './knowledge/fallback-framework';

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

// Unfoldin GPT API Key
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

export default function UnfoldinAssistant() {
  const [assistantResponse, setAssistantResponse] = useAtom(assistantResponseAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [conversationHistory, setConversationHistory] = useAtom(conversationHistoryAtom);
  const [isListening, setIsListening] = useAtom(isListeningAtom);
  const [isSpeaking, setIsSpeaking] = useAtom(isSpeakingAtom);
  const [model, setModel] = useAtom(modelAtom);
  const [autoListenAfterResponse, setAutoListenAfterResponse] = useState(false);
  
  // Unfoldin GPT System Prompt
  const systemPrompt = `# Unfoldin GPT Framework – Minimal Facilitation Directive

You are an emotionally attuned AI facilitator for emotional release.
Your role is to guide users through layered emotional release sessions using a calm, grounded, and non-judgmental approach — never rushing, analyzing, or offering advice.

Respond in English or Chinese, matching the user's language from the beginning.
Follow a structured six-step process (Opening → Reflection → Acknowledgment → Deepening → Release → Integration) using clear, minimal prompts, deliberate pauses, and emotionally attuned language.

Use the reference file \`Imperturbability_Emotion_Map_ENHANCED.txt\` to:
- Identify the emotional category behind the user's described feeling.
- Offer facilitator-style prompts from mapped emotional states.
- Guide the user through that emotion and, when relevant, trace it back to deeper egoic attachments like security, approval, or control.

---

## 🔒 Behavioral Directives

- Never analyze, interpret, or explain the user's experience.
- Do not reflect or rephrase the user's words — only offer emotional categories and direct prompts.
- Avoid adjectives or tonal descriptions (e.g., "gently," "softly," "patiently") that imply judgment.
- Avoid asking, "Would you like to continue?" — always proceed with the next facilitation step or pause.
- Use plain, stripped-down language. Stay with the feeling. Do not encourage narrative or story-making.
- When silence arises, allow space — don't fill it unless the user initiates.

If the user speaks Chinese, respond fully in fluent Chinese.

---

## 🚪 Initial Engagement Guidance

If the user enters nothing or seems unsure at the beginning, initiate with:

> 欢迎你。这里是一个情绪释放的空间。我们会通过问题一层层帮你觉察与释放当下的情绪。你不需要解释或修复任何事情，只要觉察和感受，就足够了。

In English:

> Welcome. This is a space for emotional release. We'll explore and release what's emotionally present — step by step — using simple questions. You don't need to explain or fix anything. Just notice and feel.

---

## 🔁 Release Facilitation Principles

- If the user reports a body sensation, acknowledge only:  
  > "Let the sensation be there. Continue feeling yourself. Is there new emotion coming up on its own?"
- Do not inquire about body parts, pressure, or tension unless the user brings it up spontaneously.
- Keep language neutral and non-stylized.
- Always use the three release questions — without substitutes:

  1. "Can you let this go?"
  2. "Would you let this go?"
  3. "When?"

---

## 📘 Reference Files

- \`Imperturbability_Emotion_Map_ENHANCED.txt\`: For sub-emotion categorization and matching user language to emotional states.
- \`Emotional_Release_AI_GPT_Framework_Bilingual_Fallback.md\`: For full fallback structure, multilingual versions, and extended release loops.
- \`Unfoldin_Sedona_Knowledge_Map_FINAL.md\`: Comprehensive emotional release conceptual framework, including release cycles, core wants, resistance patterns, suppression mechanics, and real-world practices.  
  用于理解整体释放路径、渴望根源、阻力类型及实践节奏，确保引导风格一致。

---

## 🧩 Framework Linkage Notice

This facilitation method follows the step-by-step structure detailed in:  
**Unfoldin_GPT_Framework_Minimal.md**

Use it to:
- Apply consistent dialogue structure across sessions.
- Maintain minimal, neutral tone with step-matching prompts.
- Align tightly with emotional release principles and user-led pacing.`;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userMessage: '',
    },
  });

  // 定义 onSubmit 函数
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      
      // 添加用户消息到对话历史
      const updatedHistory = [...conversationHistory, {role: "user", content: values.userMessage}];
      setConversationHistory(updatedHistory);
      
      // 重置表单
      form.reset();
      
      // 使用 OpenAI 直接与 Unfoldin GPT 系统提示和知识文件通信
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: model, // Use current model (gpt-4o or gpt-3.5-turbo)
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "system",
              content: `Knowledge file 1: Unfoldin_Sedona_Knowledge_Map_FINAL.md\n\n${sedonaKnowledgeMap}`
            },
            {
              role: "system",
              content: `Knowledge file 2: Unfoldin_GPT_Framework_Minimal_with_Reference.md\n\n${frameworkMinimal}`
            },
            {
              role: "system",
              content: `Knowledge file 3: Imperturbability_Emotion_Map_ENHANCED.txt\n\n${emotionMap}`
            },
            {
              role: "system",
              content: `Knowledge file 4: Emotional_Release_AI_GPT_Framework_Bilingual_Fallback.md\n\n${fallbackFramework}`
            },
            ...updatedHistory
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // 检查是否超出配额或速率限制
        if (errorData.error?.message?.includes("exceeded your current quota") && model === "gpt-4o") {
          // 降级到 gpt-3.5-turbo
          setModel("gpt-3.5-turbo");
          toast.warning("切换到 GPT-3.5 模型 (API 配额超出)");
          
          // 使用 gpt-3.5-turbo 重试
          const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "system",
                  content: `Knowledge file 1: Unfoldin_Sedona_Knowledge_Map_FINAL.md\n\n${sedonaKnowledgeMap}`
                },
                {
                  role: "system",
                  content: `Knowledge file 2: Unfoldin_GPT_Framework_Minimal_with_Reference.md\n\n${frameworkMinimal}`
                },
                {
                  role: "system",
                  content: `Knowledge file 3: Imperturbability_Emotion_Map_ENHANCED.txt\n\n${emotionMap}`
                },
                {
                  role: "system",
                  content: `Knowledge file 4: Emotional_Release_AI_GPT_Framework_Bilingual_Fallback.md\n\n${fallbackFramework}`
                },
                ...updatedHistory
              ],
              temperature: 0.7,
            }),
          });
          
          if (!fallbackResponse.ok) {
            const fallbackErrorData = await fallbackResponse.json();
            throw new Error(`OpenAI API error: ${fallbackErrorData.error?.message || 'Unknown error'}`);
          }
          
          const fallbackData = await fallbackResponse.json();
          const assistantMessage = fallbackData.choices[0].message.content;
          
          // 添加助手响应到对话历史
          setConversationHistory([...updatedHistory, {role: "assistant", content: assistantMessage}]);
          setAssistantResponse(assistantMessage);
          
          // 自动朗读响应
          speakText(assistantMessage);
          
          return;
        } else {
          throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
        }
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;
      
      // 添加助手响应到对话历史
      setConversationHistory([...updatedHistory, {role: "assistant", content: assistantMessage}]);
      setAssistantResponse(assistantMessage);
      
      // 自动朗读响应
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
        form.handleSubmit(onSubmit)();
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

  // 语音输入处理函数
  const handleSpeechInput = (text: string) => {
    if (text.trim()) {
      form.setValue('userMessage', text);
    }
  };

  // 切换自动持续对话模式
  const toggleAutoContinue = () => {
    setAutoListenAfterResponse(!autoListenAfterResponse);
    toast.info(autoListenAfterResponse 
      ? '已关闭自动持续对话' 
      : '已开启自动持续对话'
    );
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
    toast.info(`已切换至 ${newModel === "gpt-4o" ? "GPT-4o" : "GPT-3.5-turbo"} 模型`);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Unfoldin Emotional Release Assistant</CardTitle>
            <CardDescription>
              A specialized assistant for emotional release based on the Sedona Method
              {model === "gpt-3.5-turbo" && <span className="ml-2 text-yellow-500">(使用 GPT-3.5 模型)</span>}
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
                      {autoListenAfterResponse ? '连续对话开启' : '连续对话关闭'}
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
                      <SpeechInput 
                        onTranscript={handleSpeechInput}
                        isListening={isListening}
                        setIsListening={setIsListening}
                        autoSubmit={true} // 启用自动提交功能
                      />
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
                  title="停止朗读"
                >
                  停止朗读
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
          Powered by the Unfoldin emotional release framework and the Sedona Method
        </p>
      </CardFooter>
    </Card>
  );
} 