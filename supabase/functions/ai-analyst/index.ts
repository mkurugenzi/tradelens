import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TradeSummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  expectancy: number;
  maxDrawdown: number;
  averageDuration: number;
}

interface SymbolPerf {
  symbol: string;
  trades: number;
  winRate: number;
  netProfit: number;
}

interface SessionPerf {
  session: string;
  trades: number;
  netProfit: number;
  winRate: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { accountId } = await req.json();

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: "Missing accountId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured. Please add the OPENAI_API_KEY secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all trades for this account
    const { data: trades, error: tradesError } = await supabase
      .from("trades")
      .select("*")
      .eq("account_id", accountId)
      .order("close_time", { ascending: true });

    if (tradesError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch trades" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!trades || trades.length === 0) {
      return new Response(
        JSON.stringify({ error: "No trades found for this account. Import trades first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch account info
    const { data: account } = await supabase
      .from("trading_accounts")
      .select("initial_balance, current_balance, currency, account_name")
      .eq("id", accountId)
      .maybeSingle();

    // Compute summary statistics
    const wins = trades.filter((t: any) => t.net_profit > 0);
    const losses = trades.filter((t: any) => t.net_profit < 0);
    const grossProfit = wins.reduce((s: number, t: any) => s + t.net_profit, 0);
    const grossLoss = Math.abs(losses.reduce((s: number, t: any) => s + t.net_profit, 0));
    const netProfit = trades.reduce((s: number, t: any) => s + t.net_profit, 0);

    // Consecutive wins/losses
    let maxConsecWins = 0, maxConsecLosses = 0, curWins = 0, curLosses = 0;
    for (const t of trades) {
      if ((t as any).net_profit > 0) { curWins++; curLosses = 0; maxConsecWins = Math.max(maxConsecWins, curWins); }
      else if ((t as any).net_profit < 0) { curLosses++; curWins = 0; maxConsecLosses = Math.max(maxConsecLosses, curLosses); }
      else { curWins = 0; curLosses = 0; }
    }

    // Max drawdown
    let peak = account?.initial_balance ?? 0;
    let maxDD = 0;
    let runningBalance = peak;
    for (const t of trades) {
      runningBalance += (t as any).net_profit;
      peak = Math.max(peak, runningBalance);
      const dd = peak - runningBalance;
      maxDD = Math.max(maxDD, dd);
    }

    // Per-symbol stats
    const symbolMap = new Map<string, any>();
    for (const t of trades) {
      const sym = (t as any).symbol;
      if (!symbolMap.has(sym)) symbolMap.set(sym, { symbol: sym, trades: 0, wins: 0, netProfit: 0 });
      const s = symbolMap.get(sym);
      s.trades++;
      s.netProfit += (t as any).net_profit;
      if ((t as any).net_profit > 0) s.wins++;
    }
    const symbolStats: SymbolPerf[] = Array.from(symbolMap.values()).map((s) => ({
      symbol: s.symbol,
      trades: s.trades,
      winRate: (s.wins / s.trades) * 100,
      netProfit: s.netProfit,
    })).sort((a, b) => b.netProfit - a.netProfit);

    // Per-session stats (simplified: London 7-16 UTC, NY 12-21 UTC, Asian 23-8 UTC, overlap 12-16)
    const sessionMap = new Map<string, any>();
    for (const t of trades) {
      const hour = new Date((t as any).open_time).getUTCHours();
      let session = "Other";
      if (hour >= 7 && hour < 12) session = "London";
      else if (hour >= 12 && hour < 16) session = "London/NY Overlap";
      else if (hour >= 16 && hour < 21) session = "New York";
      else session = "Asian";
      if (!sessionMap.has(session)) sessionMap.set(session, { session, trades: 0, wins: 0, netProfit: 0 });
      const s = sessionMap.get(session);
      s.trades++;
      s.netProfit += (t as any).net_profit;
      if ((t as any).net_profit > 0) s.wins++;
    }
    const sessionStats: SessionPerf[] = Array.from(sessionMap.values()).map((s) => ({
      session: s.session,
      trades: s.trades,
      netProfit: s.netProfit,
      winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0,
    })).sort((a, b) => b.netProfit - a.netProfit);

    // Day of week stats
    const dayMap = new Map<string, any>();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (const t of trades) {
      const dayIdx = new Date((t as any).close_time).getUTCDay();
      const day = dayNames[dayIdx];
      if (!dayMap.has(day)) dayMap.set(day, { day, trades: 0, wins: 0, netProfit: 0 });
      const d = dayMap.get(day);
      d.trades++;
      d.netProfit += (t as any).net_profit;
      if ((t as any).net_profit > 0) d.wins++;
    }
    const dayStats = Array.from(dayMap.values()).map((d) => ({
      day: d.day,
      trades: d.trades,
      netProfit: d.netProfit,
      winRate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0,
    })).sort((a, b) => b.netProfit - a.netProfit);

    const summary: TradeSummary = {
      totalTrades: trades.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      netProfit,
      grossProfit,
      grossLoss,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0,
      averageWin: wins.length > 0 ? grossProfit / wins.length : 0,
      averageLoss: losses.length > 0 ? grossLoss / losses.length : 0,
      largestWin: wins.length > 0 ? Math.max(...wins.map((t: any) => t.net_profit)) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map((t: any) => t.net_profit)) : 0,
      maxConsecutiveWins: maxConsecWins,
      maxConsecutiveLosses: maxConsecLosses,
      expectancy: trades.length > 0 ? netProfit / trades.length : 0,
      maxDrawdown: maxDD,
      averageDuration: trades.length > 0 ? trades.reduce((s: number, t: any) => s + t.duration_minutes, 0) / trades.length : 0,
    };

    // Build the prompt
    const systemPrompt = `You are a trading performance analyst. You analyze a trader's historical trade data and provide insights.

CRITICAL RULES:
1. Distinguish between OBSERVED STATISTICS (factual data from the trade history), POSSIBLE PATTERNS (correlations that may or may not be meaningful), and GENERAL GUIDANCE (established trading principles).
2. NEVER present uncertain patterns as guaranteed conclusions.
3. NEVER give specific trade recommendations (don't say "buy EUR/USD at 1.05"). Instead, discuss behavioral patterns.
4. Use clear headers and bullet points.
5. Be honest about weaknesses — don't sugarcoat losses.
6. Keep it concise and actionable. Maximum 600 words.
7. Format your response in Markdown.

Structure your analysis as:
## Observed Statistics
(Factual summary of key metrics)

## Possible Patterns
(Noticed correlations, labeled as observations not guarantees)

## General Guidance
(Educational suggestions based on established principles)`;

    const userPrompt = `Analyze the following trading performance data:

Account: ${account?.account_name ?? "Unknown"}
Initial Balance: ${account?.initial_balance ?? 0} ${account?.currency ?? "USD"}
Current Balance: ${account?.current_balance ?? 0} ${account?.currency ?? "USD"}

## Summary Statistics
- Total Trades: ${summary.totalTrades}
- Winning Trades: ${summary.winningTrades} (${summary.winRate.toFixed(1)}% win rate)
- Losing Trades: ${summary.losingTrades}
- Net Profit: ${summary.netProfit.toFixed(2)} ${account?.currency ?? "USD"}
- Gross Profit: ${summary.grossProfit.toFixed(2)}
- Gross Loss: ${summary.grossLoss.toFixed(2)}
- Profit Factor: ${summary.profitFactor === 999 ? "Infinity" : summary.profitFactor.toFixed(2)}
- Average Win: ${summary.averageWin.toFixed(2)}
- Average Loss: ${summary.averageLoss.toFixed(2)}
- Largest Win: ${summary.largestWin.toFixed(2)}
- Largest Loss: ${summary.largestLoss.toFixed(2)}
- Max Consecutive Wins: ${summary.maxConsecutiveWins}
- Max Consecutive Losses: ${summary.maxConsecutiveLosses}
- Expectancy per Trade: ${summary.expectancy.toFixed(2)}
- Max Drawdown: ${summary.maxDrawdown.toFixed(2)}
- Average Trade Duration: ${summary.averageDuration.toFixed(0)} minutes

## Performance by Symbol
${symbolStats.map((s) => `- ${s.symbol}: ${s.trades} trades, ${s.winRate.toFixed(1)}% win rate, ${s.netProfit.toFixed(2)} net profit`).join("\n")}

## Performance by Trading Session
${sessionStats.map((s) => `- ${s.session}: ${s.trades} trades, ${s.winRate.toFixed(1)}% win rate, ${s.netProfit.toFixed(2)} net profit`).join("\n")}

## Performance by Day of Week
${dayStats.map((d) => `- ${d.day}: ${d.trades} trades, ${d.winRate.toFixed(1)}% win rate, ${d.netProfit.toFixed(2)} net profit`).join("\n")}`;

    // Call OpenAI
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${openaiResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const analysis = openaiData.choices?.[0]?.message?.content ?? "No analysis generated.";

    return new Response(
      JSON.stringify({ analysis, stats: summary, symbols: symbolStats, sessions: sessionStats, days: dayStats }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
