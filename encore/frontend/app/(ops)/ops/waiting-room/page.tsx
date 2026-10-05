'use client';

import { Users, RefreshCw, Sliders } from 'lucide-react';
import { useState } from 'react';

export default function OpsWaitingRoomPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [rateLimit, setRateLimit] = useState(250);

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <Users className="w-6 h-6 text-amber-400" /> Waiting Room &amp; Queue Control
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

      <p className="text-slate-500 text-xs">Waiting room admission engine (encore-waiting-room:8001), queue depths, and token admission rates.</p>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Active Queue Depth</h3>
          <p className="text-3xl font-light text-amber-400">1,842</p>
          <span className="text-xs text-slate-400">Encore Launch Night</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Admission Rate</h3>
          <p className="text-3xl font-light text-slate-200">{rateLimit} / min</p>
          <span className="text-xs text-emerald-400">Dynamic throttle</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Est. Wait Time</h3>
          <p className="text-3xl font-light text-slate-200">7.4 min</p>
          <span className="text-xs text-slate-400">FIFO token queue</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Token Dropout</h3>
          <p className="text-3xl font-light text-slate-200">4.1%</p>
          <span className="text-xs text-slate-400">Abandoned sessions</span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 space-y-4">
        <h3 className="text-xs uppercase font-bold tracking-widest text-slate-400 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" /> Dynamic Admission Rate Override
        </h3>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="50"
            max="2000"
            step="50"
            value={rateLimit}
            onChange={(e) => setRateLimit(Number(e.target.value))}
            className="flex-1 accent-amber-500"
          />
          <span className="px-3 py-1 bg-slate-950 border border-slate-800 text-amber-400 text-xs font-bold rounded">
            {rateLimit} users/min
          </span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
          Events with Active Waiting Room Policies
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Event Name</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Queue Status</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">In Queue</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Admitted Today</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Protection Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-amber-300 font-bold">Encore Launch Night</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 text-[10px] bg-amber-950 text-amber-400 border border-amber-800 rounded">ACTIVE</span></td>
              <td className="px-4 py-3 text-slate-300">1,842</td>
              <td className="px-4 py-3 text-emerald-400">14,250</td>
              <td className="px-4 py-3 text-right text-rose-400 font-bold">HIGH (CAPTCHA + Cryptographic Token)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
