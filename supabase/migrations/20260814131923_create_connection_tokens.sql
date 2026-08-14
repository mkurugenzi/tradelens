/*
# Create connection_tokens table

Stores unique tokens for linking MetaTrader terminals to TradeLens accounts.
Each trading account can have one active connection token. The Expert Advisor
script uses this token to authenticate when pushing trade data to the webhook.

1. New Tables
- `connection_tokens`
  - `id` (uuid, primary key)
  - `account_id` (uuid, FK to trading_accounts, unique — one token per account)
  - `token` (text, unique — the secret the EA uses to authenticate)
  - `status` (text: 'active' or 'revoked')
  - `platform` (text: 'MT4' or 'MT5')
  - `last_sync_at` (timestamp — last time the EA pushed data)
  - `created_at` (timestamp)

2. Security
- RLS enabled
- Owner-scoped through trading_accounts ownership
- Only the account owner can create/view/revoke tokens
*/

CREATE TABLE IF NOT EXISTS connection_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES trading_accounts(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  platform text NOT NULL DEFAULT 'MT5',
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE connection_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tokens" ON connection_tokens;
CREATE POLICY "select_own_tokens" ON connection_tokens FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = connection_tokens.account_id AND trading_accounts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_tokens" ON connection_tokens;
CREATE POLICY "insert_own_tokens" ON connection_tokens FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = connection_tokens.account_id AND trading_accounts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_tokens" ON connection_tokens;
CREATE POLICY "update_own_tokens" ON connection_tokens FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = connection_tokens.account_id AND trading_accounts.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = connection_tokens.account_id AND trading_accounts.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_tokens" ON connection_tokens;
CREATE POLICY "delete_own_tokens" ON connection_tokens FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trading_accounts WHERE trading_accounts.id = connection_tokens.account_id AND trading_accounts.user_id = auth.uid())
  );
