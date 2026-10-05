'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';

import { env } from '@/lib/env';
import { createQueryClient } from '@/lib/query-client';
import { getWebSocketManager } from '@/lib/websocket-manager';

/**
 * Client-side provider tree mounted once in the root layout: TanStack Query
 * and the per-tab WebSocketManager. Theme mode is applied by each route
 * group's layout (persona defaults) reading the ui store, so it isn't wired
 * here.
 */
export function Providers({ children }: { children: ReactNode }) {
  // One QueryClient per browser tab, stable across renders.
  const queryClientRef = useRef(createQueryClient());

  useEffect(() => {
    const ws = getWebSocketManager();
    ws.connect(env.NEXT_PUBLIC_WS_BASE_URL);
    return () => ws.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClientRef.current}>{children}</QueryClientProvider>
  );
}
