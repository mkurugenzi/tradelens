'use client';

import type { HourlyAnalytics } from '@/lib/types';
import { formatCurrency } from '@/lib/format';

interface HourlyHeatmapProps {
  data: HourlyAnalytics[];
}

export function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  const maxAbsProfit = Math.max(...data.map((d) => Math.abs(d.netProfit)), 1);

  const getColor = (profit: number, trades: number) => {
    if (trades === 0) return 'hsl(var(--muted) / 0.3)';
    const intensity = Math.min(Math.abs(profit) / maxAbsProfit, 1);
    if (profit > 0) {
      return `hsl(142 64% 45% / ${0.15 + intensity * 0.6})`;
    } else if (profit < 0) {
      return `hsl(0 64% 50% / ${0.15 + intensity * 0.6})`;
    }
    return 'hsl(var(--muted) / 0.4)';
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[40px_repeat(24,_1fr)] gap-0.5">
        <div />
        {data.map((d) => (
          <div key={d.hour} className="text-[10px] text-muted-foreground text-center">
            {d.hour}
          </div>
        ))}
        <div className="flex items-center text-xs text-muted-foreground">UTC</div>
        {data.map((d) => {
          const bg = getColor(d.netProfit, d.trades);
          return (
            <div
              key={d.hour}
              className="aspect-square rounded-sm flex items-center justify-center text-[10px] font-medium cursor-default transition-transform hover:scale-110 hover:z-10 relative group"
              style={{ backgroundColor: bg }}
              title={`${d.hour}:00 UTC — ${d.trades} trades, ${formatCurrency(d.netProfit)}`}
            >
              {d.trades > 0 && d.trades}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(0 64% 50% / 0.5)' }} />
          Loss
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--muted) / 0.4)' }} />
          No trades
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(142 64% 45% / 0.5)' }} />
          Profit
        </div>
      </div>
    </div>
  );
}
