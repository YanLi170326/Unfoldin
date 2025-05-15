import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Unfoldin Demo</h1>
        <p className="text-xl">
          A voice-driven tool for emotional release and personal growth
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/register">Create Account</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Log In</Link>
          </Button>
        </div>
        
        {/* Database setup diagnostic link */}
        <div className="pt-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/api/db-setup">Check Database Connection</Link>
          </Button>
        </div>
        
        <div className="pt-12">
          <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <h3 className="font-medium mb-2">1. Voice Guidance</h3>
              <p>Listen to AI-guided questions designed to help you identify emotions</p>
            </div>
            <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <h3 className="font-medium mb-2">2. Reflection Periods</h3>
              <p>Take time to reflect in silence after each question</p>
            </div>
            <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <h3 className="font-medium mb-2">3. Emotional Release</h3>
              <p>Experience relief as you process and release difficult emotions</p>
            </div>
          </div>
        </div>
        
        <div className="pt-8 pb-4">
          <h2 className="text-2xl font-semibold mb-4">Try it on ChatGPT</h2>
          <p className="mb-6">Access Unfoldin directly through ChatGPT without needing to create an account</p>
          <Button asChild size="lg" className="gap-2 group">
            <a 
              href="https://chatgpt.com/g/g-681eea969770819185fdd2ca5b25438f-unfoldin-beta" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Open in ChatGPT
              <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
