'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/app-context';
import { PageHeader } from '@/components/page-header';
import { KPICard } from '@/components/kpi-card';
import { BalanceCurveChart } from '@/components/charts/balance-curve-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, DollarSign, Target, Percent, Scale, Activity, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Trophy, AlertCircle } from 'lucide-react';
import { calculateKPIs, calculateBalanceCurve, sortTrades, filterTrades } from '@/lib/analytics';
import { formatCurrency, formatPercent, formatNumber, formatDateTime, formatDuration, getProfitClass, getDirectionBadgeClass } from '@/lib/format';

export default function DashboardPage() {
  const { activeAccount, activeTrades, filters, isDemo } = useApp();

  const filteredTrades = useMemo(
    () => filterTrades(activeTrades, filters),
    [activeTrades, filters]
  );

  const kpis = useMemo(
    () => calculateKPIs(filteredTrades, activeAccount?.initial_balance ?? 0, activeAccount?.current_balance ?? 0),
    [filteredTrades, activeAccount]
  );

  const balanceCurve = useMemo(
    () => calculateBalanceCurve(filteredTrades, activeAccount?.initial_balance ?? 0),
    [filteredTrades, activeAccount]
  );

  const recentTrades = useMemo(
    () => sortTrades(filteredTrades, 'recent').slice(0, 8),
    [filteredTrades]
  );

  if (!activeAccount) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          title="No trading account yet"
          description="Create your first trading account to start importing and analyzing your trades."
          actionLabel="Create Account"
          onAction={() => window.location.href = '/dashboard/settings'}
          icon={<Plus className="h-12 w-12" />}
        />
      </div>
    );
  }

  if (filteredTrades.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader
          title={activeAccount.account_name}
          description={`${activeAccount.broker} • ${activeAccount.platform} • ${formatCurrencyPlain(activeAccount.initial_balance, activeAccount.currency)} starting balance`}
        />
        <EmptyState
          title="No trades to analyze yet"
          description="Import your MT4 or MT5 trade history (CSV file) to start seeing your performance analytics."
          actionLabel="Import Trades"
          onAction={() => window.location.href = '/dashboard/import'}
          icon={<Activity className="h-12 w-12" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={activeAccount.account_name}
        description={`${activeAccount.broker} • ${activeAccount.platform} • ${formatCurrencyPlain(activeAccount.initial_balance, activeAccount.currency)} starting balance`}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Net Profit"
          value={formatCurrency(kpis.netProfit, activeAccount.currency)}
          tooltip="Total profit/loss across all closed trades, including commission and swap."
          trend={kpis.netProfit > 0 ? 'up' : kpis.netProfit < 0 ? 'down' : 'neutral'}
          subValue={`${formatPercent(kpis.returnPct)} return`}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard
          label="Total Trades"
          value={String(kpis.totalTrades)}
          tooltip="Total number of closed trades."
          subValue={`${kpis.winningTrades}W / ${kpis.losingTrades}L / ${kpis.breakEvenTrades}BE`}
          trend="neutral"
          icon={<Activity className="h-4 w-4" />}
        />
        <KPICard
          label="Win Rate"
          value={`${kpis.winRate.toFixed(1)}%`}
          tooltip="Percentage of trades that were profitable."
          trend="neutral"
          subValue={`${kpis.consecutiveWins} max consec. wins`}
          icon={<Target className="h-4 w-4" />}
        />
        <KPICard
          label="Profit Factor"
          value={isFinite(kpis.profitFactor) ? kpis.profitFactor.toFixed(2) : '∞'}
          tooltip="Gross profit divided by gross loss. Above 1.0 means profitable overall."
          trend={kpis.profitFactor >= 1 ? 'up' : 'down'}
          icon={<Scale className="h-4 w-4" />}
        />
        <KPICard
          label="Avg Trade"
          value={formatCurrency(kpis.averageTrade, activeAccount.currency)}
          tooltip="Average profit/loss per trade."
          trend={kpis.averageTrade > 0 ? 'up' : kpis.averageTrade < 0 ? 'down' : 'neutral'}
          icon={<Percent className="h-4 w-4" />}
        />
        <KPICard
          label="Max Drawdown"
          value={formatCurrency(kpis.maxDrawdown, activeAccount.currency)}
          tooltip="Largest drop from a peak in your balance curve."
          trend="down"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KPICard
          label="Current Balance"
          value={formatCurrencyPlain(kpis.currentBalance, activeAccount.currency)}
          tooltip="Your current account balance."
          trend="neutral"
          icon={<Wallet className="h-4 w-4" />}
        />
        <KPICard
          label="Expectancy"
          value={formatCurrency(kpis.expectancy, activeAccount.currency)}
          tooltip="Expected value per trade: (win rate × avg win) − (loss rate × avg loss)."
          trend={kpis.expectancy > 0 ? 'up' : kpis.expectancy < 0 ? 'down' : 'neutral'}
          icon={<Trophy className="h-4 w-4" />}
        />
      </div>

      {/* Balance Curve */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Balance Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <BalanceCurveChart data={balanceCurve} initialBalance={activeAccount.initial_balance} height={340} />
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Trades</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/trades">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="hidden md:table-cell">Close Time</TableHead>
                  <TableHead className="hidden lg:table-cell">Duration</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getDirectionBadgeClass(trade.trade_type)}>
                        {trade.trade_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(trade.volume)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {formatDateTime(trade.close_time)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                      {formatDuration(trade.duration_minutes)}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${getProfitClass(trade.net_profit)}`}>
                      {formatCurrency(trade.net_profit, activeAccount.currency)}
                    </TableCell>
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

function formatCurrencyPlain(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
