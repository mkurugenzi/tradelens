'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListOrdered,
  BarChart3,
  TrendingUp,
  Calendar,
  TrendingDown,
  Plug,
  Sparkles,
  Settings,
  LineChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Trades', href: '/dashboard/trades', icon: ListOrdered },
  { label: 'Markets', href: '/dashboard/markets', icon: BarChart3 },
  { label: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
  { label: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { label: 'Drawdown', href: '/dashboard/drawdown', icon: TrendingDown },
  { label: 'Connections', href: '/dashboard/connections', icon: Plug },
  { label: 'AI Analyst', href: '/dashboard/ai-analyst', icon: Sparkles },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LineChart className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold tracking-tight">TradeLens</span>
      </Link>
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const items = navItems.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card px-2 py-2 md:hidden">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
