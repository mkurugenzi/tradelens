import type {
  Trade,
  TradingAccount,
  TraderDiagnosis,
  PatternObservation,
  PatternSeverity,
  InstitutionalMetrics,
  MonteCarloResult,
  MonteCarloPoint,
  WhatIfScenario,
} from './types';
import { calculateKPIs, calculateSessionAnalytics, calculateSymbolAnalytics, calculateDayOfWeekAnalytics } from './analytics';

export function runStatisticalDiagnosis(trades: Trade[], account: TradingAccount): TraderDiagnosis {
  if (!trades || trades.length === 0) {
    return getEmptyDiagnosis(account);
  }

  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.close_time).getTime() - new Date(b.close_time).getTime()
  );

  const kpis = calculateKPIs(sortedTrades, account.initial_balance, account.current_balance);
  const sessionData = calculateSessionAnalytics(sortedTrades);
  const symbolData = calculateSymbolAnalytics(sortedTrades);
  const dayData = calculateDayOfWeekAnalytics(sortedTrades);

  const patterns: PatternObservation[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const actionRules: string[] = [];

  // 1. REVENGE TRADING & TILT ANALYSIS
  let revengeInstances = 0;
  let revengeLossSum = 0;
  for (let i = 1; i < sortedTrades.length; i++) {
    const prev = sortedTrades[i - 1];
    const curr = sortedTrades[i];
    if (prev.net_profit < 0) {
      const prevClose = new Date(prev.close_time).getTime();
      const currOpen = new Date(curr.open_time).getTime();
      const diffMinutes = (currOpen - prevClose) / (1000 * 60);

      // Opened within 20 mins of a loss with equal or higher lot
      if (diffMinutes >= 0 && diffMinutes <= 20 && curr.volume >= prev.volume) {
        revengeInstances++;
        if (curr.net_profit < 0) {
          revengeLossSum += Math.abs(curr.net_profit);
        }
      }
    }
  }

  if (revengeInstances >= 3) {
    patterns.push({
      id: 'revenge-trading',
      title: 'Potential Revenge Trading Detected',
      description: `${revengeInstances} trades were initiated within 20 minutes of closing a loss, often with elevated sizing, accounting for $${revengeLossSum.toFixed(2)} in subsequent loss leakage.`,
      metric: `${revengeInstances} rapid re-entries`,
      severity: 'critical',
      category: 'psychology',
      actionTip: 'Implement a mandatory 30-minute cool-down timer after any stopped-out position.',
    });
    weaknesses.push('Emotional re-entries: high tendency to take revenge trades immediately after a losing trade.');
    actionRules.push('Mandatory 30-minute cool-down rule: walk away from the screen after closing a losing trade.');
  } else {
    patterns.push({
      id: 'tilt-control',
      title: 'High Emotional Discipline Post-Loss',
      description: 'You maintain patience and avoid chasing the market after suffering losses.',
      metric: 'Minimal rapid re-entries',
      severity: 'positive',
      category: 'psychology',
      actionTip: 'Continue maintaining strict execution pacing after stop-outs.',
    });
    strengths.push('Excellent psychological composure: does not revenge trade after losses.');
  }

  // 2. HOLD-TIME ASYMMETRY (DISPOSITION EFFECT)
  const winningTrades = sortedTrades.filter((t) => t.net_profit > 0);
  const losingTrades = sortedTrades.filter((t) => t.net_profit < 0);

  const avgWinDuration = winningTrades.length
    ? winningTrades.reduce((sum, t) => sum + (t.duration_minutes || 1), 0) / winningTrades.length
    : 1;
  const avgLossDuration = losingTrades.length
    ? losingTrades.reduce((sum, t) => sum + (t.duration_minutes || 1), 0) / losingTrades.length
    : 1;

  const durationRatio = avgLossDuration / (avgWinDuration || 1);

  if (durationRatio > 2.0 && losingTrades.length > 4) {
    patterns.push({
      id: 'hold-time-asymmetry',
      title: 'Holding Losers Significantly Longer than Winners',
      description: `Losing trades are held for an average of ${Math.round(avgLossDuration)}m vs only ${Math.round(avgWinDuration)}m for winners (${durationRatio.toFixed(1)}x ratio). This indicates cutting winners early while hoping losers recover.`,
      metric: `${durationRatio.toFixed(1)}x hold ratio`,
      severity: 'critical',
      category: 'execution',
      actionTip: 'Predefine hard stop-losses and let winning trends run to predetermined targets.',
    });
    weaknesses.push(`Loss aversion bias: holding losing positions ${durationRatio.toFixed(1)}x longer than winning trades.`);
    actionRules.push('Set hard Stop Loss at entry and never widen or remove it during open floating drawdown.');
  } else if (durationRatio <= 1.2 && winningTrades.length > 4) {
    patterns.push({
      id: 'optimal-holding',
      title: 'Symmetrical & Disciplined Trade Duration',
      description: 'You cut losses promptly without allowing drawdown positions to linger indefinitely.',
      metric: `${durationRatio.toFixed(1)}x ratio`,
      severity: 'positive',
      category: 'execution',
      actionTip: 'Keep locking in risk and trimming on target.',
    });
    strengths.push('Disciplined trade management: fast stop-loss execution with patient target holding.');
  }

  // 3. SESSION BIAS & EFFICIENCY
  const validSessions = sessionData.filter((s) => s.trades >= 3);
  if (validSessions.length > 1) {
    const sortedByProfit = [...validSessions].sort((a, b) => b.netProfit - a.netProfit);
    const bestSession = sortedByProfit[0];
    const worstSession = sortedByProfit[sortedByProfit.length - 1];

    if (bestSession.netProfit > 0 && worstSession.netProfit < 0) {
      patterns.push({
        id: 'session-divergence',
        title: `Distinct Session Edge: ${bestSession.session}`,
        description: `Your ${bestSession.session} session generated $${bestSession.netProfit.toFixed(2)} (${bestSession.winRate.toFixed(1)}% WR), whereas ${worstSession.session} lost $${Math.abs(worstSession.netProfit).toFixed(2)} (${worstSession.winRate.toFixed(1)}% WR).`,
        metric: `${bestSession.session} vs ${worstSession.session}`,
        severity: worstSession.netProfit < -200 ? 'warning' : 'neutral',
        category: 'timing',
        actionTip: `Focus your execution strictly during the ${bestSession.session} session and avoid ${worstSession.session}.`,
      });
      strengths.push(`Strong edge in ${bestSession.session} session with ${bestSession.winRate.toFixed(1)}% win rate.`);
      weaknesses.push(`Performance leak during ${worstSession.session} session.`);
      actionRules.push(`Eliminate or reduce trading volume during the ${worstSession.session} session.`);
    }
  }

  // 4. SYMBOL SPECIALIZATION & DRAG
  const validSymbols = symbolData.filter((s) => s.totalTrades >= 3);
  if (validSymbols.length > 0) {
    const sortedSymbols = [...validSymbols].sort((a, b) => b.netProfit - a.netProfit);
    const topSymbol = sortedSymbols[0];
    const bottomSymbol = sortedSymbols[sortedSymbols.length - 1];

    if (topSymbol.netProfit > 0) {
      strengths.push(`Core profit driver: ${topSymbol.symbol} (+${topSymbol.netProfit.toFixed(2)}, ${topSymbol.winRate.toFixed(1)}% WR).`);
    }

    if (bottomSymbol.netProfit < 0 && Math.abs(bottomSymbol.netProfit) > 0.05 * account.initial_balance) {
      patterns.push({
        id: 'symbol-drag',
        title: `Underperforming Asset: ${bottomSymbol.symbol}`,
        description: `${bottomSymbol.symbol} has accumulated a net loss of $${Math.abs(bottomSymbol.netProfit).toFixed(2)} across ${bottomSymbol.totalTrades} trades with a ${bottomSymbol.winRate.toFixed(1)}% win rate.`,
        metric: `-$${Math.abs(bottomSymbol.netProfit).toFixed(2)} drag`,
        severity: 'critical',
        category: 'symbol',
        actionTip: `Temporarily remove ${bottomSymbol.symbol} from your watchlist or review your strategy on this asset.`,
      });
      weaknesses.push(`Negative expectancy trading ${bottomSymbol.symbol}.`);
      actionRules.push(`Halt live trading on ${bottomSymbol.symbol} until backtested and refined.`);
    }
  }

  // 5. LOT SIZING & RISK VARIANCE
  const volumes = sortedTrades.map((t) => t.volume);
  const maxVol = Math.max(...volumes);
  const minVol = Math.min(...volumes);
  const avgVol = volumes.reduce((s, v) => s + v, 0) / volumes.length;

  if (maxVol > avgVol * 2.5 && sortedTrades.length > 5) {
    patterns.push({
      id: 'lot-size-erratic',
      title: 'Erratic Position Sizing Observed',
      description: `Position size fluctuates between ${minVol} lots and ${maxVol} lots (avg ${avgVol.toFixed(2)}). Erratic sizing magnifies single-trade loss impact.`,
      metric: `${maxVol} max vs ${avgVol.toFixed(2)} avg lots`,
      severity: 'warning',
      category: 'risk',
      actionTip: 'Use a fixed % risk calculation per trade based on Stop Loss distance rather than arbitrary lot sizes.',
    });
    weaknesses.push('Inconsistent lot sizing creating disproportionate risk on select trades.');
    actionRules.push('Adopt strict fixed 1.0% account risk per position.');
  } else {
    strengths.push('Consistent and disciplined position sizing across all market conditions.');
  }

  // 6. WIN/LOSS STREAKS & DRAWDOWN
  if (kpis.consecutiveLosses >= 5) {
    patterns.push({
      id: 'streak-fatigue',
      title: 'Cluster Loss Vulnerability',
      description: `Observed a streak of ${kpis.consecutiveLosses} consecutive losses. When market conditions shift out of sync with your strategy, loss clustering occurs.`,
      metric: `${kpis.consecutiveLosses} consecutive losses`,
      severity: 'warning',
      category: 'risk',
      actionTip: 'Introduce a maximum 3-loss daily cutoff to preserve capital during difficult market regimes.',
    });
    actionRules.push('Max 3 consecutive losses daily limit: halt trading for the remainder of the trading day.');
  }

  // Ensure default strengths/weaknesses/rules if clean data
  if (strengths.length === 0) {
    strengths.push('Active market engagement with clear trade execution records.');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('Sample size growing — continue monitoring risk-to-reward ratio.');
  }
  if (actionRules.length === 0) {
    actionRules.push('Maintain strict risk-reward ratio of at least 1.5:1 on every trade.');
    actionRules.push('Log trading emotion before and after every execution.');
  }

  // Institutional Metrics
  const institutionalMetrics = computeInstitutionalMetrics(sortedTrades, account);

  // COMPUTE SCORES (0 - 100)
  const pf = isFinite(kpis.profitFactor) ? kpis.profitFactor : 2.5;
  const edgeScore = Math.min(Math.max(Math.round((pf / 2.0) * 60 + (kpis.winRate / 100) * 40), 10), 99);

  let disciplineScore = 85;
  if (revengeInstances > 0) disciplineScore -= revengeInstances * 10;
  if (durationRatio > 1.8) disciplineScore -= 15;
  if (maxVol > avgVol * 2.5) disciplineScore -= 10;
  disciplineScore = Math.min(Math.max(disciplineScore, 15), 98);

  const ddPct = account.initial_balance > 0 ? (kpis.maxDrawdown / account.initial_balance) * 100 : 10;
  let riskScore = 90 - Math.min(ddPct * 2, 50);
  if (kpis.largestLoss > kpis.largestWin * 1.5) riskScore -= 15;
  riskScore = Math.min(Math.max(Math.round(riskScore), 10), 98);

  let tiltScore = 92;
  if (revengeInstances > 0) tiltScore -= revengeInstances * 15;
  if (kpis.consecutiveLosses > 4) tiltScore -= 10;
  tiltScore = Math.min(Math.max(tiltScore, 10), 99);

  let consistencyScore = Math.round(kpis.winRate * 0.7 + (kpis.totalTrades > 30 ? 30 : kpis.totalTrades));
  consistencyScore = Math.min(Math.max(consistencyScore, 15), 95);

  const compositeScore = edgeScore * 0.3 + riskScore * 0.25 + disciplineScore * 0.2 + tiltScore * 0.15 + consistencyScore * 0.1;
  const grade = getGradeLetter(compositeScore);
  const archetype = getTraderArchetype(sortedTrades, kpis);

  const executiveSummary = generateExecutiveNarrative(
    account,
    kpis,
    grade,
    archetype,
    revengeInstances,
    durationRatio,
    institutionalMetrics
  );

  return {
    grade,
    archetype,
    scores: {
      edge: edgeScore,
      discipline: disciplineScore,
      riskManagement: riskScore,
      tiltResistance: tiltScore,
      consistency: consistencyScore,
    },
    executiveSummary,
    strengths,
    weaknesses,
    patterns,
    actionRules,
    institutionalMetrics,
    generatedAt: new Date().toISOString(),
  };
}

