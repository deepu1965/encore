'use client';

import { Bell } from 'lucide-react';
import { useNotifications, useMarkNotificationRead } from '@/features/notifications';
import { getWebSocketManager } from '@/lib/websocket-manager';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from '@/features/notifications/types';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function NotificationsDropdown() {
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const ws = getWebSocketManager();
    const userId = 'me'; // mocked
    const channel = `notifications.${userId}`;

    const unsub = ws.subscribe(channel, 'notification.created', () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
    });

    return () => unsub();
  }, [queryClient]);

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const recent = notifications?.slice(0, 5) || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative p-2 rounded-full hover:bg-muted transition-colors outline-none">
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {recent.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No recent notifications
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {recent.map(n => (
              <DropdownMenuItem 
                key={n.id} 
                className={`p-3 cursor-pointer flex flex-col items-start gap-1 ${!n.isRead ? 'bg-primary/5' : ''}`}
                onClick={() => {
                  if (!n.isRead) markRead.mutate(n.id);
                  router.push('/notifications');
                }}
              >
                <div className="flex items-center gap-2 w-full">
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  <span className="font-semibold text-sm line-clamp-1">{n.title}</span>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2 pl-4">{n.message}</span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="justify-center text-primary font-medium cursor-pointer"
          onClick={() => router.push('/notifications')}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
