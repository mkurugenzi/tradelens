import type {
  Trade,
  KPIData,
  BalanceCurvePoint,
  SymbolAnalytics,
  SessionAnalytics,
  DayOfWeekAnalytics,
  HourlyAnalytics,
  DrawdownAnalytics,
  CalendarDay,
  TradeFilters,
  TradeDirection,
  TradingSession,
} from './types';
import { getTradingSession, getDayOfWeek } from './format';

export function filterTrades(trades: Trade[], filters: TradeFilters): Trade[] {
  return trades.filter((t) => {
    if (filters.dateFrom) {
      if (new Date(t.close_time) < new Date(filters.dateFrom)) return false;
    }
    if (filters.dateTo) {
      if (new Date(t.close_time) > new Date(filters.dateTo + 'T23:59:59')) return false;
    }
    if (filters.symbol && t.symbol !== filters.symbol) return false;
    if (filters.direction && t.trade_type !== filters.direction) return false;
    if (filters.outcome) {
      if (filters.outcome === 'win' && t.net_profit <= 0) return false;
      if (filters.outcome === 'loss' && t.net_profit >= 0) return false;
      if (filters.outcome === 'breakeven' && t.net_profit !== 0) return false;
    }
    if (filters.minProfit !== null && t.net_profit < filters.minProfit) return false;
    if (filters.maxProfit !== null && t.net_profit > filters.maxProfit) return false;
    if (filters.minLot !== null && t.volume < filters.minLot) return false;
    if (filters.session) {
      if (getTradingSession(t.open_time) !== filters.session) return false;
    }
    if (filters.dayOfWeek !== null) {
      if (getDayOfWeek(t.open_time) !== filters.dayOfWeek) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matches =
        t.ticket.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        (t.comment?.toLowerCase().includes(q) ?? false) ||
        (t.magic_number?.toString().includes(q) ?? false);
      if (!matches) return false;
    }
    return true;
  });
}

export function sortTrades(trades: Trade[], sortKey: string): Trade[] {
  const sorted = [...trades];
  switch (sortKey) {
    case 'profit-desc':
      return sorted.sort((a, b) => b.net_profit - a.net_profit);
    case 'profit-asc':
      return sorted.sort((a, b) => a.net_profit - b.net_profit);
    case 'recent':
      return sorted.sort((a, b) => new Date(b.close_time).getTime() - new Date(a.close_time).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.close_time).getTime() - new Date(b.close_time).getTime());
    case 'largest-loss':
      return sorted.sort((a, b) => a.net_profit - b.net_profit);
    case 'largest-lot':
      return sorted.sort((a, b) => b.volume - a.volume);
    case 'longest-duration':
      return sorted.sort((a, b) => b.duration_minutes - a.duration_minutes);
    case 'shortest-duration':
      return sorted.sort((a, b) => a.duration_minutes - b.duration_minutes);
    default:
      return sorted.sort((a, b) => b.net_profit - a.net_profit);
  }
}

export function calculateKPIs(trades: Trade[], initialBalance: number, currentBalance: number): KPIData {
  if (trades.length === 0) {
    return {
      netProfit: 0,
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      averageTrade: 0,
      maxDrawdown: 0,
      currentBalance,
      returnPct: 0,
      grossProfit: 0,
      grossLoss: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      expectancy: 0,
      totalCommission: 0,
      totalSwap: 0,
    };
  }

  const sorted = [...trades].sort(
    (a, b) => new Date(a.close_time).getTime() - new Date(b.close_time).getTime()
  );

  const winningTrades = sorted.filter((t) => t.net_profit > 0);
  const losingTrades = sorted.filter((t) => t.net_profit < 0);
  const breakEvenTrades = sorted.filter((t) => t.net_profit === 0);

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.net_profit, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.net_profit, 0));

  const netProfit = sorted.reduce((sum, t) => sum + t.net_profit, 0);
  const totalCommission = sorted.reduce((sum, t) => sum + t.commission, 0);
  const totalSwap = sorted.reduce((sum, t) => sum + t.swap, 0);

  const averageWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
  const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.net_profit)) : 0;
  const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.net_profit)) : 0;

  const winRate = (winningTrades.length / sorted.length) * 100;
  const lossRate = (losingTrades.length / sorted.length) * 100;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const averageTrade = netProfit / sorted.length;
  const returnPct = initialBalance > 0 ? (netProfit / initialBalance) * 100 : 0;

  const expectancy =
    (winRate / 100) * averageWin - (lossRate / 100) * averageLoss;

  // Consecutive wins/losses
  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let curWins = 0;
  let curLosses = 0;
  for (const t of sorted) {
    if (t.net_profit > 0) {
      curWins++;
      curLosses = 0;
      maxConsecWins = Math.max(maxConsecWins, curWins);
    } else if (t.net_profit < 0) {
      curLosses++;
      curWins = 0;
      maxConsecLosses = Math.max(maxConsecLosses, curLosses);
    } else {
      curWins = 0;
      curLosses = 0;
    }
  }

  // Max drawdown from balance curve
  const curve = calculateBalanceCurve(sorted, initialBalance);
  const maxDrawdown = curve.reduce((max, p) => Math.max(max, p.drawdown), 0);

  return {
    netProfit,
    totalTrades: sorted.length,
    winRate,
    profitFactor,
    averageTrade,
    maxDrawdown,
    currentBalance,
    returnPct,
    grossProfit,
    grossLoss,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakEvenTrades: breakEvenTrades.length,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    consecutiveWins: maxConsecWins,
    consecutiveLosses: maxConsecLosses,
    expectancy,
    totalCommission,
    totalSwap,
  };
}

