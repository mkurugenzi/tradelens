import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import type { IncomingTradePayload, SyncPayload, SyncResponse, TradeDirection } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin: any = getSupabaseAdminClient();
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    const body: SyncPayload = await req.json();
    const apiKey = bearerToken || body.api_key;

    if (!apiKey) {
      return NextResponse.json<SyncResponse>(
        { success: false, message: 'Missing API Key in Authorization header or payload', error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Lookup account by API key
    const { data: account, error: acctErr } = await supabaseAdmin
      .from('trading_accounts')
      .select('*')
      .eq('api_key', apiKey)
      .maybeSingle();

    let accountId = account?.id;
    let initialBalance = account?.initial_balance || 10000;

    // Support simulated/demo keys
    if (!account) {
      if (apiKey.startsWith('demo-key-') || apiKey.startsWith('tl_demo_') || apiKey.startsWith('test-key')) {
        accountId = 'demo-acct-1';
      } else {
        return NextResponse.json<SyncResponse>(
          { success: false, message: 'Invalid or revoked API Key', error: 'INVALID_API_KEY' },
          { status: 401 }
        );
      }
    }

    const incomingTrades = body.trades || [];
    let syncedCount = 0;
    let duplicateCount = 0;

    if (incomingTrades.length > 0 && accountId && account) {
      const recordsToInsert = incomingTrades.map((t) => {
        const openDate = parseMetaTraderDate(t.open_time);
        const closeDate = parseMetaTraderDate(t.close_time);
        const durationMinutes = Math.max(
          1,
          Math.round((closeDate.getTime() - openDate.getTime()) / (1000 * 60))
        );

        const commission = t.commission || 0;
        const swap = t.swap || 0;
        const profit = t.profit || 0;
        const netProfit = t.net_profit !== undefined ? t.net_profit : profit + commission + swap;

        return {
          account_id: accountId,
          ticket: String(t.ticket),
          symbol: String(t.symbol).toUpperCase().trim(),
          trade_type: (String(t.trade_type).toUpperCase().includes('BUY') || String(t.trade_type) === '0') ? 'BUY' : 'SELL',
          volume: Number(t.volume) || 0.01,
          open_time: openDate.toISOString(),
          close_time: closeDate.toISOString(),
          open_price: Number(t.open_price) || 0,
          close_price: Number(t.close_price) || 0,
          stop_loss: t.stop_loss ? Number(t.stop_loss) : null,
          take_profit: t.take_profit ? Number(t.take_profit) : null,
          profit,
          commission,
          swap,
          net_profit: netProfit,
          comment: t.comment || null,
          magic_number: t.magic_number ? Number(t.magic_number) : null,
          duration_minutes: durationMinutes,
        };
      });

      // Upsert trades into database
      const { data: upsertData, error: upsertErr } = await supabaseAdmin
        .from('trades')
        .upsert(recordsToInsert, { onConflict: 'account_id,ticket', ignoreDuplicates: true })
        .select('id');

      if (upsertErr) {
        console.error('Failed to upsert trades:', upsertErr);
      } else {
        syncedCount = upsertData?.length || 0;
        duplicateCount = recordsToInsert.length - syncedCount;
      }

      // Update account balance & sync health
      const newBalance = body.current_balance !== undefined ? body.current_balance : account.current_balance;
      const newEquity = body.equity !== undefined ? body.equity : newBalance;

      await supabaseAdmin
        .from('trading_accounts')
        .update({
          current_balance: newBalance,
          equity: newEquity,
          last_sync_at: new Date().toISOString(),
          sync_status: 'connected',
          broker: body.broker || account.broker,
          platform: body.platform || account.platform,
          account_number: body.account_number || account.account_number,
        })
        .eq('id', accountId);

      // Log sync event
      await supabaseAdmin.from('sync_logs').insert({
        account_id: accountId,
        event_type: 'trade_sync',
        trades_count: syncedCount,
        status: 'success',
        details: `Synced ${syncedCount} new trades from ${body.platform || 'MT5'} terminal`,
      });
    }

    return NextResponse.json<SyncResponse>({
      success: true,
      message: `Successfully processed ${incomingTrades.length} trades (${syncedCount} synced, ${duplicateCount} duplicates)`,
      account_id: accountId,
      synced_count: syncedCount,
      duplicate_count: duplicateCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Sync Error:', err);
    return NextResponse.json<SyncResponse>(
      { success: false, message: 'Internal Server Error', error: err.message },
      { status: 500 }
    );
  }
}

// Helper to parse dates from MT4/MT5 format e.g. "2026.08.14 14:30:00" or ISO
function parseMetaTraderDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('T') || dateStr.includes('Z')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }
  // MT4/MT5 format: YYYY.MM.DD HH:MM:SS
  const cleaned = dateStr.replace(/\./g, '-').replace(' ', 'T') + 'Z';
  const parsed = new Date(cleaned);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}
