'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Search, X, Filter } from 'lucide-react';
import type { TradeFilters, TradeDirection, TradingSession } from '@/lib/types';
import { getUniqueSymbols } from '@/lib/analytics';
import type { Trade } from '@/lib/types';

interface FilterBarProps {
  filters: TradeFilters;
  setFilters: (f: TradeFilters) => void;
  trades: Trade[];
  compact?: boolean;
}

const sessions: TradingSession[] = ['Asian', 'London', 'New York', 'London/NY Overlap'];
const days = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
];

export function FilterBar({ filters, setFilters, trades, compact }: FilterBarProps) {
  const symbols = getUniqueSymbols(trades);
  const hasActiveFilters = Object.values(filters).some((v) => v !== null && v !== '');

  const update = (patch: Partial<TradeFilters>) => {
    setFilters({ ...filters, ...patch });
  };

  const clear = () => {
    setFilters({
      dateFrom: null,
      dateTo: null,
      symbol: null,
      direction: null,
      outcome: null,
      minProfit: null,
      maxProfit: null,
      minLot: null,
      session: null,
      dayOfWeek: null,
      search: null,
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'p-3 rounded-lg border border-border bg-card'}`}>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-1">
        <Filter className="h-3.5 w-3.5" />
        Filters:
      </div>

      <Input
        type="text"
        placeholder="Search ticket, symbol..."
        value={filters.search ?? ''}
        onChange={(e) => update({ search: e.target.value || null })}
        className="h-8 w-[160px] text-xs"
      />

      {symbols.length > 0 && (
        <Select value={filters.symbol ?? 'all'} onValueChange={(v) => update({ symbol: v === 'all' ? null : v })}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Symbol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Symbols</SelectItem>
            {symbols.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={filters.direction ?? 'all'} onValueChange={(v) => update({ direction: v === 'all' ? null : v as TradeDirection })}>
        <SelectTrigger className="h-8 w-[90px] text-xs">
          <SelectValue placeholder="Direction" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="BUY">Buy</SelectItem>
          <SelectItem value="SELL">Sell</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.outcome ?? 'all'} onValueChange={(v) => update({ outcome: v === 'all' ? null : v as TradeFilters['outcome'] })}>
        <SelectTrigger className="h-8 w-[100px] text-xs">
          <SelectValue placeholder="Outcome" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="win">Winning</SelectItem>
          <SelectItem value="loss">Losing</SelectItem>
          <SelectItem value="breakeven">Break-even</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.session ?? 'all'} onValueChange={(v) => update({ session: v === 'all' ? null : v as TradingSession })}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Session" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sessions</SelectItem>
          {sessions.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.dayOfWeek !== null ? String(filters.dayOfWeek) : 'all'} onValueChange={(v) => update({ dayOfWeek: v === 'all' ? null : parseInt(v) })}>
        <SelectTrigger className="h-8 w-[110px] text-xs">
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Days</SelectItem>
          {days.map((d) => (
            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={filters.dateFrom ?? ''}
        onChange={(e) => update({ dateFrom: e.target.value || null })}
        className="h-8 w-[130px] text-xs"
      />
      <Input
        type="date"
        value={filters.dateTo ?? ''}
        onChange={(e) => update({ dateTo: e.target.value || null })}
        className="h-8 w-[130px] text-xs"
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clear}>
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
