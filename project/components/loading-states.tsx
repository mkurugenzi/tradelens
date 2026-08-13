'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function LoadingCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <Skeleton className="h-3 w-20 mb-3" />
        <Skeleton className="h-7 w-24" />
      </CardContent>
    </Card>
  );
}

export function LoadingTable({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn('h-12 w-full')} style={{ animationDelay: `${i * 50}ms` }} />
      ))}
    </div>
  );
}

export function LoadingChart({ height = 300 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} />;
}

export function LoadingPage() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
