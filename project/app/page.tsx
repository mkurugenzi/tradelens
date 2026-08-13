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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/app-context';

const features = [
  {
    icon: TrendingUp,
    title: 'Powerful Trade Analytics',
    description: 'Import your MT4 and MT5 trade history and get instant insights into your performance with detailed statistics.',
  },
  {
    icon: LineChart,
    title: 'Performance Tracking',
    description: 'Visualize your balance progression, drawdown periods, and key performance metrics with interactive charts.',
  },
  {
    icon: Filter,
    title: 'Advanced Filtering',
    description: 'Slice and dice your trade data by symbol, direction, session, day of week, profit range, and more.',
  },
  {
    icon: Shield,
    title: 'Risk Analysis',
    description: 'Understand your drawdown patterns, risk-reward ratios, and position sizing with dedicated analytics.',
  },
  {
    icon: Users,
    title: 'Multi-Account Support',
    description: 'Manage multiple trading accounts independently. Track your FTMO challenge, personal account, and demo all in one place.',
  },
  {
    icon: Plug,
    title: 'Future MT4/MT5 Sync',
    description: 'Automatic MetaTrader synchronization through Expert Advisors is coming soon. For now, import your CSV history.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Insights',
    description: 'An upcoming AI analyst will examine your trading patterns and surface observations about your strengths and weaknesses.',
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
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LineChart className="h-5 w-5" />
            </div>
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
                  <Link href="/signup">Start Analyzing</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground">
              <span className="flex h-2 w-2 rounded-full bg-profit animate-pulse" />
              MT4 and MT5 CSV import supported now
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Understand Every Trade.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Turn your MT4 and MT5 trading history into clear performance insights. Import, analyze, and visualize your trading — no coding required.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href={user ? '/dashboard' : '/signup'}>
                  Start Analyzing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={startDemo}>
                Explore Demo
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required. Free to start.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-2xl font-bold md:text-3xl">Everything you need to analyze your trading</h2>
            <p className="mt-3 text-muted-foreground">
              TradeLens gives you the tools professional traders use to understand their performance — without the complexity.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-border">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <BarChart3 className="mx-auto mb-6 h-12 w-12 text-muted-foreground/60" />
          <h2 className="text-2xl font-bold md:text-3xl">Ready to understand your trading?</h2>
          <p className="mt-3 text-muted-foreground">
            Import your trade history and get instant insights. Or explore the demo to see what TradeLens can do.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={user ? '/dashboard' : '/signup'}>
                Start Analyzing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" onClick={startDemo}>
              Explore Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LineChart className="h-4 w-4" />
              </div>
              <span className="font-semibold">TradeLens</span>
            </div>
            <p className="text-xs text-muted-foreground text-center md:text-right max-w-md">
              TradeLens is an analysis tool. It does not execute trades, manage funds, or provide financial advice. All analytics are calculated from your imported trade data.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
