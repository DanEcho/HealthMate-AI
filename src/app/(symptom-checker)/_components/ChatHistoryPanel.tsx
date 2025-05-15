
'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelLeft, PlusCircle, Trash2, MessageSquareText } from 'lucide-react';
import type { ChatSession } from '../AppLayoutClient';
import { cn } from '@/lib/utils';

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onLoadSession: (sessionId: string) => void;
  onStartNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  triggerButton: React.ReactNode;
}

export function ChatHistoryPanel({
  isOpen,
  onOpenChange,
  sessions,
  activeSessionId,
  onLoadSession,
  onStartNewSession,
  onDeleteSession,
  triggerButton,
}: ChatHistoryPanelProps) {

  const getSessionTitle = (session: ChatSession): string => {
    if (session.title) return session.title; // Use pre-defined title if exists (future enhancement)
    if (session.currentSymptoms && session.currentSymptoms.trim().length > 0) {
      const title = session.currentSymptoms.substring(0, 35);
      return title.length < session.currentSymptoms.length ? title + '...' : title;
    }
    return `Chat from ${new Date(session.timestamp).toLocaleDateString()}`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {triggerButton}
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] flex flex-col p-0">
        <SheetHeader className="p-4 pb-3 border-b">
          <SheetTitle className="text-xl">Chat History</SheetTitle>
          <SheetDescription>
            Select a previous chat or start a new one.
          </SheetDescription>
        </SheetHeader>
        
        <div className="p-4 border-b">
            <Button onClick={() => { onStartNewSession(); onOpenChange(false); }} className="w-full" variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Start New Chat
            </Button>
        </div>

        {sessions.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
            <MessageSquareText className="w-16 h-16 opacity-50 mb-4" />
            <p>No chat history yet.</p>
            <p className="text-xs">Your conversations will appear here after you start a chat.</p>
          </div>
        ) : (
          <ScrollArea className="flex-grow">
            <div className="space-y-1 p-4">
              {sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((session) => (
                <div
                  key={session.id}
                  onClick={() => { onLoadSession(session.id); onOpenChange(false); }}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer border transition-colors hover:bg-accent/50 flex flex-col gap-1",
                    session.id === activeSessionId ? "bg-accent text-accent-foreground border-primary ring-2 ring-primary" : "bg-card hover:border-primary/50"
                  )}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { onLoadSession(session.id); onOpenChange(false); }}}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-medium truncate flex-1 pr-2 leading-tight">{getSessionTitle(session)}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering onLoadSession
                        onDeleteSession(session.id);
                      }}
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.timestamp).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <SheetFooter className="p-4 pt-3 border-t">
            <SheetClose asChild>
                <Button variant="outline" className="w-full">Close</Button>
            </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
