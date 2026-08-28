'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  LineChart,
  TrendingUp,
  Filter,
  Shield,
  Users,
  Plug,
  Sparkles,
  ArrowRight,
  BarChart3,
  Bot,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/app-context';

const features = [
  {
    icon: Sparkles,
    title: 'Performance Analytics',
    description: 'Analyze P&L, win rate, drawdown, expectancy, risk/reward, and more.',
  },
  {
    icon: Plug,
    title: 'AI Behavioral Analysis',
    description: 'Identify overtrading, revenge trading, early exits, and excessive risk from your own history.',
  },
  {
    icon: TrendingUp,
    title: 'Trade Intelligence',
    description: 'Understand which setups, sessions, instruments, and strategies actually perform best.',
  },
  {
    icon: LineChart,
    title: 'MT4 & MT5 Synchronization',
    description: 'Automatically synchronize your trading activity and keep your analysis up to date.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { setViewMode } = useApp();

  const startDemo = () => {
    setViewMode('demo');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="TradeLens" className="h-8 w-8 rounded-lg shadow-sm shadow-emerald-500/20" />
            <span className="text-lg font-bold tracking-tight">TradeLens</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={startDemo}>
              Explore Demo
            </Button>
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Start Free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero with Background Image */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Background Image with Dark Gradient Overlays */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url('/images/hero-trading-bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 backdrop-blur-sm px-4 py-1.5 text-xs text-muted-foreground shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-profit animate-pulse" />
              Live MT4 & MT5 EA Sync + AI Analyst Now Available
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl text-foreground">
              Understand Every Trade. <br className="hidden sm:inline" />
              <span className="text-profit">Maximize Your Edge.</span>
            </h1>
            <p className="mt-6 text-base text-muted-foreground md:text-xl leading-relaxed">
              Institutional-grade trading performance analytics, AI behavioral diagnosis, and automated MetaTrader synchronization — built for serious Forex & CFD traders.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild className="h-11 px-6 shadow-md shadow-primary/20">
                <Link href={user ? '/dashboard' : '/signup'}>
                  Start Analyzing Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={startDemo} className="h-11 px-6 bg-card/60 backdrop-blur-sm">
                Explore Demo Mode
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required • Instant setup with MT4/MT5
            </p>
          </div>
        </div>
      </section>

      {/* Product Preview */}
      <section className="relative z-10 -mt-8 px-4 pb-20 sm:-mt-12 md:pb-28">
        <div className="animate-slide-up mx-auto max-w-6xl overflow-hidden rounded-xl border border-white/10 bg-[#0b121e] shadow-2xl shadow-black/50 ring-1 ring-profit/10">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="" className="h-7 w-7 rounded-md" />
              <div><div className="text-xs font-semibold text-white">Portfolio overview</div><div className="text-[10px] text-slate-500">FTMO Challenge <span className="text-slate-700">•</span> MT5</div></div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-profit" /> Synced 2m ago</div>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-5 sm:gap-5 sm:p-6">
            {[
              ['Total P&L', '+$12,482.60', '+12.48% this month', 'text-profit'],
              ['Win rate', '68.4%', '+4.2% vs last month', 'text-profit'],
              ['Profit factor', '2.18', 'Strong edge', 'text-profit'],
              ['Avg. risk / reward', '1 : 2.6', 'Across 320 trades', 'text-foreground'],
              ['Max drawdown', '-3.82%', 'Within 5% limit', 'text-loss'],
            ].map(([label, value, detail, tone]) => <div key={label} className="border-b border-white/[0.07] pb-4 last:border-0 last:pb-0 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4 sm:last:border-0"><div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</div><div className={`mt-2 font-mono text-xl font-semibold tracking-tight ${tone}`}>{value}</div><div className="mt-1 text-[11px] text-slate-500">{detail}</div></div>)}
          </div>
          <div className="grid gap-4 border-t border-white/[0.08] p-4 sm:grid-cols-[1.5fr_0.9fr] sm:gap-5 sm:p-6">
            <div className="rounded-lg border border-white/[0.07] bg-[#08101b] p-4 sm:p-5"><div className="mb-4 flex items-start justify-between"><div><div className="text-xs font-semibold text-slate-200">Equity curve</div><div className="mt-1 text-[10px] text-slate-500">Account growth over the last 30 days</div></div><span className="rounded border border-profit/20 bg-profit/5 px-2 py-1 text-[10px] text-profit">30D</span></div><div className="relative h-40 overflow-hidden"><div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:20%_25%]" /><svg viewBox="0 0 600 180" preserveAspectRatio="none" className="relative h-full w-full"><defs><linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#22c55e" stopOpacity=".25" /><stop offset="1" stopColor="#22c55e" stopOpacity="0" /></linearGradient></defs><path d="M0 153 C35 148 43 133 70 139 S104 122 130 126 S158 106 185 114 S220 93 245 100 S285 76 310 83 S344 63 370 70 S402 48 430 57 S466 37 492 45 S533 21 600 10 V180 H0Z" fill="url(#curveFill)" /><path d="M0 153 C35 148 43 133 70 139 S104 122 130 126 S158 106 185 114 S220 93 245 100 S285 76 310 83 S344 63 370 70 S402 48 430 57 S466 37 492 45 S533 21 600 10" fill="none" stroke="#4ade80" strokeLinecap="round" strokeWidth="3" /></svg></div><div className="mt-2 flex justify-between text-[9px] text-slate-600"><span>May 01</span><span>May 15</span><span>May 30</span></div></div>
            <div className="rounded-lg border border-white/[0.07] bg-[#08101b] p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div><div className="text-xs font-semibold text-slate-200">AI risk analysis</div><div className="mt-1 text-[10px] text-slate-500">Behavioral signal monitor</div></div><Bot className="h-4 w-4 text-profit" /></div><div className="rounded-md border border-warning/20 bg-warning/5 p-3"><div className="text-[10px] font-semibold text-warning">ATTENTION NEEDED</div><p className="mt-2 text-[11px] leading-5 text-slate-400">Position size increased after two consecutive losses.</p></div><div className="mt-4 space-y-3 text-[11px]"><div className="flex justify-between"><span className="text-slate-500">Discipline score</span><span className="font-mono text-profit">91 / 100</span></div><div className="h-1.5 rounded-full bg-slate-800"><div className="h-1.5 w-[91%] rounded-full bg-profit" /></div><div className="flex justify-between"><span className="text-slate-500">Trades this period</span><span className="font-mono text-slate-300">320</span></div></div></div>
          </div>
          <div className="grid gap-4 border-t border-white/[0.08] p-4 sm:grid-cols-[1.1fr_0.9fr] sm:p-6"><div><div className="mb-3 flex items-center justify-between"><div className="text-xs font-semibold text-slate-200">Recent trades</div><span className="text-[10px] text-profit">View all</span></div><div className="space-y-2">{[['XAUUSD', 'BUY', '+$284.60', true], ['EURUSD', 'SELL', '+$96.40', true], ['GBPJPY', 'BUY', '-$72.20', false]].map(([symbol, type, result, positive]) => <div key={String(symbol)} className="flex items-center justify-between rounded-md border border-white/[0.05] bg-[#08101b] px-3 py-2.5"><div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded bg-slate-800 text-[9px] font-bold text-slate-300">{type === 'BUY' ? 'B' : 'S'}</span><div><div className="text-[11px] font-semibold text-slate-300">{symbol} <span className="ml-1 text-[9px] font-normal text-slate-600">{type}</span></div><div className="mt-0.5 text-[9px] text-slate-600">Today, 10:42</div></div></div><span className={positive ? 'font-mono text-[11px] text-profit' : 'font-mono text-[11px] text-loss'}>{result}</span></div>)}</div></div><div className="rounded-lg border border-white/[0.07] bg-[#08101b] p-4"><div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-200"><Activity className="h-3.5 w-3.5 text-profit" /> Performance snapshot</div><div className="flex h-20 items-end gap-1.5">{[38,52,46,61,54,70,63,77,73,89,82,96].map((height, index) => <div key={index} className="flex-1 rounded-t-sm bg-profit/70" style={{ height: `${height}%` }} />)}</div><div className="mt-2 flex justify-between text-[9px] text-slate-600"><span>Winning days</span><span className="font-mono text-profit">78%</span></div></div></div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-b border-border bg-card/20 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-2xl font-bold md:text-3xl">Engineered for Trading Precision</h2>
            <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
              TradeLens gives you the diagnostic tools professional quant desks and prop traders use to identify edge and eliminate psychological leaks.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="border-border bg-card/60 transition-all duration-200 hover:border-primary/40 hover:shadow-lg"
                >
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold mb-1.5 text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Visual Feature Spotlight */}
      <section className="border-b border-border py-20 relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/40 px-3 py-1 text-xs text-primary font-medium">
                <Bot className="h-3.5 w-3.5" /> AI Diagnostic Intelligence
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">AI Trade Analysis That Gets Specific</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                TradeLens studies the behavior behind your results and turns it into clear, evidence-based actions you can use in your next session.
              </p>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-profit shrink-0" />
                  <span>Calculates multi-factor performance grade (A+ to F)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-profit shrink-0" />
                  <span>Detects revenge trading re-entries post-loss</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-profit shrink-0" />
                  <span>Measures loss aversion and position-size discipline</span>
                </div>
              </div>
            </div>

            {/* Visual Card with AI Analyst BG */}
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl bg-card">
              <div
                className="h-64 sm:h-80 bg-cover bg-center relative"
                style={{ backgroundImage: `url('/images/ai-analyst-bg.jpg')` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-card/85 backdrop-blur-md border border-border/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">TradeLens AI Engine</span>
                    <span className="text-[11px] font-bold text-profit">Grade: A- (94% Edge)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    "Your biggest weakness this week was overtrading after losses."
                  </p>
                  <div className="mt-3 grid gap-2 text-[10px] text-foreground/80">
                    <div className="rounded-md border border-profit/20 bg-profit/5 px-3 py-2">Highest-performing session: <span className="font-semibold text-profit">68% win rate</span></div>
                    <div className="rounded-md border border-loss/20 bg-loss/5 px-3 py-2">Position size increased <span className="font-semibold text-loss">34%</span> after two losses</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b border-border bg-card/20 py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-profit">A better feedback loop</p><h2 className="mt-3 text-2xl font-bold md:text-3xl">From raw history to better decisions.</h2></div>
          <div className="relative mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
            {[
              ['01', 'Connect', 'Connect your MT4 or MT5 account.', Plug],
              ['02', 'Analyze', 'TradeLens automatically analyzes your trading history.', LineChart],
              ['03', 'Improve', 'Use performance and behavioral insights to improve your trading decisions.', TrendingUp],
            ].map(([number, title, description, Icon]) => <div key={String(number)} className="flex gap-4 md:block md:text-center"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-profit/30 bg-profit/5 text-profit md:mx-auto"><Icon className="h-5 w-5" /></div><div className="md:mt-4"><p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground">{String(number)}</p><h3 className="mt-1 text-sm font-semibold">{String(title)}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{String(description)}</p></div></div>)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-20">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url('/images/metatrader-sync-bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />

        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <BarChart3 className="mx-auto mb-6 h-12 w-12 text-primary/70" />
          <h2 className="text-2xl font-bold md:text-3xl">Ready to master your trading performance?</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Connect your MetaTrader 4/5 terminal or import your CSV trade history to start analyzing right away.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild className="shadow-md shadow-primary/20">
              <Link href={user ? '/dashboard' : '/signup'}>
                Start Analyzing Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" onClick={startDemo} className="bg-card/60 backdrop-blur-sm">
              Explore Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LineChart className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">TradeLens</span>
            </div>
            <p className="text-xs text-muted-foreground text-center md:text-right max-w-md">
              TradeLens is a trading journal and quantitative analytics platform. It does not execute trades, manage funds, or provide financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
