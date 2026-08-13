'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { BalanceCurvePoint } from '@/lib/types';
import { ChartTooltip } from '../chart-tooltip';
import { formatCurrency } from '@/lib/format';

interface BalanceCurveChartProps {
  data: BalanceCurvePoint[];
  initialBalance: number;
  height?: number;
  showDrawdown?: boolean;
}

export function BalanceCurveChart({ data, initialBalance, height = 360, showDrawdown = true }: BalanceCurveChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--loss))" stopOpacity={0.15} />
            <stop offset="100%" stopColor="hsl(var(--loss))" stopOpacity={0} />
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
          tickFormatter={(v) => formatCurrency(v, 'USD', true)}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          width={70}
          domain={['auto', 'auto']}
        />
        <Tooltip content={<ChartTooltip />} />
        <ReferenceLine y={initialBalance} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.4} />
        {showDrawdown && (
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="none"
            fill="url(#drawdownGradient)"
            yAxisId={0}
          />
        )}
        <Area
          type="monotone"
          dataKey="balance"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          fill="url(#balanceGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
