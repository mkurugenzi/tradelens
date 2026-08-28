export type Platform = 'MT4' | 'MT5';
export type TradeDirection = 'BUY' | 'SELL';
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
export type AccountType = 'demo' | 'live';
export type SyncStatus = 'connected' | 'syncing' | 'disconnected' | 'idle';
export type JournalDirection = 'BUY' | 'SELL';
export type JournalResult = 'win' | 'loss' | 'breakeven';
export type ScreenshotStage = 'before' | 'during' | 'after';

export interface JournalScreenshot {
  id: string;
  stage: ScreenshotStage;
  url: string;
  name: string;
}

export interface JournalNotes {
  whyEntry: string;
  setup: string;
  expectation: string;
  whatHappened: string;
  didWell: string;
  didWrong: string;
  nextTime: string;
}

export interface JournalTrade {
  id: string;
  user_id?: string;
  account_id: string;
  asset: string;
  direction: JournalDirection;
  date: string;
  time: string;
  session: TradingSession;
  timeframe: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  exit_price: number;
  position_size: number;
  risk_percent: number;
  risk_reward: number;
  profit_loss: number;
  result: JournalResult;
  strategy: string;
  setup_type: string;
  market_condition: string;
  screenshots: JournalScreenshot[];
  notes: JournalNotes;
  tags: string[];
  execution_rating: number;
  ai_review?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradingAccount {
  id: string;
  user_id?: string;
  account_name: string;
  broker: string;
  platform: Platform;
  account_number?: string | null;
  account_number_hash: string | null;
  currency: string;
  initial_balance: number;
  current_balance: number;
  equity?: number;
  floating_pl?: number;
  leverage?: number;
  api_key?: string | null;
  last_sync_at?: string | null;
  sync_status?: SyncStatus;
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
  notes?: string | null;
  tags?: string[] | null;
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

// AI Analyst types
export type PatternSeverity = 'critical' | 'warning' | 'positive' | 'neutral';

export interface PatternObservation {
  id: string;
  title: string;
  description: string;
  metric: string;
  severity: PatternSeverity;
  category: 'risk' | 'execution' | 'psychology' | 'timing' | 'symbol';
  actionTip: string;
}

export interface TraderDiagnosis {
  grade: string;
  archetype: string;
  scores: {
    edge: number;
    discipline: number;
    riskManagement: number;
    tiltResistance: number;
    consistency: number;
  };
  executiveSummary: string;
  strengths: string[];
  weaknesses: string[];
  patterns: PatternObservation[];
  actionRules: string[];
  institutionalMetrics?: InstitutionalMetrics;
  generatedAt: string;
}

export interface InstitutionalMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  kellyPercentage: number;
  optimalRiskPerTrade: number;
  holdingDecayMinutes: number;
  holdingDecayLossRate: number;
}

export interface MonteCarloPoint {
  tradeIndex: number;
  p5: number;
  p50: number;
  p95: number;
}

export interface MonteCarloResult {
  riskOfRuinPct: number;
  probOfProfitPct: number;
  maxSimulatedDrawdownPct: number;
  medianFinalBalance: number;
  p95FinalBalance: number;
  p5FinalBalance: number;
  curvePoints: MonteCarloPoint[];
}

export interface WhatIfScenario {
  id: string;
  title: string;
  description: string;
  impactProfit: number;
  impactWinRate: number;
  tradesExcludedCount: number;
  simulatedProfit: number;
  simulatedBalance: number;
}

export type AICoachPersona = 'prop-firm' | 'quant' | 'psychology' | 'general';
export type CoachingSessionMode = 'general' | 'pre-market' | 'post-market' | 'tilt-emergency';

export interface AIEvidence {
  label: string;
  value: string;
  detail: string;
  tone?: 'positive' | 'warning' | 'neutral';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  persona?: AICoachPersona;
  suggestions?: string[];
  actionPrompt?: string;
  evidence?: AIEvidence[];
}

export interface AIAnalysisRequest {
  trades: Trade[];
  account: TradingAccount;
  query?: string;
  persona?: AICoachPersona;
  chatHistory?: { role: 'user' | 'assistant'; content: string }[];
}

// MT4/MT5 Sync models
export interface IncomingTradePayload {
  ticket: string;
  symbol: string;
  trade_type: TradeDirection;
  volume: number;
  open_time: string;
  close_time: string;
  open_price: number;
  close_price: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  profit: number;
  commission?: number;
  swap?: number;
  net_profit?: number;
  comment?: string | null;
  magic_number?: number | null;
}

export interface SyncPayload {
  api_key: string;
  platform: Platform;
  broker?: string;
  account_number?: string;
  currency?: string;
  current_balance?: number;
  equity?: number;
  margin?: number;
  free_margin?: number;
  leverage?: number;
  trades?: IncomingTradePayload[];
}

export interface SyncResponse {
  success: boolean;
  message: string;
  account_id?: string;
  synced_count?: number;
  duplicate_count?: number;
  timestamp?: string;
  error?: string;
}

export interface HeartbeatPayload {
  api_key: string;
  platform: Platform;
  account_number?: string;
  balance: number;
  equity: number;
  open_positions_count?: number;
  terminal_version?: string;
}

export interface SyncLogEntry {
  id: string;
  account_id: string;
  event_type: 'trade_sync' | 'heartbeat' | 'error';
  trades_count: number;
  status: 'success' | 'failed';
  details?: string;
  created_at: string;
}
