'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, UploadCloud, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizerDocumentsPage() {
  const [uploadState, setUploadState] = useState<'IDLE' | 'CHUNKING' | 'UPLOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const handleSimulateChunkedUpload = async () => {
    setUploadState('CHUNKING');
    setProgress(0);
    
    // Simulate chunked upload (5MB chunks, 3 retries per chunk as per rules)
    await new Promise(r => setTimeout(r, 500));
    setUploadState('UPLOADING');
    
    for (let i = 1; i <= 5; i++) {
      await new Promise(r => setTimeout(r, 800));
      setProgress(i * 20);
    }
    
    setUploadState('SUCCESS');
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="space-y-2 border-b pb-4">
        <h1 className="text-h2 font-bold">Document Management</h1>
        <p className="text-muted-foreground">Securely upload and manage venue contracts, tax forms, and compliance documents.</p>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-8">
        <Card className="p-12 flex flex-col items-center justify-center border-dashed border-2 bg-muted/10 space-y-4">
           <UploadCloud className="w-12 h-12 text-muted-foreground" />
           <h3 className="font-semibold text-lg">Upload Large Document</h3>
           <p className="text-sm text-muted-foreground text-center max-w-sm">
             Files are automatically split into 5MB chunks and uploaded with 3 retries per chunk for reliable delivery over poor connections.
           </p>
           
           <Button onClick={handleSimulateChunkedUpload} disabled={uploadState === 'CHUNKING' || uploadState === 'UPLOADING'}>
             Select File (Max 1GB)
           </Button>

           {(uploadState === 'CHUNKING' || uploadState === 'UPLOADING') && (
             <div className="w-full max-w-xs space-y-2 pt-4">
               <div className="flex justify-between text-xs text-muted-foreground">
                 <span>{uploadState === 'CHUNKING' ? 'Preparing chunks...' : 'Uploading...'}</span>
                 <span>{progress}%</span>
               </div>
               <div className="w-full bg-muted rounded-full h-2">
                 <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
               </div>
             </div>
           )}

           {uploadState === 'SUCCESS' && (
             <div className="text-success text-sm font-medium mt-4 bg-success/10 px-4 py-2 rounded-md">
               Upload complete! File successfully assembled on server.
             </div>
           )}
        </Card>

        <div className="space-y-4">
          <h3 className="font-bold text-lg border-b pb-2">Recent Documents</h3>
          <div className="space-y-3">
             {[1, 2, 3].map(i => (
               <div key={i} className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/organizer/documents/doc_${i}`)}>
                 <FileText className="w-8 h-8 text-muted-foreground shrink-0" />
                 <div>
                   <p className="text-sm font-semibold truncate w-40">Venue_Contract_0{i}.pdf</p>
                   <p className="text-xs text-muted-foreground">12.4 MB</p>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
