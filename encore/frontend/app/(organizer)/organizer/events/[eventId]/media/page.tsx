'use client';

import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getWebSocketManager } from '@/lib/websocket-manager';
import { useEffect, useState } from 'react';
import { Image as ImageIcon, Video, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function OrganizerEventMediaPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [transcodeStatus, setTranscodeStatus] = useState<'IDLE' | 'PROGRESS' | 'READY' | 'FAILED'>('IDLE');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!eventId) return;
    const ws = getWebSocketManager();
    const channel = `stream.${eventId}.transcode`;
    
    const unsubProg = ws.subscribe(channel, 'transcode.progress', (env: any) => {
      setTranscodeStatus('PROGRESS');
      setProgress(env.data.percent);
    });
    
    const unsubReady = ws.subscribe(channel, 'transcode.ready', () => {
      setTranscodeStatus('READY');
      setProgress(100);
    });

    const unsubFail = ws.subscribe(channel, 'transcode.failed', () => {
      setTranscodeStatus('FAILED');
    });

    return () => { unsubProg(); unsubReady(); unsubFail(); };
  }, [eventId]);

  const simulateUpload = () => {
    setTranscodeStatus('PROGRESS');
    setProgress(0);
    // In reality, this triggers a real backend process via REST, which emits WS events.
    // For demo purposes, we rely on the WS listener, assuming the user triggers it manually via console or backend mocking.
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2 border-b pb-4">
        <h1 className="text-h3 font-bold">Media & Assets</h1>
        <p className="text-muted-foreground">Manage hero images, seat map SVGs, and promo videos.</p>
      </div>

      <Card className="p-6 space-y-6">
        <h2 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
          <Video className="w-5 h-5 text-primary" /> Promo Video Transcoding
        </h2>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a high-quality promo video. Our system will automatically transcode it into HLS streams for optimal delivery across all devices.
          </p>
          
          <div className="flex gap-4 items-center">
            <Button onClick={simulateUpload} disabled={transcodeStatus === 'PROGRESS'}>
              Upload Video
            </Button>
            
            {transcodeStatus === 'PROGRESS' && (
              <div className="flex items-center gap-2 text-sm text-primary font-medium">
                <Loader2 className="w-4 h-4 animate-spin" /> Transcoding... {progress}%
              </div>
            )}
            
            {transcodeStatus === 'READY' && (
              <div className="flex items-center gap-2 text-sm text-success font-medium">
                <CheckCircle2 className="w-4 h-4" /> Ready for playback
              </div>
            )}
            
            {transcodeStatus === 'FAILED' && (
              <div className="flex items-center gap-2 text-sm text-destructive font-medium">
                <AlertTriangle className="w-4 h-4" /> Transcoding failed
              </div>
            )}
          </div>

          {transcodeStatus === 'PROGRESS' && (
            <div className="w-full bg-muted rounded-full h-2 mt-4">
              <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
