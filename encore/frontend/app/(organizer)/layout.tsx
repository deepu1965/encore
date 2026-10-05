import type { ReactNode } from 'react';
import Link from 'next/link';
import { ThemeApplier } from '@/components/shared/theme-applier';
import { LayoutDashboard, Calendar, DollarSign, FileText, Settings, User } from 'lucide-react';

export default function OrganizerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <ThemeApplier personaDefault="dark" />
      
      {/* B2B Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-muted/20 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="text-h4 font-bold tracking-tight">Encore<span className="text-primary ml-1">Pro</span></span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link href="/organizer" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted font-medium">
            <LayoutDashboard className="w-5 h-5 text-muted-foreground" /> Dashboard
          </Link>
          <Link href="/organizer/events" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted font-medium">
            <Calendar className="w-5 h-5 text-muted-foreground" /> Events
          </Link>
          <Link href="/organizer/revenue" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted font-medium">
            <DollarSign className="w-5 h-5 text-muted-foreground" /> Revenue
          </Link>
          <Link href="/organizer/documents" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted font-medium">
            <FileText className="w-5 h-5 text-muted-foreground" /> Documents
          </Link>
          <Link href="/organizer/settings" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted font-medium">
            <Settings className="w-5 h-5 text-muted-foreground" /> Settings
          </Link>
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
             <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
               <User className="w-4 h-4 text-primary" />
             </div>
             <div>
               <p className="text-sm font-semibold">LiveNation Inc.</p>
               <p className="text-xs text-muted-foreground">Admin</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
