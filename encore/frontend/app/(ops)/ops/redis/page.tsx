'use client';

import { Cpu, RefreshCw, Zap } from 'lucide-react';
import { useState } from 'react';

export default function OpsRedisPage() {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <Cpu className="w-6 h-6 text-red-400" /> Redis Cluster Telemetry
        </h1>
        <button
          onClick={() => {
            setRefreshing(true);
            setTimeout(() => setRefreshing(false), 500);
          }}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <p className="text-slate-500 text-xs">Primary Redis instance (redis:6379) and Replica (redis-replica:6379) memory and eviction telemetry.</p>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Memory Used</h3>
          <p className="text-3xl font-light text-slate-200">142.6 MB</p>
          <span className="text-xs text-emerald-400">Limit: 2.0 GB (7.1%)</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Connected Clients</h3>
          <p className="text-3xl font-light text-slate-200">48</p>
          <span className="text-xs text-slate-400">Blocked clients: 0</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Ops / Sec</h3>
          <p className="text-3xl font-light text-slate-200">12,850</p>
          <span className="text-xs text-emerald-400">Hit rate: 98.9%</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Evicted Keys</h3>
          <p className="text-3xl font-light text-slate-200">0</p>
          <span className="text-xs text-emerald-400">Policy: volatile-lru</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
          Redis Key Spaces &amp; Active TTLs
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Namespace / Pattern</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Key Count</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Default TTL</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Memory Footprint</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Commands / Sec</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-red-300 font-mono">hold:* (Seat hold locks)</td>
              <td className="px-4 py-3 text-slate-300">1,240</td>
              <td className="px-4 py-3 text-amber-400">300s (5m)</td>
              <td className="px-4 py-3 text-slate-300">1.8 MB</td>
              <td className="px-4 py-3 text-right text-emerald-400">4,120/s</td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-red-300 font-mono">rl:* (Token bucket rate limits)</td>
              <td className="px-4 py-3 text-slate-300">8,920</td>
              <td className="px-4 py-3 text-amber-400">60s</td>
              <td className="px-4 py-3 text-slate-300">14.2 MB</td>
              <td className="px-4 py-3 text-right text-emerald-400">6,500/s</td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-red-300 font-mono">queue:* (Waiting room tokens)</td>
              <td className="px-4 py-3 text-slate-300">4,500</td>
              <td className="px-4 py-3 text-amber-400">180s</td>
              <td className="px-4 py-3 text-slate-300">8.4 MB</td>
              <td className="px-4 py-3 text-right text-emerald-400">1,940/s</td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-red-300 font-mono">cache:events:* (Event details)</td>
              <td className="px-4 py-3 text-slate-300">150</td>
              <td className="px-4 py-3 text-amber-400">600s</td>
              <td className="px-4 py-3 text-slate-300">2.1 MB</td>
              <td className="px-4 py-3 text-right text-slate-400">290/s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
