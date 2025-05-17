import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { AuthChecker } from '@/components/auth/auth-checker';

export const metadata: Metadata = {
  title: 'Unfoldin - Emotional Release Assistant',
  description: 'A specialized AI assistant for emotional release based on the Sedona Method',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b p-4">
          <div className="container flex items-center justify-between">
            <h1 className="text-xl font-bold">Unfoldin</h1>
            <AuthChecker />
          </div>
        </header>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
