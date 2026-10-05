'use client';

import { Clock, RefreshCw, Play } from 'lucide-react';
import { useState } from 'react';

export default function OpsSchedulerPage() {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-6 h-6 text-cyan-400" /> Scheduler &amp; Cron Jobs
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

      <p className="text-slate-500 text-xs">Background task triggers, advisory locks, and scheduled maintenance routines.</p>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Active Jobs</h3>
          <p className="text-3xl font-light text-slate-200">5 / 5</p>
          <span className="text-xs text-emerald-400">All jobs running</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Next Execution</h3>
          <p className="text-3xl font-light text-slate-200">12s</p>
          <span className="text-xs text-slate-400">hold_expiry_reaper</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Job Success Rate</h3>
          <p className="text-3xl font-light text-slate-200">100.0%</p>
          <span className="text-xs text-emerald-400">0 errors in 24h</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Advisory Lock</h3>
          <p className="text-3xl font-light text-slate-200">HELD</p>
          <span className="text-xs text-emerald-400">Leader instance</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
          Scheduled Background Tasks
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Job Identifier</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Interval / Cron</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Last Run</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-cyan-300 font-bold">hold_expiry_reaper</td>
              <td className="px-4 py-3 text-slate-300">Every 60s</td>
              <td className="px-4 py-3 text-emerald-400">48s ago</td>
              <td className="px-4 py-3 text-slate-300">42ms</td>
              <td className="px-4 py-3 text-right">
                <button className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[10px] inline-flex items-center gap-1">
                  <Play className="w-2.5 h-2.5" /> Trigger
                </button>
              </td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-cyan-300 font-bold">waiting_room_drain</td>
              <td className="px-4 py-3 text-slate-300">Every 10s</td>
              <td className="px-4 py-3 text-emerald-400">6s ago</td>
              <td className="px-4 py-3 text-slate-300">18ms</td>
              <td className="px-4 py-3 text-right">
                <button className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[10px] inline-flex items-center gap-1">
                  <Play className="w-2.5 h-2.5" /> Trigger
                </button>
              </td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-cyan-300 font-bold">resale_expired_cleanup</td>
              <td className="px-4 py-3 text-slate-300">Every 5m</td>
              <td className="px-4 py-3 text-emerald-400">2m ago</td>
              <td className="px-4 py-3 text-slate-300">85ms</td>
              <td className="px-4 py-3 text-right">
                <button className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[10px] inline-flex items-center gap-1">
                  <Play className="w-2.5 h-2.5" /> Trigger
                </button>
              </td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-cyan-300 font-bold">analytics_hourly_rollup</td>
              <td className="px-4 py-3 text-slate-300">0 * * * *</td>
              <td className="px-4 py-3 text-emerald-400">24m ago</td>
              <td className="px-4 py-3 text-slate-300">1.2s</td>
              <td className="px-4 py-3 text-right">
                <button className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[10px] inline-flex items-center gap-1">
                  <Play className="w-2.5 h-2.5" /> Trigger
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
