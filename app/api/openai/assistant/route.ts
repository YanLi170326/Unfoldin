import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Initialize the OpenAI client with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { userMessage, systemPrompt, knowledgeContent } = await req.json();

    if (!userMessage) {
      return NextResponse.json({ error: 'User message is required' }, { status: 400 });
    }

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
    
    // Add the user's question
    messages.push({
      role: "user",
      content: userMessage
    });

    // Create the chat completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Extract and return the assistant's response
    const assistantMessage = completion.choices[0].message.content;
    
    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error('Error in custom assistant API:', error);
    return NextResponse.json(
      { error: 'Failed to get response from assistant' },
      { status: 500 }
    );
  }
} 