'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useApp } from '@/lib/app-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { TradingAccount, Trade } from '@/lib/types';
import { SidebarNav, BottomNav } from './sidebar-nav';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, LogOut, User as UserIcon, Settings, Plus, Eye, X, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const {
    isDemo,
    accounts,
    activeAccountId,
    setActiveAccountId,
    setViewMode,
    refreshAccounts,
  } = useApp();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    if (!user) {
      setLoading(false);
      return;
    }

    refreshAccounts().finally(() => {
      setLoading(false);
    });
  }, [user, isDemo, refreshAccounts]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const exitDemo = () => {
    setViewMode('live');
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  const initials = user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 border-r border-border bg-card flex-col md:flex">
        <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <SidebarNav />
        </div>
        <div className="border-t border-border p-3">
          {isDemo ? (
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center bg-warning/10 text-warning border-warning/30">
                DEMO MODE
              </Badge>
              <Button variant="outline" size="sm" className="w-full" onClick={exitDemo}>
                <X className="h-3.5 w-3.5 mr-1.5" />
                Exit Demo
              </Button>
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left truncate">{user.email}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="w-full">
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="md:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm md:px-6">
          <div className="flex items-center gap-3">
            {accounts.length > 0 ? (
              <Select value={activeAccountId ?? ''} onValueChange={setActiveAccountId}>
                <SelectTrigger className="w-[200px] md:w-[260px] h-9">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_name} — {acc.platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm text-muted-foreground">No accounts yet</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}
            {isDemo && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 md:hidden">
                DEMO
              </Badge>
            )}
            <Button asChild size="sm" variant="default">
              <Link href="/dashboard/import">
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Import Trades</span>
                <span className="sm:hidden">Import</span>
              </Link>
            </Button>
            {!isDemo && !user && (
              <Button asChild size="sm" variant="outline">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
