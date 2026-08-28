import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { HeartbeatPayload } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    const body: HeartbeatPayload = await req.json();
    const apiKey = bearerToken || body.api_key;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Missing API Key' }, { status: 401 });
    }

    const { data: account, error } = await supabaseAdmin
      .from('trading_accounts')
      .select('id, current_balance')
      .eq('api_key', apiKey)
      .maybeSingle();

    if (account) {
      await supabaseAdmin
        .from('trading_accounts')
        .update({
          equity: body.equity !== undefined ? body.equity : account.current_balance,
          current_balance: body.balance !== undefined ? body.balance : account.current_balance,
          last_sync_at: new Date().toISOString(),
          sync_status: 'connected',
        })
        .eq('id', account.id);
    }

    return NextResponse.json({
      success: true,
      status: 'online',
      server_time: new Date().toISOString(),
      account_id: account?.id || 'demo',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
