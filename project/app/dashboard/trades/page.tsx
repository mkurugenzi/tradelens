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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Plus,
  Activity,
  Download,
  Tag,
  BookOpen,
  Check,
  Sparkles,
  FileSpreadsheet,
  X,
} from 'lucide-react';
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

const PRESET_TAGS = [
  'A+ Setup',
  'Breakout',
  'Pullback',
  'Trend Following',
  'Key Level Bounce',
  'FOMO',
  'Revenge Trade',
  'Early Exit',
  'Cut Loss Early',
  'News Event',
  'Risk Managed',
];

export default function TradesPage() {
  const { activeAccount, activeTrades, filters, setFilters, updateTradeJournal } = useApp();
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

  // Sync selectedTrade with activeTrades in case journal notes/tags update
  const currentSelectedTrade = useMemo(() => {
    if (!selectedTrade) return null;
    return activeTrades.find((t) => t.id === selectedTrade.id) || selectedTrade;
  }, [selectedTrade, activeTrades]);

  const handleExportCSV = () => {
    if (sortedTrades.length === 0) return;

    const headers = [
      'Ticket',
      'Symbol',
      'Direction',
      'Volume (Lots)',
      'Open Time',
      'Close Time',
      'Open Price',
      'Close Price',
      'Stop Loss',
      'Take Profit',
      'Gross Profit',
      'Commission',
      'Swap',
      'Net Profit',
      'Duration (Mins)',
      'Tags',
      'Notes / Comment',
    ];

    const csvRows = sortedTrades.map((t) => [
      `"${t.ticket}"`,
      `"${t.symbol}"`,
      `"${t.trade_type}"`,
      t.volume,
      `"${t.open_time}"`,
      `"${t.close_time}"`,
      t.open_price,
      t.close_price,
      t.stop_loss ?? '',
      t.take_profit ?? '',
      t.profit,
      t.commission,
      t.swap,
      t.net_profit,
      t.duration_minutes,
      `"${(t.tags || []).join(', ')}"`,
      `"${(t.notes || t.comment || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const accountNameClean = (activeAccount?.account_name || 'tradelens').replace(/\s+/g, '_').toLowerCase();
    link.setAttribute('download', `${accountNameClean}_trades_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        description={`${sortedTrades.length} trades (${activeTrades.length} total)`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={sortedTrades.length === 0}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/import"><Plus className="h-4 w-4 mr-1.5" />Import</Link>
            </Button>
          </div>
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
                      <TableHead className="text-right">Tags & Journal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageTrades.map((trade, i) => (
                      <TableRow
                        key={trade.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
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
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {trade.tags && trade.tags.length > 0 ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                <Tag className="h-2.5 w-2.5 mr-1" />
                                {trade.tags[0]}
                                {trade.tags.length > 1 && ` +${trade.tags.length - 1}`}
                              </Badge>
                            ) : trade.notes || trade.comment ? (
                              <span className="text-[11px] text-muted-foreground italic truncate max-w-[100px]">
                                {trade.notes || trade.comment}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40 group-hover:text-muted-foreground">Add note</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {pageTrades.map((trade) => (
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
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{formatDateTime(trade.close_time)}</span>
                    <span>{formatDuration(trade.duration_minutes)}</span>
                  </div>
                  {(trade.tags?.length || trade.notes) ? (
                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-border/50">
                      {trade.tags?.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                          #{t}
                        </Badge>
                      ))}
                      {trade.notes && (
                        <span className="text-[11px] text-muted-foreground italic truncate">
                          "{trade.notes}"
                        </span>
                      )}
                    </div>
                  ) : null}
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

      {/* Trade Detail & Journal Dialog */}
      <Dialog open={!!selectedTrade} onOpenChange={(open) => !open && setSelectedTrade(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getDirectionBadgeClass(currentSelectedTrade?.trade_type ?? 'BUY')}>
                  {currentSelectedTrade?.trade_type}
                </Badge>
                <span className="text-base font-semibold">{currentSelectedTrade?.symbol}</span>
                <span className="text-xs font-mono text-muted-foreground">#{currentSelectedTrade?.ticket}</span>
              </div>
              <span className={`text-base font-bold tabular-nums ${getProfitClass(currentSelectedTrade?.net_profit ?? 0)}`}>
                {formatCurrency(currentSelectedTrade?.net_profit ?? 0, activeAccount.currency)}
              </span>
            </DialogTitle>
          </DialogHeader>
          {currentSelectedTrade && (
            <TradeDetailWithJournal
              trade={currentSelectedTrade}
              currency={activeAccount.currency}
              initialBalance={activeAccount.initial_balance}
              onSaveJournal={async (notes, tags) => {
                await updateTradeJournal(currentSelectedTrade.id, notes, tags);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TradeDetailWithJournal({
  trade,
  currency,
  initialBalance,
  onSaveJournal,
}: {
  trade: Trade;
  currency: string;
  initialBalance: number;
  onSaveJournal: (notes: string, tags: string[]) => Promise<void>;
}) {
  const [notes, setNotes] = useState(trade.notes || trade.comment || '');
  const [tags, setTags] = useState<string[]>(trade.tags || []);
  const [customTagInput, setCustomTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const rr = getRiskReward(trade);
  const session = getTradingSession(trade.open_time);
  const returnPct = (trade.net_profit / initialBalance) * 100;

  const toggleTag = (tagName: string) => {
    setTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = customTagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
      setCustomTagInput('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSaveJournal(notes, tags);
    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

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
    { label: 'Magic Number', value: trade.magic_number ? String(trade.magic_number) : '—' },
  ];

  return (
    <div className="space-y-5">
      {/* Execution Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-muted/40 p-3 rounded-lg border border-border">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-[11px]">{row.label}</span>
            <span className={`tabular-nums font-medium ${row.className ?? ''}`}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Trade Journal & Psychological Tags */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium text-sm">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>Trading Journal & Psychology</span>
          </div>
          {savedSuccess && (
            <Badge variant="outline" className="text-profit border-profit/30 bg-profit/10 text-xs">
              <Check className="h-3 w-3 mr-1" />
              Journal Saved
            </Badge>
          )}
        </div>

        {/* Tags Section */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Tags & Execution Factors</span>
            <span className="text-[11px]">{tags.length} selected</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.map((preset) => {
              const isSelected = tags.includes(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => toggleTag(preset)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary font-medium'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  #{preset}
                </button>
              );
            })}
            {tags
              .filter((t) => !PRESET_TAGS.includes(t))
              .map((customTag) => (
                <button
                  key={customTag}
                  type="button"
                  onClick={() => toggleTag(customTag)}
                  className="text-xs px-2.5 py-1 rounded-md border bg-primary text-primary-foreground border-primary font-medium flex items-center gap-1"
                >
                  #{customTag}
                  <X className="h-3 w-3" />
                </button>
              ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Input
              placeholder="Add custom tag (e.g. London-Open-Break)..."
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={handleAddCustomTag}
              className="h-8 text-xs max-w-xs"
            />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleAddCustomTag}>
              Add Tag
            </Button>
          </div>
        </div>

        {/* Notes Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Trade Notes & Mindset</label>
          <Textarea
            placeholder="Why did you take this trade? Did you follow your rules? How was your execution discipline?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="text-xs resize-none"
          />
        </div>

        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Journal Entry'}
          </Button>
        </div>
      </div>
    </div>
  );
}
