import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin: any = getSupabaseAdminClient();
    const { account_id } = await req.json();
    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
    }

    // Generate crypto-secure API key
    const rawKey = `tl_live_${crypto.randomBytes(16).toString('hex')}`;

    const { data, error } = await supabaseAdmin
      .from('trading_accounts')
      .update({
        api_key: rawKey,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account_id)
      .select('id, api_key')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, api_key: data.api_key });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