export function computeInstitutionalMetrics(trades: Trade[], account: TradingAccount): InstitutionalMetrics {
  if (!trades || trades.length === 0) {
    return {
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      kellyPercentage: 0,
      optimalRiskPerTrade: 1.0,
      holdingDecayMinutes: 180,
      holdingDecayLossRate: 50,
    };
  }

  const pnlList = trades.map((t) => t.net_profit);
  const meanPnl = pnlList.reduce((s, p) => s + p, 0) / pnlList.length;

  // Standard deviation
  const variance = pnlList.reduce((s, p) => s + Math.pow(p - meanPnl, 2), 0) / pnlList.length;
  const stdDev = Math.sqrt(variance) || 1;

  // Downside deviation (for Sortino)
  const downsidePnl = pnlList.filter((p) => p < 0);
  const downsideVar = downsidePnl.length
    ? downsidePnl.reduce((s, p) => s + Math.pow(p, 2), 0) / pnlList.length
    : 1;
  const downsideStdDev = Math.sqrt(downsideVar) || 1;

  // Annualized multipliers (assuming ~250 trading days/year)
  const annualFactor = Math.sqrt(250);
  const sharpe = Number(((meanPnl / stdDev) * annualFactor).toFixed(2));
  const sortino = Number(((meanPnl / downsideStdDev) * annualFactor).toFixed(2));

  // Calmar Ratio
  const totalProfit = trades.reduce((s, t) => s + t.net_profit, 0);
  const kpis = calculateKPIs(trades, account.initial_balance, account.current_balance);
  const calmar = kpis.maxDrawdown > 0 ? Number((totalProfit / kpis.maxDrawdown).toFixed(2)) : 0;

  // Kelly Criterion: K% = W - ((1 - W) / R)
  const winRateDecimal = (kpis.winRate || 50) / 100;
  const payoffRatio = kpis.averageLoss > 0 ? kpis.averageWin / kpis.averageLoss : 1.5;
  let kellyRaw = winRateDecimal - (1 - winRateDecimal) / (payoffRatio || 1);
  // Half-Kelly recommendation for safety
  const kellyPercentage = Math.max(0, Math.min(Number((kellyRaw * 100).toFixed(1)), 25));
  const optimalRisk = Math.max(0.5, Math.min(Number((kellyPercentage * 0.5).toFixed(1)), 3.0));

  // Holding Decay Threshold
  let decayThreshold = 180;
  let decayLossRate = 55;
  const longTrades = trades.filter((t) => (t.duration_minutes || 0) > 180);
  if (longTrades.length >= 5) {
    const longLosses = longTrades.filter((t) => t.net_profit < 0);
    decayLossRate = Math.round((longLosses.length / longTrades.length) * 100);
  }

  return {
    sharpeRatio: isNaN(sharpe) ? 0 : sharpe,
    sortinoRatio: isNaN(sortino) ? 0 : sortino,
    calmarRatio: isNaN(calmar) ? 0 : calmar,
    kellyPercentage,
    optimalRiskPerTrade: optimalRisk,
    holdingDecayMinutes: decayThreshold,
    holdingDecayLossRate: decayLossRate,
  };
}

