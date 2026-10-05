'use client';

import { ShieldAlert, RefreshCw, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function OpsFraudPage() {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-rose-500" /> Fraud Detection &amp; Risk Engine
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

      <p className="text-slate-500 text-xs">Real-time purchase velocity heuristics, suspicious IP clustering, and bot containment.</p>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Flagged Orders</h3>
          <p className="text-3xl font-light text-rose-400">14</p>
          <span className="text-xs text-slate-400">Under review</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Blocked Bots (24h)</h3>
          <p className="text-3xl font-light text-slate-200">1,249</p>
          <span className="text-xs text-emerald-400">Rate limit &amp; IP block</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Avg Risk Score</h3>
          <p className="text-3xl font-light text-slate-200">12.4 / 100</p>
          <span className="text-xs text-emerald-400">Low system risk</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Card Testing Rate</h3>
          <p className="text-3xl font-light text-slate-200">0.02%</p>
          <span className="text-xs text-emerald-400">Well below threshold</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Flagged Transactions &amp; Velocity Violations</span>
          <span className="text-[10px] text-rose-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Auto-quarantine active
          </span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Account / IP</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Risk Score</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Violation Reason</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Attempted Amount</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 font-mono text-rose-300">usr_8923a1 (192.241.22.4)</td>
              <td className="px-4 py-3 font-bold text-rose-400">89 / 100</td>
              <td className="px-4 py-3 text-slate-300">Rapid checkout attempt across 4 separate cards</td>
              <td className="px-4 py-3 text-slate-300">$450.00</td>
              <td className="px-4 py-3 text-right">
                <button className="px-2 py-0.5 bg-rose-950 border border-rose-800 text-rose-300 rounded text-[10px]">
                  Lock Account
                </button>
              </td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 font-mono text-rose-300">usr_3310b8 (104.28.19.12)</td>
              <td className="px-4 py-3 font-bold text-amber-400">62 / 100</td>
              <td className="px-4 py-3 text-slate-300">Tor exit-node checkout detected</td>
              <td className="px-4 py-3 text-slate-300">$120.00</td>
              <td className="px-4 py-3 text-right">
                <button className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                  Review 3DS
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
