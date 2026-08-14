'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/app-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { DrawdownChart } from '@/components/charts/drawdown-chart';
import { filterTrades, calculateDrawdownAnalytics, calculateBalanceCurve } from '@/lib/analytics';
import { formatCurrency, formatPercent, formatDate } from '@/lib/format';
import { TrendingDown, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DrawdownPage() {
  const { activeAccount, activeTrades, filters } = useApp();
  const [showCurve, setShowCurve] = useState(false);

  const filteredTrades = useMemo(() => filterTrades(activeTrades, filters), [activeTrades, filters]);
  const drawdown = useMemo(() => calculateDrawdownAnalytics(filteredTrades, activeAccount?.initial_balance ?? 0), [filteredTrades, activeAccount]);
  const curve = useMemo(() => calculateBalanceCurve(filteredTrades, activeAccount?.initial_balance ?? 0), [filteredTrades, activeAccount]);

  if (!activeAccount) {
    return <EmptyState title="No trading account yet" description="Create your first trading account to start analyzing your trades." actionLabel="Create Account" onAction={() => window.location.href = '/dashboard/settings'} icon={<Plus className="h-12 w-12" />} />;
  }
  if (activeTrades.length === 0) {
    return <EmptyState title="No trades imported yet" description="Import your MT4 or MT5 trade history to see drawdown analysis." actionLabel="Import Trades" onAction={() => window.location.href = '/dashboard/import'} icon={<TrendingDown className="h-12 w-12" />} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Drawdown Analysis" description="Peak-to-trough decline and recovery metrics" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Max Drawdown</div><div className="text-xl font-bold text-loss">{formatCurrency(drawdown.maxDrawdown, activeAccount.currency)}</div><div className="text-xs text-muted-foreground mt-0.5">{formatPercent(drawdown.maxDrawdownPct)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Current Drawdown</div><div className="text-xl font-bold text-loss">{formatCurrency(drawdown.currentDrawdown, activeAccount.currency)}</div><div className="text-xs text-muted-foreground mt-0.5">{formatPercent(drawdown.currentDrawdownPct)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Average Drawdown</div><div className="text-xl font-bold">{formatCurrency(drawdown.averageDrawdown, activeAccount.currency)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Peak Balance</div><div className="text-xl font-bold text-profit">{formatCurrency(drawdown.peakBalance, activeAccount.currency)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Trough Balance</div><div className="text-xl font-bold text-loss">{formatCurrency(drawdown.troughBalance, activeAccount.currency)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase mb-1">Recovery Time</div><div className="text-xl font-bold">{drawdown.recoveryTimeDays > 0 ? `${drawdown.recoveryTimeDays}d` : '—'}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{showCurve ? 'Balance Curve' : 'Drawdown Chart'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowCurve(!showCurve)}>
            {showCurve ? 'Show Drawdown' : 'Show Balance'}
          </Button>
        </CardHeader>
        <CardContent>
          {showCurve ? (
            <DrawdownChart data={curve} height={340} />
          ) : (
            <DrawdownChart data={curve} height={340} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            Drawdown is measured from your balance curve (closed trades only), not floating/unrealized P/L.
            The maximum drawdown represents the largest drop from a peak balance to a subsequent trough.
            Recovery time is the number of days from the trough back to (or exceeding) the previous peak.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
