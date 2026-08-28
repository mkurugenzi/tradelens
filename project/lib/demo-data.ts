import type { Trade, TradingAccount, TradeDirection } from './types';

// Deterministic pseudo-random generator for reproducible demo data
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const SYMBOLS = [
  { symbol: 'XAUUSD', basePrice: 2330, volatility: 12, pipSize: 0.01, lotValue: 100 },
  { symbol: 'EURUSD', basePrice: 1.085, volatility: 0.008, pipSize: 0.0001, lotValue: 10000 },
  { symbol: 'GBPUSD', basePrice: 1.265, volatility: 0.009, pipSize: 0.0001, lotValue: 10000 },
  { symbol: 'USDJPY', basePrice: 152.5, volatility: 0.6, pipSize: 0.01, lotValue: 1000 },
  { symbol: 'NAS100', basePrice: 18200, volatility: 45, pipSize: 0.1, lotValue: 1 },
];

const BROKERS = ['FTMO', 'IC Markets', 'Pepperstone'];

function generateTrades(rng: () => number, accountId: string, count: number, startDate: Date): Trade[] {
  const trades: Trade[] = [];
  let ticket = 100000;

  for (let i = 0; i < count; i++) {
    const sym = SYMBOLS[Math.floor(rng() * SYMBOLS.length)];
    const direction: TradeDirection = rng() > 0.45 ? 'BUY' : 'SELL';
    const volume = Math.round((0.1 + rng() * 1.4) * 10) / 10;

    // Open time: spread across ~5 months
    const openTime = new Date(startDate);
    openTime.setUTCDate(openTime.getUTCDate() + Math.floor((i / count) * 150));
    openTime.setUTCHours(Math.floor(rng() * 24), Math.floor(rng() * 60));

    // Duration: 5 min to 3 days
    const durationMinutes = Math.floor(5 + rng() * (60 * 24 * 3));
    const closeTime = new Date(openTime);
    closeTime.setUTCMinutes(closeTime.getUTCMinutes() + durationMinutes);

    // Price movement
    const priceMove = (rng() - 0.48) * sym.volatility * (0.5 + rng());
    const openPrice = sym.basePrice + (rng() - 0.5) * sym.volatility * 2;
    let closePrice: number;
    if (direction === 'BUY') {
      closePrice = openPrice + priceMove;
    } else {
      closePrice = openPrice - priceMove;
    }

    // SL and TP
    const slDistance = sym.volatility * (0.3 + rng() * 0.7);
    const tpDistance = slDistance * (1 + rng() * 2);
    const stopLoss = direction === 'BUY' ? openPrice - slDistance : openPrice + slDistance;
    const takeProfit = direction === 'BUY' ? openPrice + tpDistance : openPrice - tpDistance;

    // Profit calculation
    const priceDiff = direction === 'BUY' ? closePrice - openPrice : openPrice - closePrice;
    const grossProfit = priceDiff * sym.lotValue * volume;
    const commission = -(volume * 7);
    const swap = -(rng() * volume * 2);
    const netProfit = Math.round((grossProfit + commission + swap) * 100) / 100;

    const comment = rng() > 0.7 ? `Strategy_${Math.floor(rng() * 5) + 1}` : null;
    const magicNumber = rng() > 0.5 ? Math.floor(rng() * 900000) + 100000 : null;

    trades.push({
      id: `demo-${accountId}-${i}`,
      account_id: accountId,
      ticket: String(ticket++),
      symbol: sym.symbol,
      trade_type: direction,
      volume,
      open_time: openTime.toISOString(),
      close_time: closeTime.toISOString(),
      open_price: Math.round(openPrice * 100000) / 100000,
      close_price: Math.round(closePrice * 100000) / 100000,
      stop_loss: Math.round(stopLoss * 100000) / 100000,
      take_profit: Math.round(takeProfit * 100000) / 100000,
      profit: Math.round(grossProfit * 100) / 100,
      commission: Math.round(commission * 100) / 100,
      swap: Math.round(swap * 100) / 100,
      net_profit: netProfit,
      comment,
      magic_number: magicNumber,
      duration_minutes: durationMinutes,
      created_at: closeTime.toISOString(),
    });
  }

  return trades.sort((a, b) => new Date(a.close_time).getTime() - new Date(b.close_time).getTime());
}

export interface DemoAccount {
  account: TradingAccount;
  trades: Trade[];
}

export function generateDemoData(): DemoAccount[] {
  const rng = seededRandom(42);
  const startDate = new Date();
  startDate.setUTCMonth(startDate.getUTCMonth() - 5);
  startDate.setUTCDate(1);
  startDate.setUTCHours(0, 0, 0, 0);

  const accounts: DemoAccount[] = [];

  // Account 1: FTMO Challenge
  const ftmoId = 'demo-acct-1';
  const ftmoTrades = generateTrades(rng, ftmoId, 320, startDate);
  const ftmoNetProfit = ftmoTrades.reduce((s, t) => s + t.net_profit, 0);
  accounts.push({
    account: {
      id: ftmoId,
      account_name: 'FTMO Challenge',
      broker: 'FTMO',
      platform: 'MT5',
      account_number: '20849201',
      account_number_hash: null,
      currency: 'USD',
      initial_balance: 100000,
      current_balance: 100000 + ftmoNetProfit,
      equity: 100000 + ftmoNetProfit + 342.5,
      floating_pl: 342.5,
      leverage: 100,
      api_key: 'tl_demo_ftmo_89f3a19b88e4',
      last_sync_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      sync_status: 'connected',
      is_demo: true,
      created_at: startDate.toISOString(),
      updated_at: new Date().toISOString(),
    },
    trades: ftmoTrades,
  });

  // Account 2: Personal MT5
  const personalId = 'demo-acct-2';
  const personalTrades = generateTrades(rng, personalId, 180, startDate);
  const personalNetProfit = personalTrades.reduce((s, t) => s + t.net_profit, 0);
  accounts.push({
    account: {
      id: personalId,
      account_name: 'Personal MT5',
      broker: 'IC Markets',
      platform: 'MT5',
      account_number: '55192834',
      account_number_hash: null,
      currency: 'USD',
      initial_balance: 25000,
      current_balance: 25000 + personalNetProfit,
      equity: 25000 + personalNetProfit,
      floating_pl: 0,
      leverage: 500,
      api_key: 'tl_demo_icm_74b1239c01f8',
      last_sync_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      sync_status: 'connected',
      is_demo: true,
      created_at: startDate.toISOString(),
      updated_at: new Date().toISOString(),
    },
    trades: personalTrades,
  });

  // Account 3: Demo Account
  const demoId = 'demo-acct-3';
  const demoTrades = generateTrades(rng, demoId, 95, startDate);
  const demoNetProfit = demoTrades.reduce((s, t) => s + t.net_profit, 0);
  accounts.push({
    account: {
      id: demoId,
      account_name: 'Demo Account',
      broker: 'Pepperstone',
      platform: 'MT4',
      account_number: '1109382',
      account_number_hash: null,
      currency: 'USD',
      initial_balance: 10000,
      current_balance: 10000 + demoNetProfit,
      equity: 10000 + demoNetProfit - 120.0,
      floating_pl: -120.0,
      leverage: 200,
      api_key: 'tl_demo_pep_38a9f20cd51a',
      last_sync_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      sync_status: 'idle',
      is_demo: true,
      created_at: startDate.toISOString(),
      updated_at: new Date().toISOString(),
    },
    trades: demoTrades,
  });

  return accounts;
}

export const DEMO_DATA = generateDemoData();