export function calculateBalanceCurve(trades: Trade[], initialBalance: number): BalanceCurvePoint[] {
  if (trades.length === 0) return [];

  const sorted = [...trades].sort(
    (a, b) => new Date(a.close_time).getTime() - new Date(b.close_time).getTime()
  );

  const points: BalanceCurvePoint[] = [];
  let balance = initialBalance;
  let peak = initialBalance;
  let cumulativeProfit = 0;

  for (const trade of sorted) {
    balance += trade.net_profit;
    cumulativeProfit += trade.net_profit;
    peak = Math.max(peak, balance);
    const drawdown = peak - balance;
    const drawdownPct = peak > 0 ? (drawdown / peak) * 100 : 0;

    points.push({
      date: trade.close_time,
      balance,
      profit: trade.net_profit,
      cumulativeProfit,
      drawdown,
      drawdownPct,
      isDrawdown: drawdown > 0,
    });
  }

  return points;
}

export function calculateSymbolAnalytics(trades: Trade[]): SymbolAnalytics[] {
  const groups = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = groups.get(t.symbol) ?? [];
    arr.push(t);
    groups.set(t.symbol, arr);
  }

  const results: SymbolAnalytics[] = [];
  for (const [symbol, symbolTrades] of Array.from(groups.entries())) {
    const wins = symbolTrades.filter((t: Trade) => t.net_profit > 0);
    const losses = symbolTrades.filter((t: Trade) => t.net_profit < 0);
    const grossProfit = wins.reduce((s: number, t: Trade) => s + t.net_profit, 0);
    const grossLoss = Math.abs(losses.reduce((s: number, t: Trade) => s + t.net_profit, 0));
    const netProfit = symbolTrades.reduce((s: number, t: Trade) => s + t.net_profit, 0);
    const totalVolume = symbolTrades.reduce((s: number, t: Trade) => s + t.volume, 0);
    const avgDuration = symbolTrades.reduce((s: number, t: Trade) => s + (t.duration_minutes || 0), 0) / symbolTrades.length;

    results.push({
      symbol,
      totalTrades: symbolTrades.length,
      winRate: (wins.length / symbolTrades.length) * 100,
      netProfit,
      averageProfit: wins.length > 0 ? grossProfit / wins.length : 0,
      averageLoss: losses.length > 0 ? grossLoss / losses.length : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      largestWin: wins.length > 0 ? Math.max(...wins.map((t: Trade) => t.net_profit)) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map((t: Trade) => t.net_profit)) : 0,
      averageDuration: avgDuration,
      totalVolume,
    });
  }

  return results.sort((a, b) => b.netProfit - a.netProfit);
}

export function calculateSessionAnalytics(trades: Trade[]): SessionAnalytics[] {
  const sessions: TradingSession[] = ['Asian', 'London', 'New York', 'London/NY Overlap'];
  const results: SessionAnalytics[] = [];

  for (const session of sessions) {
    const sessionTrades = trades.filter((t) => getTradingSession(t.open_time) === session);
    if (sessionTrades.length === 0) {
      results.push({ session, trades: 0, winRate: 0, netProfit: 0, averageTrade: 0, profitFactor: 0 });
      continue;
    }
    const wins = sessionTrades.filter((t) => t.net_profit > 0);
    const grossProfit = wins.reduce((s, t) => s + t.net_profit, 0);
    const grossLoss = Math.abs(sessionTrades.filter((t) => t.net_profit < 0).reduce((s, t) => s + t.net_profit, 0));
    const netProfit = sessionTrades.reduce((s, t) => s + t.net_profit, 0);

    results.push({
      session,
      trades: sessionTrades.length,
      winRate: (wins.length / sessionTrades.length) * 100,
      netProfit,
      averageTrade: netProfit / sessionTrades.length,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    });
  }

  return results;
}

