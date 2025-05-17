'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function AuthChecker() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsLoggedIn(true);
          setUserId(data.userId);
        } else {
          setIsLoggedIn(false);
          setUserId(null);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Logged out successfully');
        setIsLoggedIn(false);
        setUserId(null);
        
        // Redirect to homepage
        router.push('/');
      } else {
        toast.error('Failed to log out');
      }
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-green-600 dark:text-green-400">
          Logged in
        </span>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGoToDashboard}
          >
            Dashboard
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleLogout}
          >
            Log out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">
        Not logged in
      </span>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/login')}
        >
          Log in
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/register')}
        >
          Register
        </Button>
      </div>
    </div>
  );
} 