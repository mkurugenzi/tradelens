export type Platform = 'MT4' | 'MT5';
export type TradeDirection = 'BUY' | 'SELL';
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
export type AccountType = 'demo' | 'live';

export interface TradingAccount {
  id: string;
  user_id?: string;
  account_name: string;
  broker: string;
  platform: Platform;
  account_number_hash: string | null;
  currency: string;
  initial_balance: number;
  current_balance: number;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  account_id: string;
  ticket: string;
  symbol: string;
  trade_type: TradeDirection;
  volume: number;
  open_time: string;
  close_time: string;
  open_price: number;
  close_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  profit: number;
  commission: number;
  swap: number;
  net_profit: number;
  comment: string | null;
  magic_number: number | null;
  duration_minutes: number;
  created_at: string;
}

export interface DailyPerformance {
  id: string;
  account_id: string;
  date: string;
  starting_balance: number;
  ending_balance: number;
  daily_profit: number;
  daily_return: number;
  drawdown: number;
}

export interface ImportJob {
  id: string;
  account_id: string;
  filename: string;
  status: ImportJobStatus;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  duplicate_rows: number;
  error_log: ImportError[] | null;
  created_at: string;
  completed_at: string | null;
}

export interface ImportError {
  row: number;
  message: string;
  data?: Record<string, string>;
}

export interface ColumnMapping {
  id: string;
  user_id: string;
  broker: string;
  platform: Platform;
  mapping: Record<string, string>;
  created_at: string;
}

export type TradingSession = 'Asian' | 'London' | 'New York' | 'London/NY Overlap';

export interface KPIData {
  netProfit: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  averageTrade: number;
  maxDrawdown: number;
  currentBalance: number;
  returnPct: number;
  grossProfit: number;
  grossLoss: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  expectancy: number;
  totalCommission: number;
  totalSwap: number;
}

export interface BalanceCurvePoint {
  date: string;
  balance: number;
  profit: number;
  cumulativeProfit: number;
  drawdown: number;
  drawdownPct: number;
  isDrawdown: boolean;
}

export interface SymbolAnalytics {
  symbol: string;
  totalTrades: number;
  winRate: number;
  netProfit: number;
  averageProfit: number;
  averageLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  averageDuration: number;
  totalVolume: number;
}

export interface SessionAnalytics {
  session: TradingSession;
  trades: number;
  winRate: number;
  netProfit: number;
  averageTrade: number;
  profitFactor: number;
}

export interface DayOfWeekAnalytics {
  day: string;
  dayIndex: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netProfit: number;
  averageTrade: number;
}

export interface HourlyAnalytics {
  hour: number;
  trades: number;
  netProfit: number;
  winRate: number;
}

export interface DrawdownAnalytics {
  maxDrawdown: number;
  maxDrawdownPct: number;
  currentDrawdown: number;
  currentDrawdownPct: number;
  averageDrawdown: number;
  longestDrawdownDays: number;
  recoveryTimeDays: number;
  peakBalance: number;
  troughBalance: number;
}

export interface CalendarDay {
  date: string;
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  profit: number;
  trades: number;
  wins: number;
  losses: number;
}

export interface TradeFilters {
  dateFrom: string | null;
  dateTo: string | null;
  symbol: string | null;
  direction: TradeDirection | null;
  outcome: 'win' | 'loss' | 'breakeven' | null;
  minProfit: number | null;
  maxProfit: number | null;
  minLot: number | null;
  session: TradingSession | null;
  dayOfWeek: number | null;
  search: string | null;
}

export type SortKey =
  | 'profit-desc'
  | 'profit-asc'
  | 'recent'
  | 'oldest'
  | 'largest-loss'
  | 'largest-lot'
  | 'longest-duration'
  | 'shortest-duration';
