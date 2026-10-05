'use client';

import { Users, RefreshCw, KeyRound } from 'lucide-react';
import { useState } from 'react';

export default function OpsUsersPage() {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <Users className="w-6 h-6 text-sky-400" /> User Directory &amp; RBAC Control
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

      <p className="text-slate-500 text-xs">Identity administration, role-based access control, and active customer sessions.</p>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Total Accounts</h3>
          <p className="text-3xl font-light text-slate-200">14,290</p>
          <span className="text-xs text-emerald-400">Verified customers</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Active Sessions</h3>
          <p className="text-3xl font-light text-sky-400">1,480</p>
          <span className="text-xs text-slate-400">JWT active</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Admin / Ops Users</h3>
          <p className="text-3xl font-light text-slate-200">6</p>
          <span className="text-xs text-amber-400">MFA Enforced</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Locked Accounts</h3>
          <p className="text-3xl font-light text-slate-200">0</p>
          <span className="text-xs text-emerald-400">No lockouts</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
          Encore System Principals &amp; Roles
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">User ID / Email</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Created At</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-sky-300 font-bold">admin@example.com</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 text-[10px] bg-rose-950 text-rose-400 border border-rose-800 rounded">ADMIN</span></td>
              <td className="px-4 py-3 text-emerald-400">ACTIVE</td>
              <td className="px-4 py-3 text-slate-400">2026-09-01</td>
              <td className="px-4 py-3 text-right">
                <button className="px-2 py-0.5 bg-slate-800 text-sky-400 rounded text-[10px] inline-flex items-center gap-1">
                  <KeyRound className="w-2.5 h-2.5" /> Rotate Secret
                </button>
              </td>
            </tr>
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-sky-300 font-bold">demo.buyer@example.com</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 text-[10px] bg-blue-950 text-blue-400 border border-blue-800 rounded">BUYER</span></td>
              <td className="px-4 py-3 text-emerald-400">ACTIVE</td>
              <td className="px-4 py-3 text-slate-400">2026-09-01</td>
              <td className="px-4 py-3 text-right">
                <button className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                  View Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
