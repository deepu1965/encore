'use client';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
export default function AttendeePage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-h3 font-bold">Attendee List</h1>
      <div className="bg-warning/20 text-warning px-4 py-3 rounded-md text-sm flex gap-2 items-center font-medium">
        <AlertCircle className="w-5 h-5 shrink-0" />
        Strict PII Access: You may only view attendee information for users who have opted-in or purchased tickets to this specific event.
      </div>
      <Card className="p-12 text-center text-muted-foreground">Attendee data loading...</Card>
    </div>
  );
}
