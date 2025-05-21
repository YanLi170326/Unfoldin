import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { userMessage, systemPrompt, knowledgeContent, conversationHistory = [] } = await req.json();

    if (!userMessage) {
      return NextResponse.json({ error: 'User message is required' }, { status: 400 });
    }
    
    // Use API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    // Initialize the OpenAI client with the API key
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Prepare the messages array with system and user messages
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt || "You are a helpful assistant."
      }
    ];
    
    // Add knowledge content if provided
    if (knowledgeContent && knowledgeContent.trim() !== '') {
      messages.push({
        role: "system",
        content: `Here is some knowledge to help you answer: ${knowledgeContent}`
      });
    }
    
    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      // Only include the last 10 messages to avoid token limits
      const recentMessages = conversationHistory.slice(-10);
      messages.push(...recentMessages.map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      })));
    }
    
    // Add the user's latest message
    messages.push({
      role: "user",
      content: userMessage
    });

    // Call the model - always use gpt-4o
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract and return the assistant's response
    const assistantMessage = response.choices[0].message.content;
    
    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error('Error in custom assistant API:', error);
    return NextResponse.json(
      { error: 'Failed to get response from assistant' },
      { status: 500 }
    );
  }
} 