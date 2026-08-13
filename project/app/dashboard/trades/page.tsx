'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/app-context';
import { PageHeader } from '@/components/page-header';
import { FilterBar } from '@/components/filter-bar';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { filterTrades, sortTrades } from '@/lib/analytics';
import {
  formatCurrency,
  formatNumber,
  formatDateTime,
  formatDuration,
  formatPercent,
  getProfitClass,
  getDirectionBadgeClass,
  getRiskReward,
  formatRiskReward,
  getTradingSession,
} from '@/lib/format';
import type { Trade, SortKey } from '@/lib/types';
import { Plus, Activity, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 25;

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'profit-desc', label: 'Most Profitable' },
  { value: 'profit-asc', label: 'Least Profitable' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'largest-loss', label: 'Largest Loss' },
  { value: 'largest-lot', label: 'Largest Lot' },
  { value: 'longest-duration', label: 'Longest Duration' },
  { value: 'shortest-duration', label: 'Shortest Duration' },
];

export default function TradesPage() {
  const { activeAccount, activeTrades, filters, setFilters } = useApp();
  const [sortKey, setSortKey] = useState<SortKey>('profit-desc');
  const [page, setPage] = useState(0);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const filteredTrades = useMemo(
    () => filterTrades(activeTrades, filters),
    [activeTrades, filters]
  );

  const sortedTrades = useMemo(
    () => sortTrades(filteredTrades, sortKey),
    [filteredTrades, sortKey]
  );

  const totalPages = Math.ceil(sortedTrades.length / PAGE_SIZE);
  const pageTrades = sortedTrades.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!activeAccount) {
    return (
      <EmptyState
        title="No trading account yet"
        description="Create your first trading account to start importing and analyzing your trades."
        actionLabel="Create Account"
        onAction={() => window.location.href = '/dashboard/settings'}
        icon={<Plus className="h-12 w-12" />}
      />
    );
  }

  if (activeTrades.length === 0) {
    return (
      <EmptyState
        title="No trades imported yet"
        description="Import your MT4 or MT5 trade history (CSV file) to start analyzing your trades."
        actionLabel="Import Trades"
        onAction={() => window.location.href = '/dashboard/import'}
        icon={<Activity className="h-12 w-12" />}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trade History"
        description={`${sortedTrades.length} trades`}
        action={
          <Button asChild size="sm">
            <Link href="/dashboard/import"><Plus className="h-4 w-4 mr-1" />Import</Link>
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <FilterBar filters={filters} setFilters={setFilters} trades={activeTrades} compact />
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-8 w-full md:w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sortedTrades.length === 0 ? (
        <EmptyState
          title="No trades match your filters"
          description="Try adjusting or clearing your filters to see more trades."
          icon={<Activity className="h-12 w-12" />}
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead className="text-right">Lot</TableHead>
                      <TableHead>Open Time</TableHead>
                      <TableHead>Close Time</TableHead>
                      <TableHead className="text-right">Entry</TableHead>
                      <TableHead className="text-right">Exit</TableHead>
                      <TableHead className="text-right">SL</TableHead>
                      <TableHead className="text-right">TP</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Comm.</TableHead>
                      <TableHead className="text-right">Swap</TableHead>
                      <TableHead className="text-right">Net Profit</TableHead>
                      <TableHead className="text-right">Return %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageTrades.map((trade, i) => (
                      <TableRow
                        key={trade.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => setSelectedTrade(trade)}
                      >
                        <TableCell className="text-muted-foreground text-xs">{page * PAGE_SIZE + i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{trade.ticket}</TableCell>
                        <TableCell className="font-medium">{trade.symbol}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getDirectionBadgeClass(trade.trade_type)}>
                            {trade.trade_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(trade.volume)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDateTime(trade.open_time)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDateTime(trade.close_time)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{formatNumber(trade.open_price, trade.symbol.includes('JPY') ? 3 : 5)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{formatNumber(trade.close_price, trade.symbol.includes('JPY') ? 3 : 5)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{trade.stop_loss ? formatNumber(trade.stop_loss, 2) : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{trade.take_profit ? formatNumber(trade.take_profit, 2) : '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDuration(trade.duration_minutes)}</TableCell>
                        <TableCell className={`text-right tabular-nums text-xs ${getProfitClass(trade.profit)}`}>{formatCurrency(trade.profit, activeAccount.currency)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{formatCurrency(trade.commission, activeAccount.currency)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{formatCurrency(trade.swap, activeAccount.currency)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium ${getProfitClass(trade.net_profit)}`}>{formatCurrency(trade.net_profit, activeAccount.currency)}</TableCell>
                        <TableCell className={`text-right tabular-nums text-xs ${getProfitClass(trade.net_profit)}`}>{formatPercent((trade.net_profit / activeAccount.initial_balance) * 100)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {pageTrades.map((trade, i) => (
              <Card key={trade.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedTrade(trade)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getDirectionBadgeClass(trade.trade_type)}>
                        {trade.trade_type}
                      </Badge>
                      <span className="font-medium">{trade.symbol}</span>
                      <span className="text-xs text-muted-foreground">{formatNumber(trade.volume)} lots</span>
                    </div>
                    <span className={`tabular-nums font-medium ${getProfitClass(trade.net_profit)}`}>
                      {formatCurrency(trade.net_profit, activeAccount.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDateTime(trade.close_time)}</span>
                    <span>{formatDuration(trade.duration_minutes)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(Math.max(0, page - 1))}
                    className={page === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                <PaginationItem className="px-3 text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    className={page === totalPages - 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {/* Trade Detail Dialog */}
      <Dialog open={!!selectedTrade} onOpenChange={(open) => !open && setSelectedTrade(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className={getDirectionBadgeClass(selectedTrade?.trade_type ?? 'BUY')}>
                {selectedTrade?.trade_type}
              </Badge>
              {selectedTrade?.symbol}
              <span className="text-sm font-normal text-muted-foreground">#{selectedTrade?.ticket}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedTrade && (
            <TradeDetail trade={selectedTrade} currency={activeAccount.currency} initialBalance={activeAccount.initial_balance} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TradeDetail({ trade, currency, initialBalance }: { trade: Trade; currency: string; initialBalance: number }) {
  const rr = getRiskReward(trade);
  const session = getTradingSession(trade.open_time);
  const returnPct = (trade.net_profit / initialBalance) * 100;

  const rows: { label: string; value: string; className?: string }[] = [
    { label: 'Symbol', value: trade.symbol },
    { label: 'Direction', value: trade.trade_type },
    { label: 'Volume', value: `${formatNumber(trade.volume)} lots` },
    { label: 'Open Time', value: formatDateTime(trade.open_time) },
    { label: 'Close Time', value: formatDateTime(trade.close_time) },
    { label: 'Duration', value: formatDuration(trade.duration_minutes) },
    { label: 'Entry Price', value: formatNumber(trade.open_price, 5) },
    { label: 'Exit Price', value: formatNumber(trade.close_price, 5) },
    { label: 'Stop Loss', value: trade.stop_loss ? formatNumber(trade.stop_loss, 5) : '—' },
    { label: 'Take Profit', value: trade.take_profit ? formatNumber(trade.take_profit, 5) : '—' },
    { label: 'Risk/Reward', value: formatRiskReward(rr) },
    { label: 'Session', value: session },
    { label: 'Gross Profit', value: formatCurrency(trade.profit, currency), className: getProfitClass(trade.profit) },
    { label: 'Commission', value: formatCurrency(trade.commission, currency) },
    { label: 'Swap', value: formatCurrency(trade.swap, currency) },
    { label: 'Net Profit', value: formatCurrency(trade.net_profit, currency), className: getProfitClass(trade.net_profit) },
    { label: 'Return %', value: formatPercent(returnPct), className: getProfitClass(trade.net_profit) },
    { label: 'Comment', value: trade.comment ?? '—' },
    { label: 'Magic Number', value: trade.magic_number ? String(trade.magic_number) : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">{row.label}</span>
            <span className={`tabular-nums font-medium ${row.className ?? ''}`}>{row.value}</span>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          Price chart not available — TradeLens does not store historical price data. Entry and exit prices are shown above.
        </div>
      </div>
    </div>
  );
}
