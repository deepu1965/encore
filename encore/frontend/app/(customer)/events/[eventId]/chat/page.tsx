'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChatHistory, useChatPresence, useSendMessage, ChatMessage, ChatPresence } from '@/features/chat';
import { getWebSocketManager } from '@/lib/websocket-manager';
import { useQueryClient } from '@tanstack/react-query';
import { chatKeys } from '@/features/chat/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WifiOff, Send, AlertCircle, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';

export default function EventChatPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const queryClient = useQueryClient();
  const sendMessage = useSendMessage();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [presence, setPresence] = useState<Record<string, ChatPresence>>({});
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  const [isConnected, setIsConnected] = useState(true);
  const [rateLimited, setRateLimited] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<{id: string, text: string, status: 'sending'|'failed'}[]>([]);

  const highestSequenceRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial load
  const { data: history } = useChatHistory(eventId);
  const { data: initialPresence } = useChatPresence(eventId);

  useEffect(() => {
    if (history) {
      setMessages(history);
      if (history.length > 0) {
        highestSequenceRef.current = Math.max(...history.map(m => m.sequenceId));
      }
    }
  }, [history]);

  useEffect(() => {
    if (initialPresence) {
      const p: Record<string, ChatPresence> = {};
      initialPresence.forEach(u => p[u.userId] = u);
      setPresence(p);
    }
  }, [initialPresence]);

  // WebSocket Subscription
  useEffect(() => {
    if (!eventId) return;
    const ws = getWebSocketManager();
    const channel = `chat.${eventId}`;

    const unsubMsg = ws.subscribe(channel, 'message.sent', (env: any) => {
      const msg = env.data as ChatMessage;
      setMessages(prev => {
        // Ensure no duplicates and keep ordered
        if (prev.find(m => m.id === msg.id)) return prev;
        const next = [...prev, msg].sort((a, b) => a.sequenceId - b.sequenceId);
        const lastMsg = next[next.length - 1];
        if (lastMsg) highestSequenceRef.current = lastMsg.sequenceId;
        return next;
      });
      // Remove from pending if we sent it
      setPendingQueue(q => q.filter(p => p.text !== msg.content));
    });

    const unsubRm = ws.subscribe(channel, 'message.removed', (env: any) => {
      const { id } = env.data;
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isRemoved: true } : m));
    });

    const unsubPres = ws.subscribe(channel, 'presence.updated', (env: any) => {
      const p = env.data as ChatPresence;
      setPresence(prev => ({ ...prev, [p.userId]: p }));
    });

    const unsubTyping = ws.subscribe(channel, 'typing.updated', (env: any) => {
      const { userId, isTyping } = env.data;
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    // Handle connect/disconnect
    const handleStatus = (status: boolean) => {
      setIsConnected(status);
      if (status && highestSequenceRef.current > 0) {
        // Backfill on reconnect
        queryClient.fetchQuery({
          queryKey: chatKeys.history(eventId),
          // In real app, fetch with after_sequence to backfill
        });
      }
    };
    // Need a way to monitor connection status here. 
    // We'll mock it based on browser online status for the UI demo.
    const onOnline = () => handleStatus(true);
    const onOffline = () => handleStatus(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      unsubMsg(); unsubRm(); unsubPres(); unsubTyping();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [eventId, queryClient]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingQueue, typingUsers]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isConnected || rateLimited) return;

    const text = input.trim();
    const idemKey = nanoid();
    setInput('');
    
    // Optimistic UI
    setPendingQueue(prev => [...prev, { id: idemKey, text, status: 'sending' }]);

    try {
      await sendMessage.mutateAsync({ eventId, content: text, idempotencyKey: idemKey });
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 5000); // simple 5s cooldown
      }
      // Mark as failed in queue for manual retry
      setPendingQueue(prev => prev.map(p => p.id === idemKey ? { ...p, status: 'failed' } : p));
    }
  };

  const handleRetry = async (idemKey: string, text: string) => {
    setPendingQueue(prev => prev.map(p => p.id === idemKey ? { ...p, status: 'sending' } : p));
    try {
      await sendMessage.mutateAsync({ eventId, content: text, idempotencyKey: idemKey });
    } catch (err: any) {
      setPendingQueue(prev => prev.map(p => p.id === idemKey ? { ...p, status: 'failed' } : p));
    }
  };

  const onlineCount = Object.values(presence).filter(p => p.isOnline).length;
  const typers = Array.from(typingUsers).filter(id => id !== 'me'); // mock 'me'

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-h3 font-bold flex items-center gap-2">
            Event Chat Room
          </h1>
          <p className="text-sm text-muted-foreground">
            {onlineCount} user{onlineCount !== 1 ? 's' : ''} online
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>Exit</Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border">
        {/* Connection Banner */}
        {!isConnected && (
          <div className="bg-destructive text-white p-2 text-center text-sm flex items-center justify-center gap-2 font-medium">
            <WifiOff className="w-4 h-4" /> You are currently offline. Reconnecting...
          </div>
        )}
        {rateLimited && (
          <div className="bg-warning text-warning-foreground p-2 text-center text-sm font-medium">
            You're sending messages too fast. Please wait a moment.
          </div>
        )}

        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
          {messages.map(msg => {
            if (msg.isRemoved) {
              return (
                <div key={msg.id} className="text-center text-xs text-muted-foreground/50 italic py-2">
                  A message was removed by a moderator
                </div>
              );
            }
            const isMe = msg.senderId === 'me';
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-muted-foreground mb-1 px-1">{msg.senderName}</span>
                <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            );
          })}

          {/* Pending Queue */}
          {pendingQueue.map(p => (
            <div key={p.id} className="flex flex-col items-end">
               <div className="px-4 py-2 rounded-2xl max-w-[80%] bg-primary/50 text-white rounded-tr-sm">
                 {p.text}
               </div>
               {p.status === 'failed' && (
                 <div className="flex items-center gap-2 mt-1">
                   <span className="text-xs text-destructive flex items-center gap-1">
                     <AlertCircle className="w-3 h-3" /> Failed to send
                   </span>
                   <button onClick={() => handleRetry(p.id, p.text)} className="text-xs text-primary hover:underline">Retry</button>
                   <button onClick={() => setPendingQueue(q => q.filter(x => x.id !== p.id))} className="text-xs text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                 </div>
               )}
            </div>
          ))}

          {/* Typing Indicator */}
          {typers.length > 0 && (
            <div className="text-xs text-muted-foreground italic animate-pulse px-2">
              {typers.length === 1 && typers[0] ? `${presence[typers[0]]?.userName || 'Someone'} is typing...` : 'Several people are typing...'}
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 border-t bg-background flex gap-2">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={!isConnected ? "Waiting for connection..." : "Type a message..."}
            disabled={!isConnected || rateLimited}
            className="flex-1"
          />
          <Button type="submit" disabled={!isConnected || !input.trim() || rateLimited}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
