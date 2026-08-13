'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/app-context';
import { PageHeader } from '@/components/page-header';
import { FilterBar } from '@/components/filter-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { SimpleBarChart } from '@/components/charts/simple-bar-chart';
import { filterTrades, calculateSymbolAnalytics, formatProfitFactor } from '@/lib/analytics';
import { formatCurrency, formatNumber, formatDuration } from '@/lib/format';
import { BarChart3, Plus } from 'lucide-react';

export default function MarketsPage() {
  const { activeAccount, activeTrades, filters, setFilters } = useApp();

  const filteredTrades = useMemo(
    () => filterTrades(activeTrades, filters),
    [activeTrades, filters]
  );

  const symbolData = useMemo(
    () => calculateSymbolAnalytics(filteredTrades),
    [filteredTrades]
  );

  if (!activeAccount) {
    return <EmptyState title="No trading account yet" description="Create your first trading account to start analyzing your trades." actionLabel="Create Account" onAction={() => window.location.href = '/dashboard/settings'} icon={<Plus className="h-12 w-12" />} />;
  }

  if (activeTrades.length === 0) {
    return <EmptyState title="No trades imported yet" description="Import your MT4 or MT5 trade history to see market analysis." actionLabel="Import Trades" onAction={() => window.location.href = '/dashboard/import'} icon={<BarChart3 className="h-12 w-12" />} />;
  }

  const chartData = symbolData.map((s) => ({ name: s.symbol, netProfit: s.netProfit }));

  return (
    <div className="space-y-4">
      <PageHeader title="Markets" description="Performance breakdown by trading symbol" />
      <FilterBar filters={filters} setFilters={setFilters} trades={activeTrades} compact />

      <Card>
        <CardHeader><CardTitle className="text-base">Net Profit by Symbol</CardTitle></CardHeader>
        <CardContent>
          <SimpleBarChart data={chartData} xKey="name" yKey="netProfit" colorBySign height={300} formatValue={(v) => formatCurrency(v, activeAccount.currency)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                  <TableHead className="text-right">Avg Win</TableHead>
                  <TableHead className="text-right">Avg Loss</TableHead>
                  <TableHead className="text-right">Profit Factor</TableHead>
                  <TableHead className="text-right">Largest Win</TableHead>
                  <TableHead className="text-right">Largest Loss</TableHead>
                  <TableHead className="text-right">Avg Duration</TableHead>
                  <TableHead className="text-right">Total Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {symbolData.map((s) => (
                  <TableRow key={s.symbol}>
                    <TableCell className="font-medium">{s.symbol}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.totalTrades}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.winRate.toFixed(1)}%</TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${s.netProfit > 0 ? 'text-profit' : s.netProfit < 0 ? 'text-loss' : ''}`}>{formatCurrency(s.netProfit, activeAccount.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums text-profit">{formatCurrency(s.averageProfit, activeAccount.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums text-loss">{formatCurrency(s.averageLoss, activeAccount.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatProfitFactor(s.profitFactor)}</TableCell>
                    <TableCell className="text-right tabular-nums text-profit">{formatCurrency(s.largestWin, activeAccount.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums text-loss">{formatCurrency(s.largestLoss, activeAccount.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground text-xs">{formatDuration(s.averageDuration)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatNumber(s.totalVolume)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
