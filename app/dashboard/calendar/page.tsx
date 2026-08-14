'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/app-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { filterTrades, calculateCalendar } from '@/lib/analytics';
import { formatCurrency, formatDateTime, getProfitClass, getDirectionBadgeClass, formatNumber } from '@/lib/format';
import type { Trade } from '@/lib/types';
import { Calendar, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const { activeAccount, activeTrades, filters } = useApp();
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filteredTrades = useMemo(() => filterTrades(activeTrades, filters), [activeTrades, filters]);
  const calendarDays = useMemo(() => calculateCalendar(filteredTrades, year, month), [filteredTrades, year, month]);

  const selectedDayTrades = useMemo(() => {
    if (!selectedDate) return [];
    return filteredTrades.filter((t) => t.close_time.startsWith(selectedDate)).sort((a, b) => new Date(a.close_time).getTime() - new Date(b.close_time).getTime());
  }, [filteredTrades, selectedDate]);

  const maxAbsProfit = useMemo(() => Math.max(...calendarDays.map((d) => Math.abs(d.profit)), 1), [calendarDays]);

  if (!activeAccount) {
    return <EmptyState title="No trading account yet" description="Create your first trading account to start analyzing your trades." actionLabel="Create Account" onAction={() => window.location.href = '/dashboard/settings'} icon={<Plus className="h-12 w-12" />} />;
  }
  if (activeTrades.length === 0) {
    return <EmptyState title="No trades imported yet" description="Import your MT4 or MT5 trade history to see the trading calendar." actionLabel="Import Trades" onAction={() => window.location.href = '/dashboard/import'} icon={<Calendar className="h-12 w-12" />} />;
  }

  const prevMonth = () => { if (month === 0) { setYear(year - 1); setMonth(11); } else { setMonth(month - 1); } };
  const nextMonth = () => { if (month === 11) { setYear(year + 1); setMonth(0); } else { setMonth(month + 1); } };

  const getDayColor = (day: typeof calendarDays[0]) => {
    if (day.trades === 0 || !day.isCurrentMonth) return 'transparent';
    const intensity = Math.min(Math.abs(day.profit) / maxAbsProfit, 1);
    if (day.profit > 0) return `hsl(142 64% 45% / ${0.1 + intensity * 0.4})`;
    if (day.profit < 0) return `hsl(0 64% 50% / ${0.1 + intensity * 0.4})`;
    return 'hsl(var(--muted) / 0.3)';
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Trading Calendar" description="Daily performance overview" />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{MONTH_NAMES[month]} {year}</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => (
              <button
                key={i}
                onClick={() => day.trades > 0 && day.isCurrentMonth && setSelectedDate(day.date)}
                disabled={day.trades === 0 || !day.isCurrentMonth}
                className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all ${day.isCurrentMonth ? '' : 'opacity-30'} ${day.trades > 0 && day.isCurrentMonth ? 'cursor-pointer hover:ring-2 hover:ring-ring' : 'cursor-default'}`}
                style={{ backgroundColor: getDayColor(day) }}
              >
                <span className="font-medium">{day.day}</span>
                {day.trades > 0 && day.isCurrentMonth && (
                  <span className={`text-[10px] tabular-nums ${day.profit > 0 ? 'text-profit' : day.profit < 0 ? 'text-loss' : 'text-muted-foreground'}`}>
                    {day.profit > 0 ? '+' : ''}{Math.round(day.profit)}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(142 64% 45% / 0.4)' }} />Profit</div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(0 64% 50% / 0.4)' }} />Loss</div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--muted) / 0.3)' }} />No trades</div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}</DialogTitle></DialogHeader>
          {selectedDayTrades.length > 0 ? (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Lot</TableHead>
                  <TableHead>Close Time</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {selectedDayTrades.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.symbol}</TableCell>
                      <TableCell><Badge variant="outline" className={getDirectionBadgeClass(t.trade_type)}>{t.trade_type}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(t.volume)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDateTime(t.close_time)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${getProfitClass(t.net_profit)}`}>{formatCurrency(t.net_profit, activeAccount.currency)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={4} className="font-medium">Total</TableCell>
                    <TableCell className={`text-right tabular-nums font-bold ${getProfitClass(selectedDayTrades.reduce((s, t) => s + t.net_profit, 0))}`}>{formatCurrency(selectedDayTrades.reduce((s, t) => s + t.net_profit, 0), activeAccount.currency)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : <p className="text-sm text-muted-foreground">No trades on this day.</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
