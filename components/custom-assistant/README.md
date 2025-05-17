# Custom OpenAI Assistant Component

This component provides a user interface for interacting with a custom assistant powered by OpenAI's API.

## Features

- **Custom System Prompts**: Define the behavior and expertise of your assistant with system prompts.
- **Knowledge Files**: Upload text files (TXT, MD, JSON, CSV) to provide the assistant with additional context.
- **Simple Interface**: Clean UI built with shadcn components and Tailwind CSS.

## Usage

```tsx
import { CustomAssistant } from '@/components/custom-assistant';

export default function YourPage() {
  return (
    <CustomAssistant 
      initialSystemPrompt="You are an AI assistant specialized in helping with legal questions. Provide detailed explanations of legal concepts in simple terms."
    />
  );
}
```

## API Structure

The component communicates with a Next.js API route at `/api/openai/assistant` that handles the integration with OpenAI.

### API Request Format

```json
{
  "userMessage": "The user's question or prompt",
  "systemPrompt": "Instructions for the AI assistant",
  "knowledgeContent": "Optional text content from uploaded files"
}
```

### API Response Format

```json
{
  "message": "The assistant's response"
}
```

## Environment Variables

Make sure to set up your OpenAI API key in your environment variables:

```
OPENAI_API_KEY=your_api_key_here
```

## Customization

You can customize the assistant's behavior by:

1. Modifying the default system prompt
2. Changing the model used in the API route (currently set to "gpt-4-turbo")
3. Adjusting temperature and max_tokens parameters for different response characteristics 