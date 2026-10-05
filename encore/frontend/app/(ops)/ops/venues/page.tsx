'use client';

import { MapPin, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function OpsVenuesPage() {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <div className="p-8 space-y-8 flex flex-col h-full font-mono text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h1 className="text-2xl font-bold uppercase tracking-widest flex items-center gap-2">
          <MapPin className="w-6 h-6 text-orange-400" /> Venue Configurations &amp; Layouts
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

      <p className="text-slate-500 text-xs">Physical arena topologies, section/row seating structures, and spatial coordinates.</p>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Active Venues</h3>
          <p className="text-3xl font-light text-slate-200">1</p>
          <span className="text-xs text-emerald-400">PostGIS registered</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Total Seat Capacity</h3>
          <p className="text-3xl font-light text-orange-400">20,000</p>
          <span className="text-xs text-slate-400">Sphere at Encore</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Mapped Sections</h3>
          <p className="text-3xl font-light text-slate-200">24</p>
          <span className="text-xs text-slate-400">GA &amp; Tiered Seating</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 space-y-2">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest">Spatial Index</h3>
          <p className="text-3xl font-light text-emerald-400">R-TREE GIST</p>
          <span className="text-xs text-emerald-400">Sub-millisecond radius</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
          Configured Venues
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/80">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Venue Name</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Coordinates (Lat, Lon)</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">City / Region</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Capacity</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Seating Manifest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 text-orange-300 font-bold">The Grand Encore Arena</td>
              <td className="px-4 py-3 font-mono text-slate-400">37.7749° N, 122.4194° W</td>
              <td className="px-4 py-3 text-slate-300">San Francisco, CA</td>
              <td className="px-4 py-3 text-slate-300">20,000</td>
              <td className="px-4 py-3 text-right text-emerald-400">VALIDATED</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
