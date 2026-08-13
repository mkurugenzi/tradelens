import type { Trade, TradeDirection, TradingSession } from './types';

export function formatCurrency(value: number, currency = 'USD', compact = false): string {
  const abs = Math.abs(value);
  let formatted: string;
  if (compact && abs >= 1_000_000) {
    formatted = `${(value / 1_000_000).toFixed(2)}M`;
  } else if (compact && abs >= 1_000) {
    formatted = `${(value / 1_000).toFixed(1)}K`;
  } else {
    formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  const sign = value < 0 ? '-' : value > 0 ? '+' : '';
  return `${sign}$${formatted}`;
}

export function formatCurrencyPlain(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatPercentPlain(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function getProfitClass(value: number): string {
  if (value > 0) return 'text-profit';
  if (value < 0) return 'text-loss';
  return 'text-muted-foreground';
}

export function getProfitBgClass(value: number): string {
  if (value > 0) return 'bg-profit-soft';
  if (value < 0) return 'bg-loss-soft';
  return '';
}

export function getDirectionClass(direction: TradeDirection): string {
  return direction === 'BUY' ? 'text-profit' : 'text-loss';
}

export function getDirectionBadgeClass(direction: TradeDirection): string {
  return direction === 'BUY'
    ? 'bg-profit-soft text-profit border-profit'
    : 'bg-loss-soft text-loss border-loss';
}

export function getTradingSession(dateStr: string): TradingSession {
  const hour = new Date(dateStr).getUTCHours();
  if (hour >= 0 && hour < 7) return 'Asian';
  if (hour >= 7 && hour < 12) return 'London';
  if (hour >= 12 && hour < 14) return 'London/NY Overlap';
  if (hour >= 14 && hour < 21) return 'New York';
  return 'Asian';
}

export function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getUTCDay();
}

export function getDayName(dayIndex: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex] ?? 'Unknown';
}

export function getDayNameShort(dayIndex: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex] ?? 'Unk';
}

export function getReturnPct(trade: Trade, initialBalance: number): number {
  if (initialBalance === 0) return 0;
  return (trade.net_profit / initialBalance) * 100;
}

export function getRiskReward(trade: Trade): number | null {
  if (!trade.stop_loss || !trade.take_profit || trade.open_price === 0) return null;
  const risk = Math.abs(trade.open_price - trade.stop_loss);
  const reward = Math.abs(trade.take_profit - trade.open_price);
  if (risk === 0) return null;
  return reward / risk;
}

export function formatRiskReward(rr: number | null): string {
  if (rr === null || !isFinite(rr) || rr === 0) return 'N/A';
  return `1:${rr.toFixed(1)}`;
}
