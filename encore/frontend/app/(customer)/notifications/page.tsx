'use client';

import { useNotifications, useMarkNotificationRead } from '@/features/notifications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2 } from 'lucide-react';

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) return <div className="p-12 text-center animate-pulse">Loading notifications...</div>;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-h2 font-bold flex items-center gap-3">
          <Bell className="w-8 h-8" />
          Notifications
        </h1>
        <Button variant="outline" size="sm" onClick={() => {
          notifications?.forEach(n => {
            if (!n.isRead) markRead.mutate(n.id);
          });
        }}>
          Mark all as read
        </Button>
      </div>

      <div className="space-y-4">
        {(!notifications || notifications.length === 0) ? (
          <Card className="p-12 text-center text-muted-foreground">
            You're all caught up! No notifications to display.
          </Card>
        ) : (
          notifications.map(n => (
            <Card key={n.id} className={`p-4 transition-colors ${!n.isRead ? 'border-primary shadow-sm bg-primary/5' : 'opacity-75'}`}>
              <div className="flex gap-4">
                <div className="mt-1">
                  {!n.isRead ? (
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <p className={`font-semibold ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{new Date(n.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm text-foreground/80">{n.message}</p>
                  
                  {!n.isRead && (
                    <div className="pt-2">
                      <Button variant="ghost" className="h-auto p-0 text-xs" onClick={() => markRead.mutate(n.id)}>
                        Mark as read
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
