'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Lock } from 'lucide-react';

export default function AIAnalystPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="AI Analyst" description="AI-powered observations about your trading patterns" />

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent mb-4">
            <Sparkles className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">AI Analyst Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            The AI Analyst will examine your trading patterns and surface observations about your strengths and weaknesses.
            It will distinguish between observed statistics, possible patterns, and general advice — never presenting uncertain patterns as guaranteed conclusions.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            This feature requires an AI API key to be configured.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">What the AI Analyst will provide</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0 text-xs font-bold">1</div>
            <div>
              <h4 className="text-sm font-medium mb-0.5">Observed Statistics</h4>
              <p className="text-xs text-muted-foreground">Factual summaries of your trading data — win rate by symbol, session performance, drawdown patterns.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0 text-xs font-bold">2</div>
            <div>
              <h4 className="text-sm font-medium mb-0.5">Possible Patterns</h4>
              <p className="text-xs text-muted-foreground">Correlations and trends the AI notices, clearly labeled as observations rather than guarantees.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0 text-xs font-bold">3</div>
            <div>
              <h4 className="text-sm font-medium mb-0.5">General Guidance</h4>
              <p className="text-xs text-muted-foreground">Educational suggestions based on established trading principles, not specific trade recommendations.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
