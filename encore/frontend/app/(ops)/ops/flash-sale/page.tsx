'use client';

import { getWebSocketManager } from '@/lib/websocket-manager';
import { useEffect, useState, useRef } from 'react';
import { Zap } from 'lucide-react';

export default function OpsFlashSalePage() {
  const [metrics, setMetrics] = useState({
    requestsPerSec: 0,
    queueSize: 0,
    admissionRate: 0,
    available: 0,
    held: 0,
    sold: 0,
    paymentThroughput: 0,
    paymentFailureRate: 0,
    kafkaLag: 0,
    cacheHitRate: 0,
    dbLatencyP99: 0,
    apiLatencyP99: 0,
    apiErrorRate: 0,
    activeUsers: 0
  });

  const requestRef = useRef<number>();

  useEffect(() => {
    const ws = getWebSocketManager();
    // Using a mocked eventId for global flash sale monitoring
    const channel = 'ops.flash-sale.global';

    // Buffer to max 1 update per 250ms (requestAnimationFrame aligned roughly)
    let pendingUpdate: any = null;
    let lastUpdate = Date.now();

    const handleUpdate = (env: any) => {
      pendingUpdate = { ...metrics, ...env.data };
      const now = Date.now();
      
      if (now - lastUpdate > 250) {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(() => {
          if (pendingUpdate) {
             setMetrics(prev => ({ ...prev, ...pendingUpdate }));
             lastUpdate = Date.now();
             pendingUpdate = null;
          }
        });
      }
    };

    // Subscribing to all 9 required events on the same channel
    const unsubs = [
      ws.subscribe(channel, 'traffic', handleUpdate),
      ws.subscribe(channel, 'waiting_room', handleUpdate),
      ws.subscribe(channel, 'inventory', handleUpdate),
      ws.subscribe(channel, 'payments', handleUpdate),
      ws.subscribe(channel, 'kafka_lag', handleUpdate),
      ws.subscribe(channel, 'redis', handleUpdate),
      ws.subscribe(channel, 'db_latency', handleUpdate),
      ws.subscribe(channel, 'api_latency', handleUpdate),
      ws.subscribe(channel, 'active_users', handleUpdate),
    ];

    return () => {
      unsubs.forEach(u => u());
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const Panel = ({ title, value, unit, alert }: { title: string, value: string | number, unit?: string, alert?: boolean }) => (
    <div className={`p-4 border ${alert ? 'border-rose-500 bg-rose-500/10' : 'border-slate-800 bg-slate-900'} flex flex-col justify-between h-32`}>
      <h3 className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{title}</h3>
      <div className="flex items-baseline gap-2">
         <span className={`text-4xl font-light ${alert ? 'text-rose-400' : 'text-slate-200'}`}>{value}</span>
         {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 h-full flex flex-col">
      <h1 className="text-2xl font-bold uppercase tracking-widest border-b border-rose-500/50 pb-2 flex items-center gap-2 text-rose-400">
        <Zap className="w-6 h-6" /> Flash-Sale Control Center
      </h1>

      <div className="grid grid-cols-3 grid-rows-3 gap-4 flex-1">
         {/* 9 Real-time panels */}
         <Panel title="API Traffic" value={metrics.requestsPerSec.toLocaleString()} unit="req/s" />
         <Panel title="Waiting Room" value={metrics.queueSize.toLocaleString()} unit="users" alert={metrics.queueSize > 50000} />
         <Panel title="Inventory (Live)" value={`${metrics.available} / ${metrics.sold}`} unit="avail/sold" />
         
         <Panel title="Payment Throughput" value={metrics.paymentThroughput} unit="txn/s" />
         <Panel title="Kafka Consumer Lag" value={metrics.kafkaLag.toLocaleString()} unit="msgs" alert={metrics.kafkaLag > 1000} />
         <Panel title="Redis Hit Rate" value={metrics.cacheHitRate} unit="%" />
         
         <Panel title="DB Latency (p99)" value={metrics.dbLatencyP99} unit="ms" alert={metrics.dbLatencyP99 > 100} />
         <Panel title="API Latency (p99)" value={metrics.apiLatencyP99} unit="ms" alert={metrics.apiLatencyP99 > 200} />
         <Panel title="Active Connections" value={metrics.activeUsers.toLocaleString()} unit="users" />
      </div>
    </div>
  );
}
