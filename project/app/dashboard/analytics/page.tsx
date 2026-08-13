'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/app-context';
import { PageHeader } from '@/components/page-header';
import { FilterBar } from '@/components/filter-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { SimpleBarChart } from '@/components/charts/simple-bar-chart';
import { HourlyHeatmap } from '@/components/charts/hourly-heatmap';
import { filterTrades, calculateKPIs, calculateSessionAnalytics, calculateDayOfWeekAnalytics, calculateHourlyAnalytics, formatProfitFactor } from '@/lib/analytics';
import { formatCurrency, formatPercent } from '@/lib/format';
import { TrendingUp, Plus } from 'lucide-react';

export default function AnalyticsPage() {
  const { activeAccount, activeTrades, filters, setFilters } = useApp();

  const filteredTrades = useMemo(() => filterTrades(activeTrades, filters), [activeTrades, filters]);
  const kpis = useMemo(() => calculateKPIs(filteredTrades, activeAccount?.initial_balance ?? 0, activeAccount?.current_balance ?? 0), [filteredTrades, activeAccount]);
  const sessionData = useMemo(() => calculateSessionAnalytics(filteredTrades), [filteredTrades]);
  const dayData = useMemo(() => calculateDayOfWeekAnalytics(filteredTrades), [filteredTrades]);
  const hourlyData = useMemo(() => calculateHourlyAnalytics(filteredTrades), [filteredTrades]);

  if (!activeAccount) {
    return <EmptyState title="No trading account yet" description="Create your first trading account to start analyzing your trades." actionLabel="Create Account" onAction={() => window.location.href = '/dashboard/settings'} icon={<Plus className="h-12 w-12" />} />;
  }
  if (activeTrades.length === 0) {
    return <EmptyState title="No trades imported yet" description="Import your MT4 or MT5 trade history to see analytics." actionLabel="Import Trades" onAction={() => window.location.href = '/dashboard/import'} icon={<TrendingUp className="h-12 w-12" />} />;
  }

  const dayChartData = dayData.map((d) => ({ name: d.day.slice(0, 3), netProfit: d.netProfit, trades: d.trades }));
  const bestSession = [...sessionData].sort((a, b) => b.netProfit - a.netProfit)[0];

  return (
    <div className="space-y-4">
      <PageHeader title="Analytics" description="Win/loss, sessions, days, and hours analysis" />
      <FilterBar filters={filters} setFilters={setFilters} trades={activeTrades} compact />

      {/* Win/Loss Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Winning Trades</div><div className="text-xl font-bold text-profit">{kpis.winningTrades}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Losing Trades</div><div className="text-xl font-bold text-loss">{kpis.losingTrades}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Break-even</div><div className="text-xl font-bold text-muted-foreground">{kpis.breakEvenTrades}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Expectancy</div><div className={`text-xl font-bold ${kpis.expectancy > 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(kpis.expectancy, activeAccount.currency)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Avg Win</div><div className="text-xl font-bold text-profit">{formatCurrency(kpis.averageWin, activeAccount.currency)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Avg Loss</div><div className="text-xl font-bold text-loss">{formatCurrency(kpis.averageLoss, activeAccount.currency)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Largest Win</div><div className="text-xl font-bold text-profit">{formatCurrency(kpis.largestWin, activeAccount.currency)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Largest Loss</div><div className="text-xl font-bold text-loss">{formatCurrency(kpis.largestLoss, activeAccount.currency)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Max Consec. Wins</div><div className="text-xl font-bold text-profit">{kpis.consecutiveWins}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Max Consec. Losses</div><div className="text-xl font-bold text-loss">{kpis.consecutiveLosses}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Gross Profit</div><div className="text-xl font-bold text-profit">{formatCurrency(kpis.grossProfit, activeAccount.currency)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Gross Loss</div><div className="text-xl font-bold text-loss">{formatCurrency(kpis.grossLoss, activeAccount.currency)}</div></CardContent></Card>
      </div>

      {/* Sessions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Trading Session Analysis</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Session</TableHead>
                <TableHead className="text-right">Trades</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Net Profit</TableHead>
                <TableHead className="text-right">Avg Trade</TableHead>
                <TableHead className="text-right">Profit Factor</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sessionData.map((s) => (
                  <TableRow key={s.session} className={s.session === bestSession?.session && s.trades > 0 ? 'bg-profit-soft/30' : ''}>
                    <TableCell className="font-medium">{s.session}{s.session === bestSession?.session && s.trades > 0 && <span className="ml-2 text-xs text-profit">Best</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.trades}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.trades > 0 ? `${s.winRate.toFixed(1)}%` : '—'}</TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${s.netProfit > 0 ? 'text-profit' : s.netProfit < 0 ? 'text-loss' : ''}`}>{s.trades > 0 ? formatCurrency(s.netProfit, activeAccount.currency) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.trades > 0 ? formatCurrency(s.averageTrade, activeAccount.currency) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.trades > 0 ? formatProfitFactor(s.profitFactor) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Day of Week */}
      <Card>
        <CardHeader><CardTitle className="text-base">Day of Week Analysis</CardTitle></CardHeader>
        <CardContent>
          <SimpleBarChart data={dayChartData} xKey="name" yKey="netProfit" colorBySign height={250} formatValue={(v) => formatCurrency(v, activeAccount.currency)} />
          <div className="mt-4 overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Trades</TableHead>
                <TableHead className="text-right">Wins</TableHead>
                <TableHead className="text-right">Losses</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Net Profit</TableHead>
                <TableHead className="text-right">Avg Trade</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {dayData.map((d) => (
                  <TableRow key={d.dayIndex}>
                    <TableCell className="font-medium">{d.day}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.trades}</TableCell>
                    <TableCell className="text-right tabular-nums text-profit">{d.wins}</TableCell>
                    <TableCell className="text-right tabular-nums text-loss">{d.losses}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.trades > 0 ? `${d.winRate.toFixed(1)}%` : '—'}</TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${d.netProfit > 0 ? 'text-profit' : d.netProfit < 0 ? 'text-loss' : ''}`}>{d.trades > 0 ? formatCurrency(d.netProfit, activeAccount.currency) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.trades > 0 ? formatCurrency(d.averageTrade, activeAccount.currency) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Heatmap */}
      <Card>
        <CardHeader><CardTitle className="text-base">Time of Day Analysis (UTC)</CardTitle></CardHeader>
        <CardContent>
          <HourlyHeatmap data={hourlyData} />
          <p className="mt-4 text-xs text-muted-foreground">
            Each cell shows the number of trades opened at that hour. Color intensity indicates profitability — green for profitable hours, red for losing hours.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