export function runMonteCarloSimulation(
  trades: Trade[],
  initialBalance: number,
  iterations = 500,
  horizon = 50
): MonteCarloResult {
  if (!trades || trades.length < 5) {
    return {
      riskOfRuinPct: 0,
      probOfProfitPct: 50,
      maxSimulatedDrawdownPct: 0,
      medianFinalBalance: initialBalance,
      p95FinalBalance: initialBalance,
      p5FinalBalance: initialBalance,
      curvePoints: [],
    };
  }

  const pnlList = trades.map((t) => t.net_profit);
  const allFinalBalances: number[] = [];
  let ruinCount = 0;
  let profitCount = 0;
  let maxDrawdownFound = 0;

  const paths: number[][] = [];

  for (let iter = 0; iter < iterations; iter++) {
    const path: number[] = [initialBalance];
    let currentBalance = initialBalance;
    let peak = initialBalance;
    let localMaxDd = 0;

    for (let step = 0; step < horizon; step++) {
      const randomTradePnl = pnlList[Math.floor(Math.random() * pnlList.length)];
      currentBalance += randomTradePnl;
      path.push(currentBalance);

      if (currentBalance > peak) peak = currentBalance;
      const dd = peak > 0 ? ((peak - currentBalance) / peak) * 100 : 0;
      if (dd > localMaxDd) localMaxDd = dd;

      // Check if dropped below 30% of initial balance (Ruin condition)
      if (currentBalance <= initialBalance * 0.7) {
        // Flag ruin
      }
    }

    if (localMaxDd > maxDrawdownFound) maxDrawdownFound = localMaxDd;
    if (currentBalance <= initialBalance * 0.7) ruinCount++;
    if (currentBalance > initialBalance) profitCount++;

    allFinalBalances.push(currentBalance);
    paths.push(path);
  }

  allFinalBalances.sort((a, b) => a - b);
  const p5Final = allFinalBalances[Math.floor(iterations * 0.05)];
  const p50Final = allFinalBalances[Math.floor(iterations * 0.5)];
  const p95Final = allFinalBalances[Math.floor(iterations * 0.95)];

  // Aggregate percentile points per step for chart
  const curvePoints: MonteCarloPoint[] = [];
  for (let step = 0; step <= horizon; step += 5) {
    const stepValues = paths.map((p) => p[step]).sort((a, b) => a - b);
    curvePoints.push({
      tradeIndex: step,
      p5: Math.round(stepValues[Math.floor(iterations * 0.05)]),
      p50: Math.round(stepValues[Math.floor(iterations * 0.5)]),
      p95: Math.round(stepValues[Math.floor(iterations * 0.95)]),
    });
  }

  return {
    riskOfRuinPct: Number(((ruinCount / iterations) * 100).toFixed(1)),
    probOfProfitPct: Number(((profitCount / iterations) * 100).toFixed(1)),
    maxSimulatedDrawdownPct: Number(maxDrawdownFound.toFixed(1)),
    medianFinalBalance: Math.round(p50Final),
    p95FinalBalance: Math.round(p95Final),
    p5FinalBalance: Math.round(p5Final),
    curvePoints,
  };
}

