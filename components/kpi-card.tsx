'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  tooltip?: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export function KPICard({ label, value, tooltip, subValue, trend, icon, className }: KPICardProps) {
  const trendColor =
    trend === 'up' ? 'text-profit' : trend === 'down' ? 'text-loss' : 'text-muted-foreground';

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          <div className="flex items-center gap-1">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <div className={cn('text-2xl font-bold tabular-nums', trendColor)}>{value}</div>
        {subValue && (
          <div className={cn('text-xs mt-1 tabular-nums', trendColor)}>{subValue}</div>
        )}
      </CardContent>
    </Card>
  );
}
