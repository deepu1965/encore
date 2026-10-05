'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Radio, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function EventLiveStreamPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasAccess, setHasAccess] = useState(true); // Mocking TICKET_HOLDERS_ONLY access
  const [viewers, setViewers] = useState(1405);

  useEffect(() => {
    // In a real app, initialize HLS.js here and bind to videoRef
    // if (Hls.isSupported()) {
    //   const hls = new Hls();
    //   hls.loadSource('https://example.com/stream.m3u8');
    //   hls.attachMedia(videoRef.current);
    // }
    
    const interval = setInterval(() => {
      setViewers(v => v + Math.floor(Math.random() * 10 - 5));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="p-8 text-center space-y-4 bg-destructive/10 border-destructive/20 text-destructive">
          <AlertCircle className="w-12 h-12 mx-auto" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p>You must hold a valid ticket to this event to access the live stream.</p>
          <Button onClick={() => router.push(`/events/${eventId}`)}>Buy Tickets</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6 flex flex-col h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={() => router.back()} className="-ml-4">
          &larr; Back to Event
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-rose-500 font-bold bg-rose-500/10 px-3 py-1 rounded-full animate-pulse">
            <Radio className="w-4 h-4" /> LIVE
          </div>
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Users className="w-4 h-4" /> {viewers.toLocaleString()}
          </div>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden bg-black flex items-center justify-center relative rounded-xl border-0 shadow-2xl">
        <video 
          ref={videoRef}
          controls 
          className="w-full h-full object-contain"
          poster="https://images.unsplash.com/photo-1540039155732-6762e5b721e7?w=1200&h=800&fit=crop"
        >
          {/* <source src="..." type="application/x-mpegURL" /> */}
        </video>
        
        {/* Placeholder overlay since we don't have a real stream */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40">
           <div className="text-white text-center space-y-2">
             <Radio className="w-16 h-16 mx-auto opacity-50" />
             <p className="font-bold text-xl tracking-widest uppercase">Stream Loading...</p>
             <p className="text-sm opacity-70">HLS.js Player Integration</p>
           </div>
        </div>
      </Card>
    </div>
  );
}