export function calculateDayOfWeekAnalytics(trades: Trade[]): DayOfWeekAnalytics[] {
  const days = [1, 2, 3, 4, 5]; // Mon-Fri
  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const results: DayOfWeekAnalytics[] = [];

  for (const dayIdx of days) {
    const dayTrades = trades.filter((t) => getDayOfWeek(t.open_time) === dayIdx);
    if (dayTrades.length === 0) {
      results.push({
        day: dayNames[dayIdx],
        dayIndex: dayIdx,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        netProfit: 0,
        averageTrade: 0,
      });
      continue;
    }
    const wins = dayTrades.filter((t) => t.net_profit > 0);
    const losses = dayTrades.filter((t) => t.net_profit < 0);
    const netProfit = dayTrades.reduce((s, t) => s + t.net_profit, 0);

    results.push({
      day: dayNames[dayIdx],
      dayIndex: dayIdx,
      trades: dayTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: (wins.length / dayTrades.length) * 100,
      netProfit,
      averageTrade: netProfit / dayTrades.length,
    });
  }

  return results;
}

export function calculateHourlyAnalytics(trades: Trade[]): HourlyAnalytics[] {
  const results: HourlyAnalytics[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourTrades = trades.filter((t) => new Date(t.open_time).getUTCHours() === hour);
    if (hourTrades.length === 0) {
      results.push({ hour, trades: 0, netProfit: 0, winRate: 0 });
      continue;
    }
    const wins = hourTrades.filter((t) => t.net_profit > 0);
    const netProfit = hourTrades.reduce((s, t) => s + t.net_profit, 0);
    results.push({
      hour,
      trades: hourTrades.length,
      netProfit,
      winRate: (wins.length / hourTrades.length) * 100,
    });
  }
  return results;
}

export function calculateDrawdownAnalytics(trades: Trade[], initialBalance: number): DrawdownAnalytics {
  const curve = calculateBalanceCurve(trades, initialBalance);
  if (curve.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownPct: 0,
      currentDrawdown: 0,
      currentDrawdownPct: 0,
      averageDrawdown: 0,
      longestDrawdownDays: 0,
      recoveryTimeDays: 0,
      peakBalance: initialBalance,
      troughBalance: initialBalance,
    };
  }

  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  let peakBalance = initialBalance;
  let troughBalance = initialBalance;
  let peakTime: number | null = null;
  let troughTime: number | null = null;

  for (const point of curve) {
    if (point.drawdown > maxDrawdown) {
      maxDrawdown = point.drawdown;
      maxDrawdownPct = point.drawdownPct;
      troughBalance = point.balance;
    }
  }

  // Find peak and trough times for the max drawdown period
  let runningPeak = initialBalance;
  let runningPeakTime = new Date(curve[0].date).getTime();
  for (const point of curve) {
    if (point.balance > runningPeak) {
      runningPeak = point.balance;
      runningPeakTime = new Date(point.date).getTime();
    }
    if (point.drawdown === maxDrawdown && peakTime === null) {
      peakTime = runningPeakTime;
      troughTime = new Date(point.date).getTime();
      peakBalance = runningPeak;
    }
  }

  // Average drawdown
  const drawdownValues = curve.map((p) => p.drawdown).filter((d) => d > 0);
  const averageDrawdown = drawdownValues.length > 0
    ? drawdownValues.reduce((a, b) => a + b, 0) / drawdownValues.length
    : 0;

  // Current drawdown
  const lastPoint = curve[curve.length - 1];
  const currentDrawdown = lastPoint.drawdown;
  const currentDrawdownPct = lastPoint.drawdownPct;

  // Longest drawdown period (consecutive days in drawdown)
  let longestPeriod = 0;
  let currentPeriod = 0;
  let periodStart: number | null = null;
  let periodEnd: number | null = null;
  let lastDate: number | null = null;

  for (const point of curve) {
    const date = new Date(point.date).getTime();
    if (point.isDrawdown) {
      if (currentPeriod === 0) periodStart = date;
      currentPeriod++;
      periodEnd = date;
    } else {
      if (currentPeriod > longestPeriod) {
        longestPeriod = currentPeriod;
      }
      currentPeriod = 0;
    }
    lastDate = date;
  }
  if (currentPeriod > longestPeriod) {
    longestPeriod = currentPeriod;
  }

  const longestDrawdownDays = longestPeriod > 0 && periodStart && periodEnd
    ? Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24))
    : 0;

  // Recovery time (from trough back to peak)
  let recoveryTimeDays = 0;
  if (peakTime && troughTime) {
    // Find when balance recovers to peakBalance after trough
    const troughIdx = curve.findIndex(
      (p) => new Date(p.date).getTime() === troughTime && p.drawdown === maxDrawdown
    );
    if (troughIdx >= 0) {
      const targetPeak = peakBalance;
      for (let i = troughIdx; i < curve.length; i++) {
        if (curve[i].balance >= targetPeak) {
          recoveryTimeDays = Math.ceil(
            (new Date(curve[i].date).getTime() - troughTime) / (1000 * 60 * 60 * 24)
          );
          break;
        }
      }
      // If not recovered, count days from trough to last point
      if (recoveryTimeDays === 0) {
        const lastDateMs = new Date(curve[curve.length - 1].date).getTime();
        const diff = Math.ceil((lastDateMs - troughTime) / (1000 * 60 * 60 * 24));
        recoveryTimeDays = diff;
      }
    }
  }

  return {
    maxDrawdown,
    maxDrawdownPct,
    currentDrawdown,
    currentDrawdownPct,
    averageDrawdown,
    longestDrawdownDays,
    recoveryTimeDays,
    peakBalance,
    troughBalance,
  };
}

