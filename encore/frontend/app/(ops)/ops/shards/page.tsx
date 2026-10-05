'use client';

import { Server, RefreshCw, Split } from 'lucide-react';
import { useState } from 'react';

export default function OpsShardsPage() {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <Split className="w-6 h-6 text-purple-400" /> Database Shards &amp; Partitioning
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

      <p className="text-slate-500 text-xs">Horizontal sharding ring topology (Hash-ring modulo 3) for inventory and orders.</p>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Shard 0 (Port 5433)</h3>
            <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">HEALTHY</span>
          </div>
          <p className="text-2xl font-light text-slate-200">33.2% Traffic</p>
          <p className="text-xs text-slate-400">Rows: 420,150 | Latency: 1.4ms</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Shard 1 (Port 5434)</h3>
            <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">HEALTHY</span>
          </div>
          <p className="text-2xl font-light text-slate-200">33.5% Traffic</p>
          <p className="text-xs text-slate-400">Rows: 424,890 | Latency: 1.6ms</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Shard 2 (Port 5435)</h3>
            <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">HEALTHY</span>
          </div>
          <p className="text-2xl font-light text-slate-200">33.3% Traffic</p>
          <p className="text-xs text-slate-400">Rows: 421,900 | Latency: 1.5ms</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
          Shard Hash Distribution &amp; Rebalancing
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Shard Node</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Hash Key Range</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Assigned Events</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Write IOPS</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Rebalance Drift</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-purple-300 font-bold">encore-postgres-shard-0</td>
              <td className="px-4 py-3 font-mono text-slate-400">0x00000000 - 0x55555555</td>
              <td className="px-4 py-3 text-slate-300">42 events</td>
              <td className="px-4 py-3 text-emerald-400">450 IOPS</td>
              <td className="px-4 py-3 text-right text-emerald-400">&lt; 0.1%</td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-purple-300 font-bold">encore-postgres-shard-1</td>
              <td className="px-4 py-3 font-mono text-slate-400">0x55555556 - 0xAAAAAAAA</td>
              <td className="px-4 py-3 text-slate-300">44 events</td>
              <td className="px-4 py-3 text-emerald-400">462 IOPS</td>
              <td className="px-4 py-3 text-right text-emerald-400">&lt; 0.1%</td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-purple-300 font-bold">encore-postgres-shard-2</td>
              <td className="px-4 py-3 font-mono text-slate-400">0xAAAAAAAB - 0xFFFFFFFF</td>
              <td className="px-4 py-3 text-slate-300">43 events</td>
              <td className="px-4 py-3 text-emerald-400">455 IOPS</td>
              <td className="px-4 py-3 text-right text-emerald-400">&lt; 0.1%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
