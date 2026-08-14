'use client';

import { formatCurrency, formatDateTime } from '@/lib/format';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  formatter?: (value: number, name: string) => string;
}

export function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg text-xs">
      {label && <div className="text-muted-foreground mb-1.5">{formatDateTime(label)}</div>}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 capitalize">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-semibold tabular-nums">
              {formatter ? formatter(entry.value, entry.name) : formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
