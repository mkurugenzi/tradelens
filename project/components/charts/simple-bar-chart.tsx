'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface SimpleBarChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  height?: number;
  colorBySign?: boolean;
  formatValue?: (v: number) => string;
  horizontal?: boolean;
}

export function SimpleBarChart({
  data,
  xKey,
  yKey,
  height = 320,
  colorBySign = false,
  formatValue,
  horizontal = false,
}: SimpleBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No data to display
      </div>
    );
  }

  const tooltipFormatter = formatValue
    ? (v: number) => formatValue(v)
    : (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 2 });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" tickFormatter={tooltipFormatter} />
            <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" width={120} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" width={70} tickFormatter={tooltipFormatter} />
          </>
        )}
        <Tooltip
          cursor={{ fill: 'hsl(var(--accent))', fillOpacity: 0.3 }}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(v: number) => [tooltipFormatter(v), yKey]}
        />
        <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                colorBySign
                  ? Number(entry[yKey]) >= 0
                    ? 'hsl(var(--profit))'
                    : 'hsl(var(--loss))'
                  : 'hsl(var(--chart-1))'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
