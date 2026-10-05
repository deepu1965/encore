'use client';

import { Flag, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';

export default function OpsFeatureFlagsPage() {
  const [flags, setFlags] = useState([
    { id: 'flag_flash_sale_queue', name: 'Flash Sale Waiting Room Enforcement', enabled: true, description: 'Requires cryptographic queue token on POST /holds for flash-sale events' },
    { id: 'flag_resale_marketplace', name: 'Secondary Resale Marketplace', enabled: true, description: 'Enables C2C resale listing and order matching engine' },
    { id: 'flag_dynamic_pricing', name: 'Dynamic Surge Pricing', enabled: false, description: 'Surge pricing algorithm based on search velocity' },
    { id: 'flag_fraud_auto_quarantine', name: 'Automated Fraud Quarantine', enabled: true, description: 'Auto-blocks accounts exceeding velocity threshold' },
    { id: 'flag_sse_realtime_fallback', name: 'SSE Realtime Fallback', enabled: true, description: 'Allows clients to fallback to SSE when WebSockets fail' },
  ]);

  const toggleFlag = (id: string) => {
    setFlags(flags.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <Flag className="w-6 h-6 text-emerald-400" /> Runtime Feature Flags
        </h1>
        <button
          onClick={() => {}}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <p className="text-slate-500 text-xs">Hot-reloadable feature toggles distributed across Redis and Gateway memory.</p>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
          Configured Flags
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Feature Key</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {flags.map(f => (
              <tr key={f.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-emerald-300 font-bold font-mono">{f.name}</td>
                <td className="px-4 py-3 text-slate-400">{f.description}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-[10px] rounded border ${f.enabled ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {f.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleFlag(f.id)}
                    className="p-1 hover:text-emerald-400 transition-colors"
                  >
                    {f.enabled ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400 inline" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-500 inline" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
