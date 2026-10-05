'use client';

import { FileText, RefreshCw, Filter } from 'lucide-react';
import { useState } from 'react';

export default function OpsAuditLogPage() {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <FileText className="w-6 h-6 text-yellow-400" /> Compliance &amp; Security Audit Log
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

      <p className="text-slate-500 text-xs">Append-only immutable record of all administrative overrides, flag changes, and settlement events.</p>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Security Audit Trail</span>
          <span className="text-[10px] text-slate-400">Retention: 365 Days</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Timestamp</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Principal</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Action Type</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Target Resource</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">IP / Trace ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-slate-400">2026-09-29 08:26:10</td>
              <td className="px-4 py-3 text-yellow-300 font-bold">system:wallet-service</td>
              <td className="px-4 py-3 text-emerald-400">LEDGER_CREDIT</td>
              <td className="px-4 py-3 font-mono text-slate-300">usr_11111111 (10000 cents)</td>
              <td className="px-4 py-3 text-right font-mono text-slate-500">req_1e8e9702</td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-slate-400">2026-09-29 08:22:02</td>
              <td className="px-4 py-3 text-yellow-300 font-bold">system:resale-engine</td>
              <td className="px-4 py-3 text-cyan-400">ENGINE_STARTUP</td>
              <td className="px-4 py-3 font-mono text-slate-300">group:resale-matching-group</td>
              <td className="px-4 py-3 text-right font-mono text-slate-500">internal:kafka</td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-slate-400">2026-09-29 08:00:00</td>
              <td className="px-4 py-3 text-yellow-300 font-bold">admin@example.com</td>
              <td className="px-4 py-3 text-amber-400">FLASH_SALE_CONFIG</td>
              <td className="px-4 py-3 font-mono text-slate-300">event:e31fea72</td>
              <td className="px-4 py-3 text-right font-mono text-slate-500">req_0049ac12</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
