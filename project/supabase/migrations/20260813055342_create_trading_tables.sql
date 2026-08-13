/*
# Create TradeLens core tables

Creates the multi-tenant schema for TradeLens: trading accounts, trades,
import jobs, and column mappings. All tables are owner-scoped via auth.uid()
with full CRUD RLS policies.

1. New Tables
- `trading_accounts`: Each user's trading accounts (name, broker, platform, balances)
- `trades`: Individual trade records belonging to an account
- `import_jobs`: CSV import history and status tracking
- `column_mappings`: Saved per-broker CSV column mappings for reuse

2. Security
- RLS enabled on all tables
- Owner-scoped policies: users can only CRUD their own data
- Child tables (trades, import_jobs) scoped through parent account ownership
- user_id defaults to auth.uid() on trading_accounts and column_mappings
*/

-- trading_accounts
CREATE TABLE IF NOT EXISTS trading_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  broker text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT 'MT5',
  account_number_hash text,
  currency text NOT NULL DEFAULT 'USD',
  initial_balance numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_accounts" ON trading_accounts;
CREATE POLICY "select_own_accounts" ON trading_accounts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_accounts" ON trading_accounts;
CREATE POLICY "insert_own_accounts" ON trading_accounts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_accounts" ON trading_accounts;
CREATE POLICY "update_own_accounts" ON trading_accounts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_accounts" ON trading_accounts;
CREATE POLICY "delete_own_accounts" ON trading_accounts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- trades
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  ticket text NOT NULL,
  symbol text NOT NULL,
  trade_type text NOT NULL DEFAULT 'BUY',
  volume numeric NOT NULL DEFAULT 0,
  open_time timestamptz NOT NULL,
  close_time timestamptz NOT NULL,
  open_price numeric NOT NULL DEFAULT 0,
  close_price numeric NOT NULL DEFAULT 0,
  stop_loss numeric,
  take_profit numeric,
  profit numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  swap numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  comment text,
  magic_number integer,
  duration_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, ticket)
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_trades" ON trades;
CREATE POLICY "select_own_trades" ON trades FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = trades.account_id AND trading_accounts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_trades" ON trades;
CREATE POLICY "insert_own_trades" ON trades FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = trades.account_id AND trading_accounts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_trades" ON trades;
CREATE POLICY "update_own_trades" ON trades FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = trades.account_id AND trading_accounts.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = trades.account_id AND trading_accounts.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_trades" ON trades;
CREATE POLICY "delete_own_trades" ON trades FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = trades.account_id AND trading_accounts.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_close_time ON trades(close_time);
CREATE INDEX IF NOT EXISTS idx_trades_ticket ON trades(ticket);

-- import_jobs
CREATE TABLE IF NOT EXISTS import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  filename text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_rows integer NOT NULL DEFAULT 0,
  successful_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  error_log jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_import_jobs" ON import_jobs;
CREATE POLICY "select_own_import_jobs" ON import_jobs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = import_jobs.account_id AND trading_accounts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_import_jobs" ON import_jobs;
CREATE POLICY "insert_own_import_jobs" ON import_jobs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = import_jobs.account_id AND trading_accounts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_import_jobs" ON import_jobs;
CREATE POLICY "update_own_import_jobs" ON import_jobs FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = import_jobs.account_id AND trading_accounts.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = import_jobs.account_id AND trading_accounts.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_import_jobs" ON import_jobs;
CREATE POLICY "delete_own_import_jobs" ON import_jobs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = import_jobs.account_id AND trading_accounts.user_id = auth.uid())
  );

-- column_mappings
CREATE TABLE IF NOT EXISTS column_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  broker text NOT NULL,
  platform text NOT NULL DEFAULT 'MT5',
  mapping jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE column_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_mappings" ON column_mappings;
CREATE POLICY "select_own_mappings" ON column_mappings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_mappings" ON column_mappings;
CREATE POLICY "insert_own_mappings" ON column_mappings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_mappings" ON column_mappings;
CREATE POLICY "update_own_mappings" ON column_mappings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_mappings" ON column_mappings;
CREATE POLICY "delete_own_mappings" ON column_mappings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
