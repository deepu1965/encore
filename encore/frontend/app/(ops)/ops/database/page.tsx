'use client';

import { Database, Activity, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function OpsDatabasePage() {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <Database className="w-6 h-6 text-emerald-400" /> Database Telemetry
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

      <p className="text-slate-500 text-xs">Primary PostgreSQL (pgbouncer:5432) connection pool and query execution latency.</p>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Active Pool Conns</h3>
          <p className="text-3xl font-light text-slate-200">24 / 100</p>
          <span className="text-xs text-emerald-400">Pool healthy (PgBouncer)</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">TPS (Trans/Sec)</h3>
          <p className="text-3xl font-light text-slate-200">1,420</p>
          <span className="text-xs text-slate-400">Peak: 3,850 TPS</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Avg Query Latency</h3>
          <p className="text-3xl font-light text-slate-200">1.8 ms</p>
          <span className="text-xs text-emerald-400">p99: 4.2 ms</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Cache Hit Ratio</h3>
          <p className="text-3xl font-light text-slate-200">99.4%</p>
          <span className="text-xs text-emerald-400">Shared buffers</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Active & Slow Query Telemetry</span>
          <span className="text-[10px] text-emerald-400">SLO: &lt; 20ms</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Query Pattern</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Calls/Min</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Avg Latency</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Max Latency</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Lock Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-slate-300 font-mono">SELECT * FROM inventory WHERE event_id = $1 FOR UPDATE</td>
              <td className="px-4 py-3 text-slate-300">8,450</td>
              <td className="px-4 py-3 text-emerald-400">1.2 ms</td>
              <td className="px-4 py-3 text-slate-300">4.1 ms</td>
              <td className="px-4 py-3 text-right text-emerald-400">0.1 ms</td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-slate-300 font-mono">SELECT balance_cents FROM wallets WHERE user_id = $1 FOR UPDATE</td>
              <td className="px-4 py-3 text-slate-300">3,120</td>
              <td className="px-4 py-3 text-emerald-400">0.9 ms</td>
              <td className="px-4 py-3 text-slate-300">3.8 ms</td>
              <td className="px-4 py-3 text-right text-emerald-400">0.05 ms</td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-slate-300 font-mono">INSERT INTO orders (id, user_id, total_cents) VALUES (...)</td>
              <td className="px-4 py-3 text-slate-300">1,940</td>
              <td className="px-4 py-3 text-emerald-400">2.1 ms</td>
              <td className="px-4 py-3 text-slate-300">6.4 ms</td>
              <td className="px-4 py-3 text-right text-slate-400">0.2 ms</td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-slate-300 font-mono">SELECT * FROM resale_listings WHERE status = &apos;ACTIVE&apos;</td>
              <td className="px-4 py-3 text-slate-300">920</td>
              <td className="px-4 py-3 text-emerald-400">1.5 ms</td>
              <td className="px-4 py-3 text-slate-300">5.0 ms</td>
              <td className="px-4 py-3 text-right text-slate-400">0.0 ms</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
