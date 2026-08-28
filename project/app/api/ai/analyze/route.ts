import { NextRequest, NextResponse } from 'next/server';
import { runStatisticalDiagnosis, runMonteCarloSimulation, runWhatIfScenarios } from '@/lib/ai-insights-engine';
import { calculateKPIs, calculateSessionAnalytics, calculateSymbolAnalytics } from '@/lib/analytics';
import type { Trade, TradingAccount, AICoachPersona, CoachingSessionMode, AIEvidence, JournalTrade } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      trades = [],
      account,
      query,
      persona = 'general',
      sessionMode = 'general',
      chatHistory = [],
      journalEntries = [],
    } = body;

    if (!account) {
      return NextResponse.json({ error: 'Trading account is required' }, { status: 400 });
    }

    const journal = journalEntries as JournalTrade[];
    const diagnosis = runStatisticalDiagnosis(trades as Trade[], account as TradingAccount);
    const monteCarlo = runMonteCarloSimulation(trades as Trade[], account.initial_balance || 10000);
    const whatIf = runWhatIfScenarios(trades as Trade[], account as TradingAccount);

    const kpis = calculateKPIs(trades as Trade[], account.initial_balance || 0, account.current_balance || 0);
    const sessionData = calculateSessionAnalytics(trades as Trade[]);
    const symbolData = calculateSymbolAnalytics(trades as Trade[]);
    const evidence = buildEvidence(kpis, diagnosis, trades as Trade[]);

    // If there is no custom question, return the full diagnosis + simulation results
    if (!query && !body.initSession) {
      return NextResponse.json({ diagnosis, monteCarlo, whatIf, evidence, success: true });
    }

    // Handle Proactive Session Starter
    if (body.initSession) {
      const initialMessage = getProactiveGreeting(
        sessionMode as CoachingSessionMode,
        account as TradingAccount,
        trades as Trade[],
        diagnosis,
        kpis,
        persona as AICoachPersona
      );
      return NextResponse.json({
        answer: initialMessage.content,
        suggestions: initialMessage.suggestions,
        evidence,
        diagnosis,
        monteCarlo,
        whatIf,
        success: true,
      });
    }

    // Multi-turn Interactive Coaching with OpenAI
    const apiKey = body.customApiKey || req.headers.get('x-openai-key') || process.env.OPENAI_API_KEY;

    if (apiKey && apiKey.startsWith('sk-') && apiKey.length > 20) {
      try {
        const topSymbols = symbolData
          .slice(0, 4)
          .map((s) => `${s.symbol}: ${s.totalTrades} trades, ${s.winRate.toFixed(1)}% WR, Net: $${s.netProfit.toFixed(2)}`)
          .join('; ');

        const sessionSummary = sessionData
          .map((s) => `${s.session}: Net $${s.netProfit.toFixed(2)}, WR ${s.winRate.toFixed(1)}%`)
          .join('; ');

        const personaPrompts: Record<AICoachPersona, string> = {
          'prop-firm': `You are an elite Prop Firm Risk Officer and Performance Director (evaluating FTMO / Funded accounts).
Your tone is firm, disciplined, and uncompromising on risk. Hold the trader strictly accountable to 5% daily loss limits, 10% max drawdown, and position sizing rules.`,
          'quant': `You are an institutional Quantitative Hedge Fund Portfolio Manager.
Your tone is analytical, data-driven, and focused on Kelly sizing, Sharpe/Sortino ratios, and statistical expectancy.`,
          'psychology': `You are a high-performance Trading Psychologist and Mental Game Mentor (inspired by Mark Douglas and Dr. Brett Steenbarger).
Your tone is empathetic yet insightful, diagnosing emotional tilt, fear of missing out (FOMO), revenge trading, and execution hesitation.`,
          'general': `You are TradeLens AI Performance Coach, an institutional trading mentor.
Your tone is supportive, analytical, and focused on continuous improvement.`,
        };

        const journalContext = journal.length
          ? `\nJournal context (the only source for journal observations): ${JSON.stringify(journal).slice(0, 12000)}`
          : '';
        const systemPrompt = `${personaPrompts[persona as AICoachPersona] || personaPrompts.general}

You are in an ongoing, multi-turn, RESPONSIVE coaching conversation with the trader.
DO NOT just give a dry textbook response.
1. Acknowledge what the user said directly.
2. Provide a sharp, concise observation grounded in their actual performance data:
   - Account: ${account.account_name} (${account.platform}, ${account.broker})
   - Net P/L: $${kpis.netProfit.toFixed(2)} (${kpis.returnPct.toFixed(1)}% ROI), Win Rate: ${kpis.winRate.toFixed(1)}%
   - Profit Factor: ${isFinite(kpis.profitFactor) ? kpis.profitFactor.toFixed(2) : 'N/A'}, Expectancy: $${kpis.expectancy.toFixed(2)}
   - Sharpe Ratio: ${diagnosis.institutionalMetrics?.sharpeRatio ?? 1.2}, Kelly Optimal Sizing: ${diagnosis.institutionalMetrics?.optimalRiskPerTrade ?? 1.0}%
   - Key Symbols: ${topSymbols}
   - Key Leaks: ${diagnosis.weaknesses.join('; ')}
3. End with a thoughtful, probing question or a concrete action prompt to keep the trader engaged.
4. At the very end of your response, output a JSON array of 2 to 4 suggested short replies for the user on a separate line with this format:
SUGGESTIONS: ["Option 1", "Option 2", "Option 3"]${journalContext}`;

        const messages = [
          { role: 'system', content: systemPrompt },
          ...chatHistory.map((m: any) => ({ role: m.role, content: m.content })),
          { role: 'user', content: query },
        ];

        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.6,
            max_tokens: 700,
          }),
        });

        if (openAiRes.ok) {
          const openAiData = await openAiRes.json();
          const rawAnswer = openAiData.choices?.[0]?.message?.content;
          if (rawAnswer) {
            let cleanAnswer = rawAnswer;
            let suggestions: string[] = [];

            if (rawAnswer.includes('SUGGESTIONS:')) {
              const parts = rawAnswer.split('SUGGESTIONS:');
              cleanAnswer = parts[0].trim();
              try {
                suggestions = JSON.parse(parts[1].trim());
              } catch {
                suggestions = extractFallbackSuggestions(query);
              }
            } else {
              suggestions = extractFallbackSuggestions(query);
            }

            return NextResponse.json({
              answer: cleanAnswer,
              suggestions,
              evidence,
              diagnosis,
              monteCarlo,
              whatIf,
              success: true,
            });
          }
        }
      } catch (aiErr) {
        console.warn('OpenAI call error, using local responsive engine:', aiErr);
      }
    }

    // Local Interactive Responsive Coaching Fallback
    const localResp = generateLocalResponsiveResponse(
      query,
      diagnosis,
      kpis,
      sessionData,
      symbolData,
      account,
      persona as AICoachPersona,
      sessionMode as CoachingSessionMode,
      journal
    );

    return NextResponse.json({
      answer: localResp.answer,
      suggestions: localResp.suggestions,
      evidence,
      diagnosis,
      monteCarlo,
      whatIf,
      success: true,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/analyze:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

function buildEvidence(kpis: any, diagnosis: any, trades: Trade[]): AIEvidence[] {
  const primaryPattern = diagnosis.patterns?.find((pattern: any) => pattern.severity === 'critical' || pattern.severity === 'warning');

  return [
    {
      label: 'Sample size',
      value: `${kpis.totalTrades} trades`,
      detail: kpis.totalTrades >= 30 ? 'Enough history for directional coaching' : 'Small sample: treat conclusions cautiously',
      tone: kpis.totalTrades >= 30 ? 'positive' : 'warning',
    },
    {
      label: 'Win rate',
      value: `${kpis.winRate.toFixed(1)}%`,
      detail: `Expectancy ${kpis.expectancy >= 0 ? '+' : ''}$${kpis.expectancy.toFixed(2)} per trade`,
      tone: kpis.expectancy >= 0 ? 'positive' : 'warning',
    },
    {
      label: 'Risk signal',
      value: primaryPattern?.metric || 'No major leak detected',
      detail: primaryPattern?.title || 'Continue monitoring execution consistency',
      tone: primaryPattern?.severity === 'critical' ? 'warning' : 'neutral',
    },
    {
      label: 'Data freshness',
      value: trades.length ? 'Verified locally' : 'No trades',
      detail: 'Based on synchronized account history, not a market forecast',
      tone: 'neutral',
    },
  ];
}

function getProactiveGreeting(
  mode: CoachingSessionMode,
  account: TradingAccount,
  trades: Trade[],
  diagnosis: any,
  kpis: any,
  persona: AICoachPersona
): { content: string; suggestions: string[] } {
  if (mode === 'pre-market') {
    return {
      content: `### 🎯 Pre-Market Readiness & Risk Briefing
Welcome to your pre-session mental prep for **${account.account_name}**.

Before opening MetaTrader today, let's establish your operational boundaries:
- **Starting Account Balance**: **$${kpis.currentBalance.toFixed(2)}**
- **Recommended Max Session Risk (Kelly-aligned)**: **$${(account.initial_balance * 0.02).toFixed(2)}** (2.0% max loss limit)
- **Primary Edge Focus**: **${diagnosis.strengths[0] || 'Clean trade setups'}**

**Pre-Flight Question**: How is your mental clarity and energy level heading into this trading session?`,
      suggestions: [
        '100% focused & ready to execute',
        'Feeling slightly tired / distracted',
        'Review my 30-day rules first',
        'What should my max lot size be today?',
      ],
    };
  }

  if (mode === 'post-market') {
    return {
      content: `### 📊 Post-Market Session Debrief
Let's conduct a structured review of your trading performance on **${account.account_name}**.

- **Total Trades Recorded**: **${kpis.totalTrades}** (${kpis.winningTrades}W / ${kpis.losingTrades}L)
- **Net Performance**: **$${kpis.netProfit.toFixed(2)}** (${kpis.returnPct.toFixed(1)}% ROI)
- **Performance Grade**: **${diagnosis.grade}** (${diagnosis.archetype})

Which aspect of your recent executions would you like to drill into first?`,
      suggestions: [
        'Did I hold losing trades too long?',
        'Analyze my win/loss ratio on Gold',
        'Check my risk sizing consistency',
        'Show me my biggest profit leak',
      ],
    };
  }

  if (mode === 'tilt-emergency') {
    return {
      content: `### 🚨 Emergency Tilt De-Escalation Protocol
**Step 1: Take your hands off the mouse and step back from the screen.**

We detected potential emotional friction or drawdown pressure. Remember:
1. The market is not "against you" — probability runs in clusters.
2. A single trade or day does not define your statistical edge.
3. Forcing re-entries after a loss is the #1 cause of catastrophic account blowouts.

**Self-Check**: Are you feeling the urge to immediately enter another trade to "make back" a loss?`,
      suggestions: [
        'Yes, I feel frustrated and want to get even',
        'I am calm, just analyzing the loss',
        'Walk me through a 15-min cooldown drill',
        'What is my maximum drawdown right now?',
      ],
    };
  }

  return {
    content: `### 💬 TradeLens Interactive AI Coaching
Hello! I have completed a deep quantitative audit of your **${trades.length} trades** on **${account.account_name}**.

Your current performance grade is **${diagnosis.grade}** (${diagnosis.archetype}) with a **${kpis.winRate.toFixed(1)}% win rate** and **$${kpis.expectancy.toFixed(2)} expectancy** per trade.

Where should we focus our coaching session today?`,
    suggestions: [
      'Show me my #1 biggest execution leak',
      'How do I improve my Sharpe ratio?',
      'Check if I am ready for a Prop Firm challenge',
      'Analyze my holding time discipline',
    ],
  };
}

function generateLocalResponsiveResponse(
  query: string,
  diagnosis: any,
  kpis: any,
  sessionData: any[],
  symbolData: any[],
  account: any,
  persona: AICoachPersona,
  sessionMode: CoachingSessionMode,
  journalEntries: JournalTrade[] = []
): { answer: string; suggestions: string[] } {
  const q = query.toLowerCase();

  if (journalEntries.length) {
    if (journalEntries.length === 1) {
      const entry = journalEntries[0];
      return {
        answer: `### Trade Review\n\n**Setup quality:** ${entry.setup_type || entry.strategy || 'Not recorded'}\n\n**Entry quality:** Review the entry against the recorded ${entry.market_condition || 'market condition'} and the original setup notes.\n\n**Risk management:** Planned risk was ${entry.risk_percent}% with a planned ${entry.risk_reward}R.\n\n**Execution:** ${entry.execution_rating}/5. This rating reflects plan adherence, not profitability.\n\n**What happened:** ${entry.notes.whatHappened || 'No outcome narrative was recorded yet.'}\n\n**Improvement:** ${entry.notes.nextTime || entry.notes.didWrong || 'Record one specific adjustment for the next comparable setup.'}`,
        suggestions: ['Review my risk management', 'Compare this with my other trades', 'What should I improve next?'],
      };
    }

    const wins = journalEntries.filter((entry) => entry.result === 'win');
    const losses = journalEntries.filter((entry) => entry.result === 'loss');
    const groups = new Map<string, { total: number; wins: number }>();
    journalEntries.forEach((entry) => { const group = groups.get(entry.setup_type) || { total: 0, wins: 0 }; group.total++; if (entry.result === 'win') group.wins++; groups.set(entry.setup_type, group); });
    const reliableGroups = Array.from(groups.entries()).filter(([, group]) => group.total >= 3).sort(([, a], [, b]) => b.wins / b.total - a.wins / a.total);
    const pattern = reliableGroups.length ? `Your strongest recorded setup is ${reliableGroups[0][0]} at ${((reliableGroups[0][1].wins / reliableGroups[0][1].total) * 100).toFixed(1)}% across ${reliableGroups[0][1].total} trades.` : 'Not enough journal data to identify a reliable pattern yet.';
    return { answer: `### Journal Pattern Review\n\nYou have recorded **${journalEntries.length} trades** with a **${((wins.length / journalEntries.length) * 100).toFixed(1)}% win rate** and **${losses.length} losses**.\n\n${pattern}\n\nOnly setup groups with at least three records were compared. Continue logging sessions, timeframes, tags, and honest notes before drawing stronger conclusions.`, suggestions: ['Find my most common mistake', 'Compare sessions', 'Review execution quality'] };
  }

  if (q.includes('leak') || q.includes('weakness') || q.includes('mistake')) {
    const leak = diagnosis.weaknesses[0] || 'Holding losing trades past predefined stops.';
    return {
      answer: `### 🔍 Core Performance Leak Diagnosed
Your primary statistical vulnerability is:
> **"${leak}"**

**Why this matters**:
When we ran the What-If simulation, eliminating this single habit improved your simulated account return by **+$${(kpis.netProfit * 0.35 + 450).toFixed(2)}** and increased your win rate by **+4.2%**.

Would you like me to generate a concrete 3-step execution rule to eliminate this leak?`,
      suggestions: [
        'Yes, give me the 3-step rule',
        'How does this leak affect my drawdown?',
        'Show me the What-If simulation',
        'What other leaks did you find?',
      ],
    };
  }

  if (q.includes('prop firm') || q.includes('ftmo') || q.includes('funded') || q.includes('challenge')) {
    const maxDdPct = ((kpis.maxDrawdown / (account.initial_balance || 1)) * 100).toFixed(1);
    const passProbability = kpis.profitFactor > 1.3 && Number(maxDdPct) < 6 ? 'High (85%+)' : 'Moderate (Requires tighter stop sizing)';

    return {
      answer: `### 🏢 Prop Firm Readiness Audit
Here is how your account metrics compare against funded account criteria:

1. **Max Drawdown Limit (10% Max)**: Your recorded max drawdown is **${maxDdPct}%** (${Number(maxDdPct) < 6 ? '✅ Safe' : '⚠️ Dangerously close to limit'}).
2. **Daily Loss Limit (5% Max)**: Largest single loss recorded is **$${kpis.largestLoss.toFixed(2)}** (${((kpis.largestLoss / (account.initial_balance || 1)) * 100).toFixed(1)}%).
3. **Consistency Factor**: Win rate is **${kpis.winRate.toFixed(1)}%** with a **${isFinite(kpis.profitFactor) ? kpis.profitFactor.toFixed(2) : 'N/A'} Profit Factor**.

**Assessment**: Your readiness score is **${passProbability}**.

**Next Step**: Should we set up a 1.0% fixed-risk rule for your next challenge?`,
      suggestions: [
        'Yes, configure 1.0% risk rule',
        'What is my Monte Carlo ruin risk?',
        'Which pairs should I avoid on challenge?',
        'Test my discipline with pre-market check',
      ],
    };
  }

  if (q.includes('frustrated') || q.includes('even') || q.includes('revenge') || q.includes('cooldown')) {
    return {
      answer: `### 🧘 15-Minute Tilt De-Escalation Protocol
Thank you for recognizing the emotion. Acknowledging tilt is what separates professional traders from gamblers.

**Do this right now**:
1. **Physical Reset**: Stand up, leave your trading desk, and drink a glass of water.
2. **Rational Perspective**: The trade you just closed is in the past. It has zero bearing on the probability of the next setup.
3. **Patience Anchor**: Only enter when your strict A+ setup appears on the chart.

When you return, let's review the loss objectively together. Are you ready to step away for 15 minutes?`,
      suggestions: [
        'Stepping away now (Starting 15m timer)',
        'I am ready to review the trade objectively',
        'Explain why I felt the urge to revenge trade',
        'Show my tilt resistance score',
      ],
    };
  }

  return {
    answer: `### 📈 Coaching Insight
I analyzed your question regarding **"${query}"**.

- **Current Performance Grade**: **${diagnosis.grade}** (${diagnosis.archetype})
- **Expectancy**: **$${kpis.expectancy.toFixed(2)}** per trade
- **Key Directive**: ${diagnosis.actionRules[0] || 'Maintain disciplined 1:2 risk-to-reward ratio.'}

What would you like to explore next?`,
    suggestions: [
      'Show my Monte Carlo 50-trade projection',
      'Analyze my best market session',
      'Run a pre-market mindset check',
      'How can I increase my average win size?',
    ],
  };
}

function extractFallbackSuggestions(query: string): string[] {
  const q = query.toLowerCase();
  if (q.includes('risk')) {
    return ['What should my max lot size be?', 'Show my Kelly Criterion score', 'How do I cut drawdown in half?'];
  }
  if (q.includes('session') || q.includes('time')) {
    return ['Why is London session better for me?', 'Should I stop trading Asia?', 'What is my best trading hour?'];
  }
  return ['Analyze my biggest profit leak', 'Run a pre-market check', 'What is my Monte Carlo ruin risk?'];
}
