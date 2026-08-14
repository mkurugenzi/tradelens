'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/app-context';
import { AppShell } from '@/components/app-shell';
import { LoadingPage } from '@/components/loading-states';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isDemo } = useApp();

  useEffect(() => {
    if (!authLoading && !user && !isDemo) {
      router.replace('/login');
    }
  }, [authLoading, user, isDemo, router]);

  if (authLoading && !isDemo) {
    return <LoadingPage />;
  }

  if (!user && !isDemo) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
