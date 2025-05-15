
'use client';

import type { ChatMessage } from '@/app/(symptom-checker)/AppLayoutClient';
import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquarePlus, Send, Bot, UserCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';


interface FollowUpSectionProps {
  chatMessages: ChatMessage[];
  onSendMessage: (messageText: string) => Promise<void>;
  isLoading: boolean;
  isContextAvailable: boolean; // New prop
}

export function FollowUpSection({
  chatMessages,
  onSendMessage,
  isLoading,
  isContextAvailable, // Use this prop
}: FollowUpSectionProps) {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isContextAvailable) return; // Also check context here as a safeguard
    await onSendMessage(newMessage);
    setNewMessage(''); 
  };

  const isDisabled = isLoading || !isContextAvailable;
  const placeholderText = !isContextAvailable 
    ? "Please get initial insights above before chatting." 
    : "Type your message here...";

  return (
    <Card className="mt-6 shadow-lg w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <MessageSquarePlus className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl font-semibold">Chat with HealthAssist AI</CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Ask follow-up questions or provide more details. The AI will refine its insights based on our conversation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/10" ref={scrollAreaRef}>
           <div className="p-4 space-y-4" ref={viewportRef}>
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-16">
                <Bot className="h-12 w-12 mb-2 opacity-50" />
                <p>No messages yet.</p>
                <p className="text-xs">
                  {isContextAvailable 
                    ? "(Ask a follow-up question below)" 
                    : "(Complete the symptom form above to start chatting)"}
                </p>
              </div>
            )}
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col p-3 shadow-sm max-w-[85%] break-words rounded-2xl', 
                  msg.role === 'user' ? 'bg-primary/90 text-primary-foreground self-end items-end ml-auto rounded-br-sm' : 'bg-accent/80 text-accent-foreground self-start items-start mr-auto rounded-bl-sm' 
                )}
              >
                <div className={cn("flex items-center gap-2 mb-1", msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  {msg.role === 'user' ? <UserCircle className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  <span className="text-xs font-semibold">
                    {msg.role === 'user' ? 'You' : 'HealthAssist AI'}
                  </span>
                </div>
                <p className={cn("text-sm whitespace-pre-line", msg.role === 'user' ? 'text-right' : 'text-left')}>{msg.text}</p>
                <p className={cn("text-xs mt-1 self-start opacity-70", msg.role === 'user' ? 'text-primary-foreground/80' : 'text-accent-foreground/80')} >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
            {isLoading && chatMessages.length > 0 && ( 
               <div className="flex items-center justify-start gap-2 p-2 self-start mr-auto mt-2">
                  <Bot className="h-5 w-5 text-muted-foreground animate-pulse" />
                  <LoadingSpinner size={16} className="text-muted-foreground"/>
                  <span className="text-xs text-muted-foreground">AI is typing...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
          <Textarea
            placeholder={placeholderText}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow min-h-[40px] resize-none rounded-xl" 
            rows={1}
            disabled={isDisabled} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleFormSubmit(e);
              }
            }}
          />
          <Button type="submit" disabled={isDisabled || !newMessage.trim()} size="icon" aria-label="Send message" className="rounded-full"> 
            {isLoading ? <LoadingSpinner size={20} /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

