'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { UserIcon, MessageSquare, Calendar, ArrowLeft, LockIcon } from 'lucide-react';
import { toast } from 'sonner';

type Session = {
  id: string;
  created_at: string;
  session_data: {
    conversation: {
      role: 'user' | 'assistant';
      content: string;
    }[];
  };
};

type User = {
  id: string;
  username: string;
  created_at: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');
        
        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated, redirect to login
            router.push('/login?redirect=/profile');
            return;
          }
          throw new Error('Failed to fetch profile data');
        }
        
        const data = await response.json();
        setUser(data.user);
        setSessions(data.sessions);
        
        // Set the first session as selected if available
        if (data.sessions.length > 0) {
          setSelectedSession(data.sessions[0]);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [router]);

  const handleSelectSession = (session: Session) => {
    setSelectedSession(session);
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const formatChatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  const getMessagePreview = (session: Session) => {
    const conversation = session.session_data.conversation;
    if (!conversation || conversation.length === 0) return 'No messages';
    
    // Get the last user message
    const lastUserMessage = [...conversation]
      .reverse()
      .find(msg => msg.role === 'user');
    
    if (!lastUserMessage) return 'No user messages';
    
    return lastUserMessage.content.length > 30
      ? `${lastUserMessage.content.substring(0, 30)}...`
      : lastUserMessage.content;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-3/4 mb-6" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px] md:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Profile</h1>
          <p className="mb-6 text-red-500">{error}</p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">User Profile</h1>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="text-xl">
                  {user ? getInitials(user.username) : 'U'}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{user?.username}</h2>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <UserIcon size={14} />
                <span>User</span>
              </div>
              <div className="mt-4 w-full">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Account created</span>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{user?.created_at ? formatChatTime(user.created_at) : 'Unknown'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Chat sessions</span>
                  <span>{sessions.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Chat History */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Chat History</CardTitle>
                  <CardDescription>Your previous conversations</CardDescription>
                </div>
                <Badge className="flex items-center gap-1" variant="outline">
                  <LockIcon size={12} />
                  Private
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium">No chat history</h3>
                  <p className="text-muted-foreground mt-1 mb-4">
                    You haven't had any conversations yet
                  </p>
                  <Button asChild>
                    <Link href="/dashboard">Start Chatting</Link>
                  </Button>
                </div>
              ) : (
                <Tabs defaultValue="history" className="w-full">
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="conversation">Conversation</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="history" className="space-y-4">
                    <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                      {sessions.map((session) => (
                        <button
                          key={session.id}
                          className={`w-full text-left p-3 hover:bg-muted transition-colors ${
                            selectedSession?.id === session.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => handleSelectSession(session)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <MessageSquare size={18} />
                              <span className="font-medium">Chat Session</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatChatTime(session.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {getMessagePreview(session)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="conversation">
                    {selectedSession ? (
                      <div className="border rounded-md p-4 max-h-[400px] overflow-y-auto">
                        <div className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                          <Calendar size={14} />
                          {formatChatTime(selectedSession.created_at)}
                        </div>
                        
                        <div className="space-y-4">
                          {selectedSession.session_data.conversation.map((message, index) => (
                            <div 
                              key={index}
                              className={`p-3 rounded-lg ${
                                message.role === 'user' 
                                  ? 'bg-primary/10 ml-8' 
                                  : 'bg-secondary/20 mr-8'
                              }`}
                            >
                              <div className="font-semibold mb-1">
                                {message.role === 'user' ? 'You' : 'Assistant'}
                              </div>
                              <div className="whitespace-pre-wrap text-sm">
                                {message.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-8 text-muted-foreground">
                        Select a chat session to view the conversation
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground flex items-center gap-1">
              <LockIcon size={12} />
              All chat history is private and visible only to you
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
} 