export function runWhatIfScenarios(trades: Trade[], account: TradingAccount): WhatIfScenario[] {
  if (!trades || trades.length < 5) return [];

  const actualTotalProfit = trades.reduce((s, t) => s + t.net_profit, 0);
  const kpis = calculateKPIs(trades, account.initial_balance, account.current_balance);
  const scenarios: WhatIfScenario[] = [];

  // Scenario 1: Remove Revenge Trades
  const nonRevengeTrades: Trade[] = [];
  for (let i = 0; i < trades.length; i++) {
    if (i > 0 && trades[i - 1].net_profit < 0) {
      const prevClose = new Date(trades[i - 1].close_time).getTime();
      const currOpen = new Date(trades[i].open_time).getTime();
      const diffMin = (currOpen - prevClose) / (1000 * 60);
      if (diffMin >= 0 && diffMin <= 20 && trades[i].volume >= trades[i - 1].volume && trades[i].net_profit < 0) {
        continue; // Exclude revenge loss
      }
    }
    nonRevengeTrades.push(trades[i]);
  }
  const revengePnl = nonRevengeTrades.reduce((s, t) => s + t.net_profit, 0);
  const revengeWins = nonRevengeTrades.filter((t) => t.net_profit > 0).length;
  scenarios.push({
    id: 'no-revenge',
    title: 'Eliminate Revenge Trades',
    description: 'Simulates enforcing a mandatory 30-minute lockout after any losing trade.',
    impactProfit: Math.round((revengePnl - actualTotalProfit) * 100) / 100,
    impactWinRate: Math.round(((revengeWins / nonRevengeTrades.length) * 100 - kpis.winRate) * 10) / 10,
    tradesExcludedCount: trades.length - nonRevengeTrades.length,
    simulatedProfit: Math.round(revengePnl * 100) / 100,
    simulatedBalance: Math.round((account.initial_balance + revengePnl) * 100) / 100,
  });

  // Scenario 2: Cut Out Top 3 Worst Outlier Losses
  const sortedLosses = [...trades].sort((a, b) => a.net_profit - b.net_profit);
  const outlierCut = sortedLosses.slice(3);
  const outlierPnl = outlierCut.reduce((s, t) => s + t.net_profit, 0);
  const outlierWins = outlierCut.filter((t) => t.net_profit > 0).length;
  scenarios.push({
    id: 'no-outliers',
    title: 'Hard Stop on 3 Worst Outliers',
    description: 'Simulates cutting catastrophic tail-risk losses before they balloon.',
    impactProfit: Math.round((outlierPnl - actualTotalProfit) * 100) / 100,
    impactWinRate: Math.round(((outlierWins / outlierCut.length) * 100 - kpis.winRate) * 10) / 10,
    tradesExcludedCount: 3,
    simulatedProfit: Math.round(outlierPnl * 100) / 100,
    simulatedBalance: Math.round((account.initial_balance + outlierPnl) * 100) / 100,
  });

  // Scenario 3: Remove Worst Session
  const sessionData = calculateSessionAnalytics(trades);
  const worstSession = [...sessionData].sort((a, b) => a.netProfit - b.netProfit)[0];
  if (worstSession && worstSession.netProfit < 0) {
    const noWorstSessionTrades = trades.filter((t) => {
      const h = new Date(t.open_time).getUTCHours();
      let sess = 'Asian';
      if (h >= 8 && h < 13) sess = 'London';
      else if (h >= 13 && h < 17) sess = 'London/NY Overlap';
      else if (h >= 17 && h < 22) sess = 'New York';
      return sess !== worstSession.session;
    });
    const sessPnl = noWorstSessionTrades.reduce((s, t) => s + t.net_profit, 0);
    const sessWins = noWorstSessionTrades.filter((t) => t.net_profit > 0).length;
    scenarios.push({
      id: 'no-worst-session',
      title: `Eliminate ${worstSession.session} Session`,
      description: `Simulates completely halting new entries during the unprofitable ${worstSession.session} session.`,
      impactProfit: Math.round((sessPnl - actualTotalProfit) * 100) / 100,
      impactWinRate: Math.round(((sessWins / (noWorstSessionTrades.length || 1)) * 100 - kpis.winRate) * 10) / 10,
      tradesExcludedCount: trades.length - noWorstSessionTrades.length,
      simulatedProfit: Math.round(sessPnl * 100) / 100,
      simulatedBalance: Math.round((account.initial_balance + sessPnl) * 100) / 100,
    });
  }

  return scenarios;
}

