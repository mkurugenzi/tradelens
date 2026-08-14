'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BalanceCurvePoint } from '@/lib/types';
import { ChartTooltip } from '../chart-tooltip';
import { formatCurrency } from '@/lib/format';

interface DrawdownChartProps {
  data: BalanceCurvePoint[];
  height?: number;
}

export function DrawdownChart({ data, height = 320 }: DrawdownChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No drawdown data to display
      </div>
    );
  }

  const drawdownData = data.map((p) => ({
    date: p.date,
    drawdown: p.drawdown,
    drawdownPct: p.drawdownPct,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={drawdownData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--loss))" stopOpacity={0.4} />
            <stop offset="100%" stopColor="hsl(var(--loss))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          minTickGap={40}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(Math.abs(v), 'USD', true)}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          width={70}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatter={(v) => `-${formatCurrency(Math.abs(v), 'USD')}`}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="drawdown"
          name="Drawdown"
          stroke="hsl(var(--loss))"
          strokeWidth={1.5}
          fill="url(#ddGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
