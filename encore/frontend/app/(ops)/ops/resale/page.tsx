'use client';

import { ShoppingBag, RefreshCw, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export default function OpsResalePage() {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-teal-400" /> Resale Marketplace Operations
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

      <p className="text-slate-500 text-xs">Secondary market order-book spread, matching engine health, and trade settlement throughput.</p>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Active Listings</h3>
          <p className="text-3xl font-light text-slate-200">128</p>
          <span className="text-xs text-emerald-400">Order-book healthy</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Matched Trades (24h)</h3>
          <p className="text-3xl font-light text-slate-200">42</p>
          <span className="text-xs text-slate-400">Avg match time: 1.2s</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Market Volume (24h)</h3>
          <p className="text-3xl font-light text-teal-400">$6,450.00</p>
          <span className="text-xs text-slate-400">Platform fee (5%): $322.50</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Bid/Ask Spread</h3>
          <p className="text-3xl font-light text-slate-200">4.2%</p>
          <span className="text-xs text-emerald-400">Tight liquidity</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Active Resale Order-Book &amp; Recent Settlements</span>
          <span className="text-[10px] text-teal-400">Engine: Port 8007</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Trade / Listing ID</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Event ID</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Ask Price</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Settlement Status</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Escrow Hold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 font-mono text-teal-300">lst_e31fea72</td>
              <td className="px-4 py-3 text-slate-300">Encore Launch Night</td>
              <td className="px-4 py-3 text-slate-300">$150.00</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">SETTLED</span></td>
              <td className="px-4 py-3 text-right text-emerald-400">RELEASED</td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 font-mono text-teal-300">lst_491ad182</td>
              <td className="px-4 py-3 text-slate-300">Encore Launch Night</td>
              <td className="px-4 py-3 text-slate-300">$180.00</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 text-[10px] bg-blue-950 text-blue-400 border border-blue-800 rounded">ACTIVE</span></td>
              <td className="px-4 py-3 text-right text-slate-500">PENDING_MATCH</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
