'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import type { TradingAccount, Trade, TradeFilters } from './types';
import { DEMO_DATA } from './demo-data';

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
    () => accounts.find((a) => a.id === activeAccountId) ?? null,
    [accounts, activeAccountId]
  );

  const activeTrades = useMemo(() => {
    if (!activeAccountId) return [];
    return allAccountTrades.get(activeAccountId) ?? [];
  }, [activeAccountId, allAccountTrades]);

  const setLiveAccountsData = useCallback(
    (accs: TradingAccount[], tradesMap: Map<string, Trade[]>) => {
      setLiveAccountsState(accs);
      setLiveTradesMap(tradesMap);
    },
    []
  );

  const refreshAccounts = useCallback(async () => {
    // This will be called by the dashboard to reload from Supabase
    // The actual fetch happens in the dashboard component
  }, []);

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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
