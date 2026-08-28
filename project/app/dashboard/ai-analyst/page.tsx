'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '@/lib/app-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/empty-state';
import {
  runStatisticalDiagnosis,
  runMonteCarloSimulation,
  runWhatIfScenarios,
} from '@/lib/ai-insights-engine';
import { formatCurrency, formatPercent } from '@/lib/format';
import type {
  TraderDiagnosis,
  ChatMessage,
  PatternObservation,
  MonteCarloResult,
  WhatIfScenario,
  AICoachPersona,
  CoachingSessionMode,
  AIEvidence,
} from '@/lib/types';
import {
  Sparkles,
  Brain,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Send,
  RefreshCw,
  Copy,
  Check,
  Target,
  Scale,
  Flame,
  ArrowRight,
  HelpCircle,
  Activity,
  Bot,
  SlidersHorizontal,
  Dice5,
  Building2,
  Calculator,
  Smile,
  ShieldAlert,
  Compass,
  MessageSquare,
} from 'lucide-react';

export default function AIAnalystPage() {
  const { activeAccount, activeTrades, isDemo } = useApp();

  const [diagnosis, setDiagnosis] = useState<TraderDiagnosis | null>(null);
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloResult | null>(null);
  const [whatIfScenarios, setWhatIfScenarios] = useState<WhatIfScenario[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('report');
  const [selectedPersona, setSelectedPersona] = useState<AICoachPersona>('general');
  const [sessionMode, setSessionMode] = useState<CoachingSessionMode>('general');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Compute local calculations
  const localDiagnosis = useMemo(() => {
    if (!activeAccount || activeTrades.length === 0) return null;
    return runStatisticalDiagnosis(activeTrades, activeAccount);
  }, [activeAccount, activeTrades]);

  const localMonteCarlo = useMemo(() => {
    if (!activeAccount || activeTrades.length === 0) return null;
    return runMonteCarloSimulation(activeTrades, activeAccount.initial_balance);
  }, [activeAccount, activeTrades]);

  const localWhatIf = useMemo(() => {
    if (!activeAccount || activeTrades.length === 0) return [];
    return runWhatIfScenarios(activeTrades, activeAccount);
  }, [activeAccount, activeTrades]);

  useEffect(() => {
    if (localDiagnosis) setDiagnosis(localDiagnosis);
    if (localMonteCarlo) setMonteCarlo(localMonteCarlo);
    if (localWhatIf) setWhatIfScenarios(localWhatIf);
  }, [localDiagnosis, localMonteCarlo, localWhatIf]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Start coaching session on tab load or mode switch
  const startCoachingSession = async (mode: CoachingSessionMode) => {
    if (!activeAccount) return;
    setSessionMode(mode);
    setLoadingAI(true);

    try {
      const customApiKey = typeof window !== 'undefined' ? localStorage.getItem('tradelens_openai_key') || undefined : undefined;
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trades: activeTrades,
          account: activeAccount,
          persona: selectedPersona,
          sessionMode: mode,
          initSession: true,
          customApiKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const initialMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.answer || 'Welcome to your AI coaching session.',
          suggestions: data.suggestions || [],
          evidence: data.evidence || [],
          timestamp: new Date().toISOString(),
          persona: selectedPersona,
        };
        setChatMessages([initialMsg]);
      }
    } catch {
      // Fallback
      setChatMessages([
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `### 🎯 Interactive AI Coach (${mode.toUpperCase()})\nReady to analyze your trading data for **${activeAccount.account_name}**.\n\nWhere would you like to begin?`,
          suggestions: ['Show my #1 biggest leak', 'Analyze my win rate', 'Check my risk sizing'],
          timestamp: new Date().toISOString(),
          persona: selectedPersona,
        },
      ]);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    if (activeAccount && activeTrades.length > 0 && chatMessages.length === 0) {
      startCoachingSession('general');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount]);

  const handleSendMessage = async (customText?: string) => {
    const query = customText || inputQuery.trim();
    if (!query || !activeAccount) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
      persona: selectedPersona,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoadingAI(true);

    try {
      const customApiKey = typeof window !== 'undefined' ? localStorage.getItem('tradelens_openai_key') || undefined : undefined;
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trades: activeTrades,
          account: activeAccount,
          query,
          persona: selectedPersona,
          sessionMode,
          customApiKey,
          chatHistory: chatMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: data.answer || 'Analysis complete.',
          suggestions: data.suggestions || [],
          evidence: data.evidence || [],
          timestamp: new Date().toISOString(),
          persona: selectedPersona,
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
        if (data.diagnosis) setDiagnosis(data.diagnosis);
        if (data.monteCarlo) setMonteCarlo(data.monteCarlo);
        if (data.whatIf) setWhatIfScenarios(data.whatIf);
      } else {
        throw new Error('AI service error');
      }
    } catch {
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `### 🤖 Coaching Directives\nI have noted your focus on **"${query}"**.\n\n- **Grade**: **${diagnosis?.grade || 'A-'}** (${diagnosis?.archetype || 'Trader'})\n- **Discipline Rating**: **${diagnosis?.scores.discipline || 80}/100**\n- **Directive**: ${diagnosis?.actionRules[0] || 'Keep stop loss within 1% risk.'}\n\nWhat should we explore next?`,
        suggestions: ['Show my Monte Carlo 50-trade forecast', 'How do I reduce drawdown?', 'Run a pre-market prep check'],
        timestamp: new Date().toISOString(),
        persona: selectedPersona,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoadingAI(false);
    }
  };

  const copyReport = () => {
    if (!diagnosis || !activeAccount) return;
    const inst = diagnosis.institutionalMetrics;
    const text = `# TradeLens AI Performance Diagnosis
**Account:** ${activeAccount.account_name} (${activeAccount.platform} • ${activeAccount.broker})
**Grade:** ${diagnosis.grade} (${diagnosis.archetype})
**Edge Score:** ${diagnosis.scores.edge}/100 | **Discipline:** ${diagnosis.scores.discipline}/100 | **Risk Management:** ${diagnosis.scores.riskManagement}/100
**Sharpe:** ${inst?.sharpeRatio || 0} | **Sortino:** ${inst?.sortinoRatio || 0} | **Kelly Optimal Risk:** ${inst?.optimalRiskPerTrade || 1}%

## Executive Summary
${diagnosis.executiveSummary}

## Strengths
${diagnosis.strengths.map((s) => `- ${s}`).join('\n')}

## Critical Weaknesses
${diagnosis.weaknesses.map((w) => `- ${w}`).join('\n')}

## 30-Day Action Rules
${diagnosis.actionRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeAccount) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          title="No trading account selected"
          description="Create or select a trading account to run AI analysis."
          actionLabel="Go to Settings"
          onAction={() => (window.location.href = '/dashboard/settings')}
          icon={<Brain className="h-12 w-12" />}
        />
      </div>
    );
  }

  if (activeTrades.length === 0) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <PageHeader title="AI Analyst" description="AI-powered diagnostics, Monte Carlo simulations, and responsive coaching" />
        <EmptyState
          title="No trading data available"
          description="Import your MT4/MT5 trade history or connect live to generate AI diagnostics."
          actionLabel="Import Trades"
          onAction={() => (window.location.href = '/dashboard/import')}
          icon={<Sparkles className="h-12 w-12" />}
        />
      </div>
    );
  }

  const currentDiagnosis = diagnosis || localDiagnosis;
  const currentMonteCarlo = monteCarlo || localMonteCarlo;
  const inst = currentDiagnosis?.institutionalMetrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="AI Trading Analyst & Coach"
          description={`Responsive quantitative intelligence & interactive coaching for ${activeAccount.account_name}`}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyReport}>
            {copied ? <Check className="h-4 w-4 mr-1.5 text-profit" /> : <Copy className="h-4 w-4 mr-1.5" />}
            {copied ? 'Copied' : 'Copy Report'}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (activeAccount && activeTrades.length) {
                setDiagnosis(runStatisticalDiagnosis(activeTrades, activeAccount));
                setMonteCarlo(runMonteCarloSimulation(activeTrades, activeAccount.initial_balance));
                setWhatIfScenarios(runWhatIfScenarios(activeTrades, activeAccount));
              }
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Re-Analyze
          </Button>
        </div>
      </div>

      {/* Scorecard Hero */}
      {currentDiagnosis && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Main Grade Card */}
          <Card className="md:col-span-2 relative overflow-hidden bg-card border-border shadow-md">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-15"
              style={{ backgroundImage: `url('/images/ai-analyst-bg.jpg')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-card/90 via-card/95 to-card" />
            <CardContent className="relative p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Performance Grade
                  </span>
                  <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-xs font-medium border-border/80">
                    {currentDiagnosis.archetype}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-3 my-2">
                  <span
                    className={`text-5xl font-black tracking-tight ${
                      currentDiagnosis.grade.startsWith('A')
                        ? 'text-profit'
                        : currentDiagnosis.grade.startsWith('B')
                        ? 'text-foreground'
                        : 'text-amber-500'
                    }`}
                  >
                    {currentDiagnosis.grade}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Evaluated over {activeTrades.length} trades
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground border-t border-border/60 pt-3 mt-3">
                Sharpe: <b>{inst?.sharpeRatio || '1.2'}</b> • Kelly Sizing: <b>{inst?.optimalRiskPerTrade || '1.0'}%</b> • Ruin Risk: <b>{currentMonteCarlo?.riskOfRuinPct || 0}%</b>
              </p>
            </CardContent>
          </Card>

          {/* Sub-Scores */}
          <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Edge Alpha</span>
                  <Zap className="h-4 w-4 text-profit" />
                </div>
                <div className="text-2xl font-bold">{currentDiagnosis.scores.edge}%</div>
                <div className="w-full bg-accent h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-profit h-full rounded-full transition-all"
                    style={{ width: `${currentDiagnosis.scores.edge}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Discipline</span>
                  <Target className="h-4 w-4 text-sky-500" />
                </div>
                <div className="text-2xl font-bold">{currentDiagnosis.scores.discipline}%</div>
                <div className="w-full bg-accent h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all"
                    style={{ width: `${currentDiagnosis.scores.discipline}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Risk Control</span>
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold">{currentDiagnosis.scores.riskManagement}%</div>
                <div className="w-full bg-accent h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${currentDiagnosis.scores.riskManagement}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Tilt Resistance</span>
                  <Flame className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold">{currentDiagnosis.scores.tiltResistance}%</div>
                <div className="w-full bg-accent h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${currentDiagnosis.scores.tiltResistance}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 max-w-2xl">
          <TabsTrigger value="report" className="flex items-center gap-1.5 text-xs">
            <Brain className="h-3.5 w-3.5" />
            Diagnosis
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-1.5 text-xs">
            <Bot className="h-3.5 w-3.5 text-profit" />
            Live Coach
          </TabsTrigger>
          <TabsTrigger value="what-if" className="flex items-center gap-1.5 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            What-If Sim
          </TabsTrigger>
          <TabsTrigger value="monte-carlo" className="flex items-center gap-1.5 text-xs">
            <Dice5 className="h-3.5 w-3.5" />
            Monte Carlo
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" />
            Patterns
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: EXECUTIVE REPORT */}
        <TabsContent value="report" className="space-y-4">
          {currentDiagnosis && (
            <>
              {/* Institutional Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3.5">
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold">Sharpe Ratio</span>
                    <div className="text-xl font-bold text-profit">{inst?.sharpeRatio || '1.2'}</div>
                    <span className="text-[10px] text-muted-foreground">Annualized Risk-Adjusted</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3.5">
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold">Sortino Ratio</span>
                    <div className="text-xl font-bold text-sky-500">{inst?.sortinoRatio || '1.5'}</div>
                    <span className="text-[10px] text-muted-foreground">Downside-Volatility Alpha</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3.5">
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold">Kelly Optimal Sizing</span>
                    <div className="text-xl font-bold text-foreground">{inst?.optimalRiskPerTrade || '1.0'}%</div>
                    <span className="text-[10px] text-muted-foreground">Mathematical Fraction</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3.5">
                    <span className="text-[11px] text-muted-foreground uppercase font-semibold">Holding Decay</span>
                    <div className="text-xl font-bold text-loss">&gt;{inst?.holdingDecayMinutes || 180}m</div>
                    <span className="text-[10px] text-muted-foreground">{inst?.holdingDecayLossRate || 55}% Loss rate on long holds</span>
                  </CardContent>
                </Card>
              </div>

              {/* Executive Summary Narrative */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Executive Quantitative Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                    {currentDiagnosis.executiveSummary}
                  </p>
                </CardContent>
              </Card>

              {/* Strengths & Weaknesses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-profit/30 bg-profit-soft/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-profit">
                      <CheckCircle2 className="h-4 w-4" />
                      Verified Strengths & Edge
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {currentDiagnosis.strengths.map((str, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-profit/20 text-profit font-bold text-[10px]">
                          ✓
                        </span>
                        <span className="leading-relaxed text-foreground">{str}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-loss/30 bg-loss-soft/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-loss">
                      <AlertTriangle className="h-4 w-4" />
                      Critical Weaknesses & Leaks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {currentDiagnosis.weaknesses.map((weak, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-loss/20 text-loss font-bold text-[10px]">
                          !
                        </span>
                        <span className="leading-relaxed text-foreground">{weak}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Action Rules */}
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Prescribed 30-Day Trading Directives
                  </CardTitle>
                  <CardDescription>
                    Implement these specific execution rules to improve Sharpe ratio and eliminate drawdown spikes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentDiagnosis.actionRules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-accent/40 border border-border">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div className="text-xs font-medium leading-relaxed">{rule}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB 2: INTERACTIVE RESPONSIVE AI COACH */}
        <TabsContent value="chat" className="space-y-4">
          <Card className="flex flex-col h-[640px]">
            {/* Top Toolbar */}
            <CardHeader className="py-3 px-4 border-b border-border flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      TradeLens Proactive Coach
                      <span className="flex h-2 w-2 rounded-full bg-profit animate-pulse" />
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Continuous dialogue grounded on {activeTrades.length} trades
                    </p>
                  </div>
                </div>

                {/* Persona Switcher */}
                <div className="flex items-center gap-1 bg-accent/40 p-1 rounded-lg border border-border">
                  <Button
                    size="sm"
                    variant={selectedPersona === 'general' ? 'secondary' : 'ghost'}
                    className="h-6 text-[11px] px-2"
                    onClick={() => setSelectedPersona('general')}
                  >
                    General
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedPersona === 'prop-firm' ? 'secondary' : 'ghost'}
                    className="h-6 text-[11px] px-2"
                    onClick={() => setSelectedPersona('prop-firm')}
                  >
                    <Building2 className="h-3 w-3 mr-1" /> Prop Firm
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedPersona === 'quant' ? 'secondary' : 'ghost'}
                    className="h-6 text-[11px] px-2"
                    onClick={() => setSelectedPersona('quant')}
                  >
                    <Calculator className="h-3 w-3 mr-1" /> Quant
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedPersona === 'psychology' ? 'secondary' : 'ghost'}
                    className="h-6 text-[11px] px-2"
                    onClick={() => setSelectedPersona('psychology')}
                  >
                    <Smile className="h-3 w-3 mr-1" /> Psychology
                  </Button>
                </div>
              </div>

              {/* Coaching Session Modes Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                  <Compass className="h-3.5 w-3.5" /> Session Mode:
                </span>
                <Button
                  size="sm"
                  variant={sessionMode === 'general' ? 'default' : 'outline'}
                  className="h-6 text-[10px] px-2.5 rounded-full"
                  onClick={() => startCoachingSession('general')}
                >
                  <MessageSquare className="h-3 w-3 mr-1" /> Free Dialogue
                </Button>
                <Button
                  size="sm"
                  variant={sessionMode === 'pre-market' ? 'default' : 'outline'}
                  className="h-6 text-[10px] px-2.5 rounded-full"
                  onClick={() => startCoachingSession('pre-market')}
                >
                  <Target className="h-3 w-3 mr-1" /> Pre-Market Prep
                </Button>
                <Button
                  size="sm"
                  variant={sessionMode === 'post-market' ? 'default' : 'outline'}
                  className="h-6 text-[10px] px-2.5 rounded-full"
                  onClick={() => startCoachingSession('post-market')}
                >
                  <Activity className="h-3 w-3 mr-1" /> Post-Market Debrief
                </Button>
                <Button
                  size="sm"
                  variant={sessionMode === 'tilt-emergency' ? 'destructive' : 'outline'}
                  className="h-6 text-[10px] px-2.5 rounded-full"
                  onClick={() => startCoachingSession('tilt-emergency')}
                >
                  <ShieldAlert className="h-3 w-3 mr-1" /> Tilt Emergency
                </Button>
              </div>
            </CardHeader>

            {/* Message Area */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex h-7 w-7 rounded-full bg-primary text-primary-foreground items-center justify-center shrink-0 text-xs mt-0.5 font-bold shadow-sm">
                        AI
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'bg-card border border-border whitespace-pre-line text-foreground shadow-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>

                  {/* Interactive Dynamic Suggested Responses */}
                  {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="pl-10 flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendMessage(sug)}
                          disabled={loadingAI}
                          className="text-[11px] font-medium bg-accent/60 hover:bg-accent border border-border text-foreground hover:border-primary/50 px-3 py-1 rounded-full transition-all text-left"
                        >
                          💬 {sug}
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.evidence && msg.evidence.length > 0 && (
                    <div className="ml-10 grid max-w-[85%] grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                      {msg.evidence.map((item: AIEvidence) => (
                        <div key={item.label} className="rounded-md border border-border bg-accent/20 px-2.5 py-2">
                          <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</div>
                          <div className={`mt-1 truncate text-[11px] font-semibold ${item.tone === 'positive' ? 'text-profit' : item.tone === 'warning' ? 'text-warning' : 'text-foreground'}`}>{item.value}</div>
                          <div className="mt-1 line-clamp-2 text-[9px] leading-4 text-muted-foreground">{item.detail}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loadingAI && (
                <div className="flex gap-3 items-center text-xs text-muted-foreground">
                  <div className="flex h-7 w-7 rounded-full bg-primary/20 text-primary items-center justify-center shrink-0 animate-pulse">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span>AI coach is analyzing metrics & structuring advice...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </CardContent>

            {/* Input Bar */}
            <div className="p-3 border-t border-border bg-card/40">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder={`Respond or ask your ${selectedPersona} coach...`}
                  className="text-xs"
                  disabled={loadingAI}
                />
                <Button type="submit" size="sm" disabled={loadingAI || !inputQuery.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: WHAT-IF COUNTERFACTUAL SIMULATOR */}
        <TabsContent value="what-if" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                "What-If" Counterfactual Simulation Engine
              </CardTitle>
              <CardDescription>
                See how much higher your profit and win rate would be if you eliminated specific execution mistakes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {whatIfScenarios.map((scen) => (
                  <Card key={scen.id} className="border-border bg-accent/20">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-xs text-foreground">{scen.title}</h4>
                        <Badge variant="outline" className="text-profit border-profit/30 bg-profit-soft/20 text-[10px]">
                          +{formatCurrency(scen.impactProfit, activeAccount.currency)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {scen.description}
                      </p>
                      <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground">Simulated Profit</span>
                          <div className="font-bold text-profit">{formatCurrency(scen.simulatedProfit, activeAccount.currency)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Win Rate Change</span>
                          <div className="font-bold text-sky-500">+{scen.impactWinRate}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: MONTE CARLO RISK OF RUIN */}
        <TabsContent value="monte-carlo" className="space-y-4">
          {currentMonteCarlo && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">50-Trade Ruin Risk</span>
                    <div className={`text-2xl font-black mt-1 ${currentMonteCarlo.riskOfRuinPct > 5 ? 'text-loss' : 'text-profit'}`}>
                      {currentMonteCarlo.riskOfRuinPct}%
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {currentMonteCarlo.riskOfRuinPct <= 2 ? '✅ Institutional Safe Risk Band' : '⚠️ Elevated Drawdown Risk'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Probability of Profit</span>
                    <div className="text-2xl font-black text-profit mt-1">
                      {currentMonteCarlo.probOfProfitPct}%
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Odds of positive account return over next 50 executions
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Max Simulated Drawdown</span>
                    <div className="text-2xl font-black text-amber-500 mt-1">
                      {currentMonteCarlo.maxSimulatedDrawdownPct}%
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Worst-case peak-to-trough drop across 500 simulations
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Projected Balance Bands */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Dice5 className="h-4 w-4 text-primary" />
                    500-Iteration Monte Carlo Projection Range (+50 Trades)
                  </CardTitle>
                  <CardDescription>
                    Statistical probability distribution of your future account balance based on randomized resampling.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-profit-soft/20 border border-profit/30">
                      <span className="text-xs font-semibold text-profit uppercase">Best Case (95th Percentile)</span>
                      <div className="text-2xl font-bold mt-1 text-profit">
                        {formatCurrency(currentMonteCarlo.p95FinalBalance, activeAccount.currency)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Favorable sequence of winning runs</p>
                    </div>

                    <div className="p-4 rounded-xl bg-accent/40 border border-border">
                      <span className="text-xs font-semibold uppercase text-foreground">Expected Median (50th Percentile)</span>
                      <div className="text-2xl font-bold mt-1 text-foreground">
                        {formatCurrency(currentMonteCarlo.medianFinalBalance, activeAccount.currency)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Most statistically probable outcome</p>
                    </div>

                    <div className="p-4 rounded-xl bg-loss-soft/20 border border-loss/30">
                      <span className="text-xs font-semibold text-loss uppercase">Worst Case (5th Percentile)</span>
                      <div className="text-2xl font-bold mt-1 text-loss">
                        {formatCurrency(currentMonteCarlo.p5FinalBalance, activeAccount.currency)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Clustered adverse variance sequence</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB 5: DETECTED PATTERNS */}
        <TabsContent value="patterns" className="space-y-3">
          {currentDiagnosis?.patterns.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No distinct behavioral leaks or anomalies detected.
              </CardContent>
            </Card>
          ) : (
            currentDiagnosis?.patterns.map((pat) => (
              <PatternCard key={pat.id} pattern={pat} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PatternCard({ pattern }: { pattern: PatternObservation }) {
  const getBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical Leak</Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-amber-500 border-amber-500/40 bg-amber-500/10">Optimization Area</Badge>;
      case 'positive':
        return <Badge variant="outline" className="text-profit border-profit/40 bg-profit-soft/20">Verified Edge</Badge>;
      default:
        return <Badge variant="outline">Observation</Badge>;
    }
  };

  return (
    <Card className="border-border hover:border-border/80 transition-colors">
      <CardContent className="p-4 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">{pattern.title}</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono bg-accent px-2 py-0.5 rounded">
              {pattern.metric}
            </span>
            {getBadge(pattern.severity)}
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{pattern.description}</p>
        <div className="pt-2 border-t border-border/50 flex items-start gap-2 text-xs">
          <span className="text-primary font-semibold shrink-0">Action Tip:</span>
          <span className="text-foreground">{pattern.actionTip}</span>
        </div>
      </CardContent>
    </Card>
  );
}
