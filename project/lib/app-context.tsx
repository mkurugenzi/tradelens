'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from 'react';
import type { TradingAccount, Trade, TradeFilters } from './types';
import { DEMO_DATA } from './demo-data';
import { supabase } from './supabase';

type ViewMode = 'demo' | 'live';

interface AppContextValue {
  viewMode: ViewMode;
  isDemo: boolean;
  accounts: TradingAccount[];
  activeAccountId: string | null;
  activeAccount: TradingAccount | null;
  allAccountTrades: Map<string, Trade[]>;
  activeTrades: Trade[];
  filters: TradeFilters;
  setFilters: (filters: TradeFilters) => void;
  setActiveAccountId: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  refreshAccounts: () => Promise<void>;
  setLiveAccounts: (accounts: TradingAccount[], tradesMap: Map<string, Trade[]>) => void;
  updateTradeJournal: (tradeId: string, notes: string, tags: string[]) => Promise<void>;
}

const defaultFilters: TradeFilters = {
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
};

const AppContext = createContext<AppContextValue>({
  viewMode: 'live',
  isDemo: false,
  accounts: [],
  activeAccountId: null,
  activeAccount: null,
  allAccountTrades: new Map(),
  activeTrades: [],
  filters: defaultFilters,
  setFilters: () => {},
  setActiveAccountId: () => {},
  setViewMode: () => {},
  refreshAccounts: async () => {},
  setLiveAccounts: () => {},
  updateTradeJournal: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [liveAccounts, setLiveAccountsState] = useState<TradingAccount[]>([]);
  const [liveTradesMap, setLiveTradesMap] = useState<Map<string, Trade[]>>(new Map());
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TradeFilters>(defaultFilters);

  const isDemo = viewMode === 'demo';

  const accounts = useMemo(() => {
    if (isDemo) return DEMO_DATA.map((d) => d.account);
    return liveAccounts;
  }, [isDemo, liveAccounts]);

  const allAccountTrades = useMemo(() => {
    if (isDemo) {
      const map = new Map<string, Trade[]>();
      for (const d of DEMO_DATA) {
        map.set(d.account.id, d.trades);
      }
      return map;
    }
    return liveTradesMap;
  }, [isDemo, liveTradesMap]);

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === activeAccountId) ?? accounts[0] ?? null,
    [accounts, activeAccountId]
  );

  const activeTrades = useMemo(() => {
    if (!activeAccount) return [];
    return allAccountTrades.get(activeAccount.id) ?? [];
  }, [activeAccount, allAccountTrades]);

  const setLiveAccountsData = useCallback(
    (accs: TradingAccount[], tradesMap: Map<string, Trade[]>) => {
      setLiveAccountsState(accs);
      setLiveTradesMap(tradesMap);
    },
    []
  );

  const refreshAccounts = useCallback(async () => {
    if (isDemo) return;

    try {
      const { data: accountRows } = await supabase
        .from('trading_accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (!accountRows) return;

      const accs: TradingAccount[] = accountRows as TradingAccount[];
      const tradesMap = new Map<string, Trade[]>();

      for (const acc of accs) {
        const { data: tradeRows } = await supabase
          .from('trades')
          .select('*')
          .eq('account_id', acc.id)
          .order('close_time', { ascending: true });
        tradesMap.set(acc.id, (tradeRows as Trade[]) ?? []);
      }

      setLiveAccountsState(accs);
      setLiveTradesMap(tradesMap);

      if (accs.length > 0) {
        setActiveAccountId((prev) => {
          if (prev && accs.some((a) => a.id === prev)) return prev;
          return accs[0].id;
        });
      } else {
        setActiveAccountId(null);
      }
    } catch (err) {
      console.error('Failed to refresh accounts:', err);
    }
  }, [isDemo]);

  const updateTradeJournal = useCallback(
    async (tradeId: string, notes: string, tags: string[]) => {
      if (isDemo) {
        // Update in-memory for demo mode
        setLiveTradesMap((prev) => {
          const newMap = new Map(prev);
          for (const [accId, trades] of newMap.entries()) {
            const index = trades.findIndex((t) => t.id === tradeId);
            if (index !== -1) {
              const updatedTrades = [...trades];
              updatedTrades[index] = { ...updatedTrades[index], notes, tags, comment: notes || updatedTrades[index].comment };
              newMap.set(accId, updatedTrades);
            }
          }
          return newMap;
        });
        return;
      }

      // Update in Supabase
      try {
        await supabase
          .from('trades')
          .update({ comment: notes, notes, tags })
          .eq('id', tradeId);

        // Optimistically update local trades map
        setLiveTradesMap((prev) => {
          const newMap = new Map(prev);
          for (const [accId, trades] of newMap.entries()) {
            const index = trades.findIndex((t) => t.id === tradeId);
            if (index !== -1) {
              const updatedTrades = [...trades];
              updatedTrades[index] = { ...updatedTrades[index], notes, tags, comment: notes || updatedTrades[index].comment };
              newMap.set(accId, updatedTrades);
            }
          }
          return newMap;
        });
      } catch (err) {
        console.error('Failed to update trade journal:', err);
      }
    },
    [isDemo]
  );

  const value: AppContextValue = {
    viewMode,
    isDemo,
    accounts,
    activeAccountId,
    activeAccount,
    allAccountTrades,
    activeTrades,
    filters,
    setFilters,
    setActiveAccountId,
    setViewMode,
    refreshAccounts,
    setLiveAccounts: setLiveAccountsData,
    updateTradeJournal,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