function getGradeLetter(score: number): string {
  if (score >= 93) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 84) return 'A-';
  if (score >= 79) return 'B+';
  if (score >= 74) return 'B';
  if (score >= 69) return 'B-';
  if (score >= 64) return 'C+';
  if (score >= 58) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 40) return 'D';
  return 'F';
}

function getTraderArchetype(trades: Trade[], kpis: any): string {
  const avgDuration = trades.reduce((s, t) => s + (t.duration_minutes || 0), 0) / (trades.length || 1);

  if (avgDuration < 45) {
    return kpis.profitFactor > 1.2 ? 'Precision Scalper' : 'High-Frequency Impulse Scalper';
  }
  if (avgDuration < 480) {
    return kpis.profitFactor > 1.2 ? 'Structured Intraday Momentum Trader' : 'Intraday Session Trader';
  }
  return kpis.profitFactor > 1.2 ? 'Systematic Swing Trader' : 'Extended-Hold Swing Trader';
}

function generateExecutiveNarrative(
  account: TradingAccount,
  kpis: any,
  grade: string,
  archetype: string,
  revengeCount: number,
  durationRatio: number,
  instMetrics: InstitutionalMetrics
): string {
  const returnStr = kpis.returnPct >= 0 ? `+${kpis.returnPct.toFixed(1)}%` : `${kpis.returnPct.toFixed(1)}%`;
  const profitStr = kpis.netProfit >= 0 ? `+$${kpis.netProfit.toFixed(2)}` : `-$${Math.abs(kpis.netProfit).toFixed(2)}`;

  let summary = `Based on comprehensive quantitative analysis of ${kpis.totalTrades} closed positions on your ${account.account_name} (${account.platform}) account, you are operating as a **${archetype}** with an institutional performance grade of **${grade}**.\n\n`;

  summary += `Your account has achieved a net result of **${profitStr}** (${returnStr} ROI) with a **${kpis.winRate.toFixed(1)}% win rate**, Profit Factor of **${isFinite(kpis.profitFactor) ? kpis.profitFactor.toFixed(2) : '∞'}**, and Sharpe Ratio of **${instMetrics.sharpeRatio}** (Sortino: **${instMetrics.sortinoRatio}**).\n\n`;

  if (instMetrics.optimalRiskPerTrade > 0) {
    summary += `**Kelly Criterion Positioning**: Mathematical optimal risk is **${instMetrics.optimalRiskPerTrade}% per trade** (Half-Kelly). `;
  }

  if (durationRatio > 2.0) {
    summary += `A primary vulnerability is **asymmetric trade duration**: you hold losing positions ${(durationRatio).toFixed(1)}x longer than winners. `;
  }

  if (revengeCount > 2) {
    summary += `Additionally, tilt detection flagged **${revengeCount} rapid re-entry events** following losses. `;
  }

  summary += `By applying the What-If simulation rules and eliminating emotional re-entries, your expected value per trade can improve substantially.`;

  return summary;
}

function getEmptyDiagnosis(account: TradingAccount): TraderDiagnosis {
  return {
    grade: 'N/A',
    archetype: 'New Trader',
    scores: {
      edge: 50,
      discipline: 50,
      riskManagement: 50,
      tiltResistance: 50,
      consistency: 50,
    },
    executiveSummary: `No closed trades have been recorded for ${account.account_name} yet. Connect your MetaTrader terminal or import a CSV file to activate full AI diagnostics.`,
    strengths: ['Account established and ready for synchronization.'],
    weaknesses: ['Awaiting trading history.'],
    patterns: [],
    actionRules: ['Import trade history to begin automated AI analysis.'],
    institutionalMetrics: {
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      kellyPercentage: 0,
      optimalRiskPerTrade: 1.0,
      holdingDecayMinutes: 180,
      holdingDecayLossRate: 50,
    },
    generatedAt: new Date().toISOString(),
  };
}
