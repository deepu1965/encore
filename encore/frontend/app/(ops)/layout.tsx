import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  Zap,
  Database,
  Server,
  ShieldAlert,
  Cpu,
  Split,
  Clock,
  Users,
  CreditCard,
  ShoppingBag,
  Wallet,
  MapPin,
  Calendar,
  FileText,
  Flag,
} from 'lucide-react';
import { ThemeApplier } from '@/components/shared/theme-applier';

export default function OpsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-mono text-sm selection:bg-rose-500/30">
      <ThemeApplier personaDefault="dark" />

      {/* System Sidebar Navigation */}
      <aside className="w-60 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="h-12 flex items-center px-4 border-b border-rose-500/50 bg-rose-500/10 text-rose-400">
          <span className="font-bold tracking-widest uppercase text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Ops Control
          </span>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          <div className="px-4 text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-widest">Global</div>
          <Link href="/ops" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <Activity className="w-4 h-4" /> Overview
          </Link>
          <Link href="/ops/flash-sale" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400 text-rose-300">
            <Zap className="w-4 h-4" /> Flash-Sale
          </Link>
          <Link href="/ops/feature-flags" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <Flag className="w-4 h-4" /> Feature Flags
          </Link>
          <Link href="/ops/audit-log" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <FileText className="w-4 h-4" /> Audit Log
          </Link>

          <div className="px-4 text-[10px] uppercase text-slate-500 font-bold mt-4 mb-2 tracking-widest">Infrastructure</div>
          <Link href="/ops/kafka" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <Server className="w-4 h-4" /> Kafka
          </Link>
          <Link href="/ops/redis" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <Cpu className="w-4 h-4" /> Redis
          </Link>
          <Link href="/ops/database" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <Database className="w-4 h-4" /> Database
          </Link>
          <Link href="/ops/shards" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <Split className="w-4 h-4" /> Shards
          </Link>
          <Link href="/ops/scheduler" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <Clock className="w-4 h-4" /> Scheduler
          </Link>

          <div className="px-4 text-[10px] uppercase text-slate-500 font-bold mt-4 mb-2 tracking-widest">Transactions &amp; Risk</div>
          <Link href="/ops/waiting-room" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <Users className="w-4 h-4" /> Waiting Room
          </Link>
          <Link href="/ops/fraud" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <ShieldAlert className="w-4 h-4" /> Fraud Engine
          </Link>
          <Link href="/ops/payments" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <CreditCard className="w-4 h-4" /> Payments
          </Link>
          <Link href="/ops/resale" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <ShoppingBag className="w-4 h-4" /> Resale Engine
          </Link>
          <Link href="/ops/wallets" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <Wallet className="w-4 h-4" /> Wallets Ledger
          </Link>

          <div className="px-4 text-[10px] uppercase text-slate-500 font-bold mt-4 mb-2 tracking-widest">Administration</div>
          <Link href="/ops/users" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <Users className="w-4 h-4" /> Users
          </Link>
          <Link href="/ops/events" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <Calendar className="w-4 h-4" /> Events
          </Link>
          <Link href="/ops/venues" className="flex items-center gap-3 px-4 py-1.5 hover:bg-slate-800 hover:text-rose-400">
            <MapPin className="w-4 h-4" /> Venues
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
