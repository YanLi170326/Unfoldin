import { EmotionReleaseFlow } from '@/components/emotion-release/emotion-release-flow';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Unfoldin Dashboard</h1>
          <Link href="/" className="text-sm hover:underline">
            Sign Out
          </Link>
        </header>
        
        <main>
          <EmotionReleaseFlow />
          
          <div className="mt-8 max-w-lg mx-auto text-center">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <h3 className="text-lg font-medium mb-2">Prefer to use ChatGPT?</h3>
              <p className="mb-4 text-neutral-600 dark:text-neutral-400">
                Access the same experience directly through ChatGPT without needing an API key
              </p>
              <Button asChild variant="outline" size="sm" className="gap-2 group">
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
        </main>
      </div>
    </div>
  );
} 