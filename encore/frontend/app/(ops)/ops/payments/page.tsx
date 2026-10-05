'use client';

import { CreditCard, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function OpsPaymentsPage() {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-indigo-400" /> Payment Gateway Operations
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

      <p className="text-slate-500 text-xs">Payment processor health (encore-payment-service:8002), auth success rates, and latency percentiles.</p>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Auth Success Rate</h3>
          <p className="text-3xl font-light text-slate-200">99.2%</p>
          <span className="text-xs text-emerald-400">SLO: &gt; 98.0%</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Gateway Latency</h3>
          <p className="text-3xl font-light text-slate-200">320 ms</p>
          <span className="text-xs text-slate-400">p99: 850 ms</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Total Volume (24h)</h3>
          <p className="text-3xl font-light text-indigo-400">$184,250</p>
          <span className="text-xs text-slate-400">1,940 orders</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Dispute Rate</h3>
          <p className="text-3xl font-light text-slate-200">0.01%</p>
          <span className="text-xs text-emerald-400">1 dispute filed</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Processor Status &amp; Circuit Breakers</span>
          <span className="text-[10px] text-emerald-400">All Gateways Closed (Normal)</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Gateway Provider</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Circuit State</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Success Rate</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Avg Response</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Traffic Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-indigo-300 font-bold">Stripe / Mock Provider</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">CLOSED</span></td>
              <td className="px-4 py-3 text-emerald-400">99.4%</td>
              <td className="px-4 py-3 text-slate-300">310 ms</td>
              <td className="px-4 py-3 text-right text-slate-300">100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