export function calculateCalendar(
  trades: Trade[],
  year: number,
  month: number
): CalendarDay[] {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const daysInMonth = lastDay.getUTCDate();
  const startWeekday = firstDay.getUTCDay();

  const days: CalendarDay[] = [];

  // Previous month padding
  const prevLastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevLastDay - i;
    const date = new Date(Date.UTC(year, month - 1, day));
    const dateStr = date.toISOString().split('T')[0];
    const dayTrades = trades.filter((t) => t.close_time.startsWith(dateStr));
    days.push({
      date: dateStr,
      day,
      month: month - 1,
      year,
      isCurrentMonth: false,
      profit: dayTrades.reduce((s, t) => s + t.net_profit, 0),
      trades: dayTrades.length,
      wins: dayTrades.filter((t) => t.net_profit > 0).length,
      losses: dayTrades.filter((t) => t.net_profit < 0).length,
    });
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month, day));
    const dateStr = date.toISOString().split('T')[0];
    const dayTrades = trades.filter((t) => t.close_time.startsWith(dateStr));
    days.push({
      date: dateStr,
      day,
      month,
      year,
      isCurrentMonth: true,
      profit: dayTrades.reduce((s, t) => s + t.net_profit, 0),
      trades: dayTrades.length,
      wins: dayTrades.filter((t) => t.net_profit > 0).length,
      losses: dayTrades.filter((t) => t.net_profit < 0).length,
    });
  }

  // Next month padding to fill 6 rows
  const remaining = 42 - days.length;
  for (let day = 1; day <= remaining; day++) {
    const date = new Date(Date.UTC(year, month + 1, day));
    const dateStr = date.toISOString().split('T')[0];
    const dayTrades = trades.filter((t) => t.close_time.startsWith(dateStr));
    days.push({
      date: dateStr,
      day,
      month: month + 1,
      year,
      isCurrentMonth: false,
      profit: dayTrades.reduce((s, t) => s + t.net_profit, 0),
      trades: dayTrades.length,
      wins: dayTrades.filter((t) => t.net_profit > 0).length,
      losses: dayTrades.filter((t) => t.net_profit < 0).length,
    });
  }

  return days;
}

export function getBestTrades(trades: Trade[], count = 10): Trade[] {
  return [...trades].sort((a, b) => b.net_profit - a.net_profit).slice(0, count);
}

export function getWorstTrades(trades: Trade[], count = 10): Trade[] {
  return [...trades].sort((a, b) => a.net_profit - b.net_profit).slice(0, count);
}

export function getUniqueSymbols(trades: Trade[]): string[] {
  return [...new Set(trades.map((t) => t.symbol))].sort();
}

export function getProfitFactorColor(pf: number): string {
  if (pf >= 2) return 'text-profit';
  if (pf >= 1.5) return 'text-warning';
  if (pf >= 1) return 'text-muted-foreground';
  return 'text-loss';
}

export function formatProfitFactor(pf: number): string {
  if (!isFinite(pf)) return '∞';
  return pf.toFixed(2);
}
