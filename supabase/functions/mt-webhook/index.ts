import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TradePayload {
  ticket: string;
  symbol: string;
  trade_type: string;
  volume: number;
  open_time: string;
  close_time: string;
  open_price: number;
  close_price: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  profit: number;
  commission: number;
  swap: number;
  comment?: string | null;
  magic_number?: number | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, trades } = body as { token: string; trades: TradePayload[] };

    if (!token || !trades || !Array.isArray(trades)) {
      return new Response(
        JSON.stringify({ error: "Missing token or trades array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up the connection token
    const { data: tokenRow, error: tokenError } = await supabase
      .from("connection_tokens")
      .select("account_id, status, platform")
      .eq("token", token)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "Invalid connection token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tokenRow.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Connection token has been revoked" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountId = tokenRow.account_id;

    // Process trades: compute derived fields and upsert
    const processedTrades = trades.map((t) => {
      const openTime = new Date(t.open_time);
      const closeTime = new Date(t.close_time);
      const durationMin = Math.max(0, Math.round((closeTime.getTime() - openTime.getTime()) / 60000));
      const netProfit = t.profit + t.commission + t.swap;

      return {
        account_id: accountId,
        ticket: String(t.ticket),
        symbol: t.symbol,
        trade_type: (t.trade_type || "BUY").toUpperCase().startsWith("S") ? "SELL" : "BUY",
        volume: Number(t.volume) || 0,
        open_time: openTime.toISOString(),
        close_time: closeTime.toISOString(),
        open_price: Number(t.open_price) || 0,
        close_price: Number(t.close_price) || 0,
        stop_loss: t.stop_loss != null ? Number(t.stop_loss) : null,
        take_profit: t.take_profit != null ? Number(t.take_profit) : null,
        profit: Number(t.profit) || 0,
        commission: Number(t.commission) || 0,
        swap: Number(t.swap) || 0,
        net_profit: netProfit,
        comment: t.comment ?? null,
        magic_number: t.magic_number != null ? Number(t.magic_number) : null,
        duration_minutes: durationMin,
      };
    });

    // Upsert trades (skip duplicates by ticket)
    const { data: upserted, error: upsertError } = await supabase
      .from("trades")
      .upsert(processedTrades, { onConflict: "account_id,ticket", ignoreDuplicates: true })
      .select("id");

    let insertedCount = upserted?.length ?? 0;

    if (upsertError) {
      // If it's a unique violation, try inserting one by one
      if (upsertError.code === "23505") {
        for (const trade of processedTrades) {
          const { error: singleError } = await supabase.from("trades").insert(trade);
          if (!singleError) insertedCount++;
        }
      } else {
        return new Response(
          JSON.stringify({ error: upsertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update last_sync_at on the token
    await supabase
      .from("connection_tokens")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", tokenRow.account_id);

    // Update account current_balance
    const { data: account } = await supabase
      .from("trading_accounts")
      .select("initial_balance")
      .eq("id", accountId)
      .maybeSingle();

    if (account) {
      const { data: allTrades } = await supabase
        .from("trades")
        .select("net_profit")
        .eq("account_id", accountId);

      if (allTrades) {
        const newBalance = account.initial_balance + allTrades.reduce((s, t) => s + t.net_profit, 0);
        await supabase
          .from("trading_accounts")
          .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
          .eq("id", accountId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        received: trades.length,
        imported: insertedCount,
        duplicates: trades.length - insertedCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
