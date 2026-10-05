'use client';

import { useSystemHealth } from '@/features/ops';
import { getWebSocketManager } from '@/lib/websocket-manager';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { opsKeys } from '@/features/ops/types';
import { Activity, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function OpsOverviewPage() {
  const { data: health, isLoading } = useSystemHealth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = getWebSocketManager();
    const channel = 'ops.overview';
    
    const unsub = ws.subscribe(channel, 'health.updated', () => {
      queryClient.invalidateQueries({ queryKey: opsKeys.health() });
    });

    return () => unsub();
  }, [queryClient]);

  if (isLoading) return <div className="p-8">INITIATING DIAGNOSTICS...</div>;

  const isHealthy = health?.status === 'HEALTHY' || (health?.status as string) === 'ok';

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
        <Activity className="w-6 h-6" /> System Overview
      </h1>
      
      {/* Health Strip - E2E verification looks for this */}
      <div className={`p-4 border flex items-center gap-4 ${isHealthy ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400' : 'bg-rose-950/30 border-rose-900 text-rose-400'}`}>
        {isHealthy ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
        <div>
          <h2 className="font-bold text-lg">SYSTEM STATUS: {health?.status ?? 'UNKNOWN'}</h2>
          <p className="text-xs opacity-70">Last heart beat: {health?.lastUpdated ? new Date(health.lastUpdated).toLocaleTimeString() : 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
         <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
            <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Active Connections</h3>
            <p className="text-3xl font-light text-slate-200">{health?.activeConnections ? health.activeConnections.toLocaleString() : '0'}</p>
         </div>
         <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
            <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">CPU Compute</h3>
            <p className="text-3xl font-light text-slate-200">{health?.cpuUsagePercent ?? 0}%</p>
         </div>
         <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
            <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Memory Allocation</h3>
            <p className="text-3xl font-light text-slate-200">{health?.memoryUsagePercent ?? 0}%</p>
         </div>
      </div>
    </div>
  );
}
