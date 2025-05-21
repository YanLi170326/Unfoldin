'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Check if user is authenticated as admin
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/admin/auth/check');
        if (!response.ok) {
          router.push('/admin/login');
          return;
        }
        
        setIsAuthenticated(true);
        
        // Fetch current API settings
        const apiSettingsResponse = await fetch('/api/admin/settings');
        if (apiSettingsResponse.ok) {
          const data = await apiSettingsResponse.json();
          if (data.openaiApiKey) {
            // Mask the API key for display
            setApiKey(data.openaiApiKey);
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAuth();
  }, [router]);
  
  // Save API settings
  const saveApiSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openaiApiKey: apiKey,
        }),
      });
      
      if (response.ok) {
        toast.success('API settings saved successfully');
      } else {
        const data = await response.json();
        toast.error(`Failed to save settings: ${data.message}`);
      }
    } catch (error) {
      console.error('Error saving API settings:', error);
      toast.error('An error occurred while saving settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
      });
      router.push('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null; // Will redirect to login
  }
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>Logout</Button>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>API Settings</CardTitle>
            <CardDescription>Configure the OpenAI API used by the application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-api-key">OpenAI API Key</Label>
              <Input 
                id="openai-api-key" 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <p className="text-sm text-muted-foreground">
                The application will use this API key for all OpenAI requests
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={saveApiSettings} 
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>View and manage application status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p>GPT Model</p>
                <span className="text-green-600 font-medium">GPT-4o (Fixed)</span>
              </div>
              <div className="flex items-center justify-between">
                <p>Web Speech API</p>
                <span className="text-green-600 font-medium">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <p>Whisper API</p>
                <span className="text-green-600 font-medium">Enabled</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 