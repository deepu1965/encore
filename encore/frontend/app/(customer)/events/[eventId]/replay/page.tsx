'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function EventReplayPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // In a real app, initialize HLS.js or use standard HTML5 video for MP4 VOD
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6 flex flex-col h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={() => router.back()} className="-ml-4">
          &larr; Back to Event
        </Button>
        <div className="flex items-center gap-2 text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">
          <PlayCircle className="w-4 h-4" /> VOD REPLAY
        </div>
      </div>

      <Card className="flex-1 overflow-hidden bg-black flex items-center justify-center relative rounded-xl border-0 shadow-2xl">
        <video 
          ref={videoRef}
          controls 
          className="w-full h-full object-contain"
          poster="https://images.unsplash.com/photo-1540039155732-6762e5b721e7?w=1200&h=800&fit=crop"
        >
          {/* <source src="..." type="video/mp4" /> */}
        </video>
        
        {/* Placeholder overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40">
           <div className="text-white text-center space-y-2">
             <PlayCircle className="w-16 h-16 mx-auto opacity-50" />
             <p className="font-bold text-xl tracking-widest uppercase">VOD Ready</p>
             <p className="text-sm opacity-70">Video-On-Demand Replay Viewer</p>
           </div>
        </div>
      </Card>
    </div>
  );
}
