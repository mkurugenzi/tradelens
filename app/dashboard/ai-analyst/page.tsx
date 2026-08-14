'use client';

import { useState } from 'react';
import { useApp } from '@/lib/app-context';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, AlertCircle, Lock, TrendingUp, Lightbulb, BarChart3 } from 'lucide-react';

export default function AIAnalystPage() {
  const { isDemo, activeAccount, activeTrades } = useApp();
  const { session } = useAuth();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isDemo) {
    return (
      <div className="space-y-4">
        <PageHeader title="AI Analyst" description="AI-powered observations about your trading patterns" />
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="font-medium mb-1">Demo Mode</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              You're exploring the demo. Sign up to have the AI analyze your real trading data.
            </p>
            <Button onClick={() => window.location.href = '/signup'}>Create Free Account</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="space-y-4">
        <PageHeader title="AI Analyst" description="AI-powered observations about your trading patterns" />
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Create a trading account and import trades first, then the AI can analyze them.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTrades.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="AI Analyst" description="AI-powered observations about your trading patterns" />
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="font-medium mb-1">No trades to analyze yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Import or sync your trade history first. The AI needs at least a few trades to provide meaningful analysis.
            </p>
            <Button onClick={() => window.location.href = '/dashboard/import'}>Import Trades</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-analyst`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({ accountId: activeAccount.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      if (!data.analysis) {
        throw new Error('No analysis returned from the AI.');
      }
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="AI Analyst" description="AI-powered observations about your trading patterns" />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!analysis && !loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Analyze Your Trading</h3>
                <p className="text-sm text-muted-foreground">
                  The AI will examine your {activeTrades.length} trades on "{activeAccount.account_name}" and provide insights about your trading patterns.
                  It distinguishes between observed statistics, possible patterns, and general guidance — never presenting uncertain patterns as guaranteed conclusions.
                </p>
              </div>
            </div>
            <Button onClick={handleAnalyze} size="lg">
              <Sparkles className="h-4 w-4 mr-2" /> Generate AI Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h3 className="font-medium mb-1">Analyzing your trades...</h3>
            <p className="text-sm text-muted-foreground">This takes a few seconds while the AI reviews your trading data.</p>
          </CardContent>
        </Card>
      )}

      {analysis && !loading && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> AI Analysis
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleAnalyze}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Regenerate
              </Button>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis) }} />
            </CardContent>
          </Card>

          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  This analysis is generated by AI based on your historical trade data. It provides observations and general guidance — not specific trade recommendations.
                  Past performance does not guarantee future results. Always do your own research before making trading decisions.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* What the AI provides */}
      {!analysis && !loading && (
        <Card>
          <CardHeader><CardTitle className="text-base">What the AI Analyst provides</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0"><TrendingUp className="h-4 w-4" /></div>
              <div>
                <h4 className="text-sm font-medium mb-0.5">Observed Statistics</h4>
                <p className="text-xs text-muted-foreground">Factual summaries of your trading data — win rate by symbol, session performance, drawdown patterns.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0"><Lightbulb className="h-4 w-4" /></div>
              <div>
                <h4 className="text-sm font-medium mb-0.5">Possible Patterns</h4>
                <p className="text-xs text-muted-foreground">Correlations and trends the AI notices, clearly labeled as observations rather than guarantees.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0"><BarChart3 className="h-4 w-4" /></div>
              <div>
                <h4 className="text-sm font-medium mb-0.5">General Guidance</h4>
                <p className="text-xs text-muted-foreground">Educational suggestions based on established trading principles, not specific trade recommendations.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-5 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="text-xs bg-accent px-1 rounded">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hl])/m, '<p>')
    .replace(/$/m, '</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-3])/g, '$1')
    .replace(/(<\/h[1-3]>)<\/p>/g, '$1')
    .replace(/<p>(<li)/g, '<ul>$1')
    .replace(/(<\/li>)<\/p>/g, '$1</ul>')
    .replace(/<\/ul><ul>/g, '');
}
