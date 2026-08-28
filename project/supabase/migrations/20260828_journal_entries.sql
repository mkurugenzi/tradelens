create table if not exists public.journal_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.trading_accounts(id) on delete cascade,
  asset text not null,
  direction text not null check (direction in ('BUY', 'SELL')),
  date date not null,
  time time not null,
  session text not null,
  timeframe text not null,
  entry_price numeric not null default 0,
  stop_loss numeric not null default 0,
  take_profit numeric not null default 0,
  exit_price numeric not null default 0,
  position_size numeric not null default 0,
  risk_percent numeric not null default 0,
  risk_reward numeric not null default 0,
  profit_loss numeric not null default 0,
  result text not null check (result in ('win', 'loss', 'breakeven')),
  strategy text not null default '',
  setup_type text not null default '',
  market_condition text not null default '',
  screenshots jsonb not null default '[]'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  execution_rating integer not null default 3 check (execution_rating between 1 and 5),
  ai_review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_entries_user_account_date_idx on public.journal_entries (user_id, account_id, date desc);

alter table public.journal_entries enable row level security;

drop policy if exists "Users can read their journal entries" on public.journal_entries;
create policy "Users can read their journal entries" on public.journal_entries for select using (auth.uid() = user_id);

drop policy if exists "Users can create their journal entries" on public.journal_entries;
create policy "Users can create their journal entries" on public.journal_entries for insert with check (
  auth.uid() = user_id and exists (select 1 from public.trading_accounts account where account.id = account_id and account.user_id = auth.uid())
);

drop policy if exists "Users can update their journal entries" on public.journal_entries;
create policy "Users can update their journal entries" on public.journal_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their journal entries" on public.journal_entries;
create policy "Users can delete their journal entries" on public.journal_entries for delete using (auth.uid() = user_id);