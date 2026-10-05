'use client';

import { Calendar, RefreshCw, Zap } from 'lucide-react';
import { useState } from 'react';

export default function OpsEventsPage() {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-6 h-6 text-pink-400" /> Event Lifecycle &amp; Overrides
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

      <p className="text-slate-500 text-xs">Event scheduling states, flash-sale flag controls, and inventory allocation.</p>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Total Events</h3>
          <p className="text-3xl font-light text-slate-200">1</p>
          <span className="text-xs text-slate-400">Scheduled / On Sale</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Active Flash Sales</h3>
          <p className="text-3xl font-light text-pink-400">1</p>
          <span className="text-xs text-pink-400 font-bold">HIGH DEMAND</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Total Tickets Issued</h3>
          <p className="text-3xl font-light text-slate-200">18,520</p>
          <span className="text-xs text-emerald-400">92.6% sold out</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Resale Allowed</h3>
          <p className="text-3xl font-light text-slate-200">ENABLED</p>
          <span className="text-xs text-emerald-400">Cap: 110% face value</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
          Live Platform Events
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Event Name / ID</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Starts At</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Flash Sale Mode</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3">
                <span className="text-pink-300 font-bold block">Encore Launch Night</span>
                <span className="font-mono text-[10px] text-slate-500">e31fea72-d88a-407b-9e36-19515a01e71e</span>
              </td>
              <td className="px-4 py-3 text-slate-300">2026-10-15 20:00 UTC</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">ON_SALE</span></td>
              <td className="px-4 py-3 text-rose-400 font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> ENABLED
              </td>
              <td className="px-4 py-3 text-right">
                <button className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]">
                  Edit Flags
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
