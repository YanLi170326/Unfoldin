'use client';

import { useState, useRef, ChangeEvent } from 'react';
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

// Define form schema
const formSchema = z.object({
  userMessage: z.string().min(1, 'Please enter a message'),
  systemPrompt: z.string().optional(),
});

// Define state atoms
const assistantResponseAtom = atom<string | null>(null);
const isLoadingAtom = atom<boolean>(false);

export type CustomAssistantProps = {
  initialSystemPrompt?: string;
};

export default function CustomAssistant({ initialSystemPrompt = 'You are a helpful assistant.' }: CustomAssistantProps) {
  const [assistantResponse, setAssistantResponse] = useAtom(assistantResponseAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [knowledgeContent, setKnowledgeContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userMessage: '',
      systemPrompt: initialSystemPrompt,
    },
  });

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Only accept text files
    if (!file.type.startsWith('text/')) {
      toast.error('Please upload a text file (.txt, .md, etc.)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const text = await file.text();
      setKnowledgeContent(text);
      setFileName(file.name);
      toast.success(`File "${file.name}" loaded successfully`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read file');
      setKnowledgeContent('');
      setFileName('');
    }
  };

  const clearKnowledgeFile = () => {
    setKnowledgeContent('');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/openai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: values.userMessage,
          systemPrompt: values.systemPrompt || initialSystemPrompt,
          knowledgeContent: knowledgeContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from assistant');
      }

      const data = await response.json();
      setAssistantResponse(data.message);
      form.reset({ userMessage: '', systemPrompt: values.systemPrompt });
    } catch (error) {
      console.error('Error calling assistant API:', error);
      toast.error('Failed to get a response from the assistant');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Custom AI Assistant</CardTitle>
        <CardDescription>
          Ask questions or provide instructions to your custom assistant
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt (Instructions for the assistant)</FormLabel>
                  <FormControl>
                    <Input placeholder="You are a helpful assistant..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <Label htmlFor="knowledge-file">Knowledge File (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="knowledge-file"
                  type="file"
                  accept=".txt,.md,.json,.csv"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="flex-1"
                />
                {fileName && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearKnowledgeFile}
                    type="button"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {fileName && (
                <p className="text-xs text-muted-foreground">
                  Loaded: {fileName} ({Math.round(knowledgeContent.length / 1024 * 100) / 100} KB)
                </p>
              )}
            </div>
            
            <FormField
              control={form.control}
              name="userMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Message</FormLabel>
                  <FormControl>
                    <Input placeholder="Type your message here..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Getting Response...' : 'Send Message'}
            </Button>
          </form>
        </Form>
        
        {isLoading && (
          <div className="w-full py-2">
            <Progress value={45} className="w-full" />
          </div>
        )}
        
        {assistantResponse && (
          <div className="mt-4 p-4 border rounded-md bg-secondary/20">
            <Label>Assistant Response:</Label>
            <div className="mt-2 whitespace-pre-wrap">{assistantResponse}</div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Powered by OpenAI API
        </p>
      </CardFooter>
    </Card>
  );
} 