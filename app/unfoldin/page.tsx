import { UnfoldinAssistant } from '@/components/unfoldin-assistant';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Unfoldin Emotional Release Assistant',
  description: 'A specialized emotional release assistant',
};

export default async function UnfoldinPage() {
  // Check for authentication
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  // If not authenticated, redirect to login
  if (!userId) {
    redirect('/login?redirect=/unfoldin');
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Unfoldin Emotional Release Assistant</h1>
      <p className="text-center mb-8 text-muted-foreground">
        A guided emotional release experience
      </p>
      
      <div className="my-8">
        <UnfoldinAssistant />
      </div>
      
      <div className="mt-12 space-y-4 text-center text-sm text-muted-foreground">
        <p>
          This assistant helps you identify, feel, and release emotions through a structured process.
        </p>
        <p>
          The conversation happens directly through the OpenAI API and is not stored on our servers.
        </p>
      </div>
    </div>
  );
} 