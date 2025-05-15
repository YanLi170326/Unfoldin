import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Header({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <header className="border-b py-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="font-bold text-xl">
          Unfoldin
        </Link>
        
        <nav>
          {isLoggedIn ? (
            <div className="flex gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/">Sign Out</Link>
              </Button>
            </div>
          ) : (
            <div className="flex gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
} 