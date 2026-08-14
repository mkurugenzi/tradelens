'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/app-context';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plug, Download, RefreshCw, Copy, Check, Trash2, AlertCircle, CheckCircle2, Loader2, FileCode, Terminal } from 'lucide-react';
import type { Platform } from '@/lib/types';

interface ConnectionToken {
  id: string;
  account_id: string;
  token: string;
  status: string;
  platform: string;
  last_sync_at: string | null;
  created_at: string;
}

export default function ConnectionsPage() {
  const { isDemo, accounts, activeAccountId, activeAccount } = useApp();
  const [tokens, setTokens] = useState<ConnectionToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('MT5');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!activeAccountId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('connection_tokens')
      .select('*')
      .eq('account_id', activeAccountId);
    setLoading(false);
    if (error) { setError(error.message); return; }
    setTokens(data ?? []);
  }, [activeAccountId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  if (isDemo) {
    return (
      <div className="space-y-4">
        <PageHeader title="Connections" description="Connect your MetaTrader accounts for automatic sync" />
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Plug className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="font-medium mb-1">Demo Mode</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              You're exploring the demo. Sign up to connect your real MetaTrader accounts and sync trades automatically.
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
        <PageHeader title="Connections" description="Connect your MetaTrader accounts for automatic sync" />
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Create a trading account first, then connect it to MetaTrader.
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeToken = tokens.find((t) => t.status === 'active');

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    const tokenStr = generateToken();
    const { data, error } = await supabase
      .from('connection_tokens')
      .insert({
        account_id: activeAccountId,
        token: tokenStr,
        platform: selectedPlatform,
        status: 'active',
      })
      .select()
      .single();

    setCreating(false);
    if (error) {
      if (error.code === '23505') {
        setError('This account already has a connection token. Revoke it first, then create a new one.');
      } else {
        setError(error.message);
      }
      return;
    }
    if (data) {
      setTokens([data, ...tokens.filter((t) => t.status === 'active')]);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    const { error } = await supabase
      .from('connection_tokens')
      .delete()
      .eq('id', tokenId);
    if (error) { setError(error.message); return; }
    setTokens(tokens.filter((t) => t.id !== tokenId));
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const webhookUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mt-webhook`;

  return (
    <div className="space-y-4">
      <PageHeader title="Connections" description="Connect your MetaTrader accounts for automatic sync" />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">MetaTrader Connection</CardTitle>
              <CardDescription>Account: {activeAccount.account_name}</CardDescription>
            </div>
            {activeToken ? (
              <Badge className="bg-profit/15 text-profit border-profit/30">Connected ({activeToken.platform})</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Not connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activeToken ? (
            <div className="space-y-4">
              {/* Token display */}
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1.5 block">Connection Token</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-md bg-accent text-xs font-mono break-all">
                    {activeToken.token}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => handleCopy(activeToken.token, 'token')}>
                    {copied === 'token' ? <Check className="h-4 w-4 text-profit" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Webhook URL */}
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1.5 block">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-md bg-accent text-xs font-mono break-all">
                    {webhookUrl}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => handleCopy(webhookUrl, 'webhook')}>
                    {copied === 'webhook' ? <Check className="h-4 w-4 text-profit" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Last sync */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Last sync:</span>
                {activeToken.last_sync_at ? (
                  <span className="font-medium">{new Date(activeToken.last_sync_at).toLocaleString()}</span>
                ) : (
                  <span className="text-muted-foreground italic">No trades synced yet</span>
                )}
              </div>

              {/* Download EA */}
              <div className="pt-2 border-t border-border">
                <label className="text-xs text-muted-foreground uppercase mb-2 block">Download Expert Advisor</label>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href="/ea/TradeLensSync.mq5" download>
                      <Download className="h-4 w-4 mr-1.5" /> MT5 EA (.mq5)
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href="/ea/TradeLensSync.mq4" download>
                      <Download className="h-4 w-4 mr-1.5" /> MT4 EA (.mq4)
                    </a>
                  </Button>
                </div>
              </div>

              {/* Revoke */}
              <div className="pt-2 border-t border-border">
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRevoke(activeToken.id)}>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Revoke Connection
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <FileCode className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Generate a connection token, then download and install the Expert Advisor script on your MetaTrader terminal.
                  The EA will automatically push your closed trades to TradeLens every few minutes.
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase mb-1.5 block">Select Platform</label>
                <Select value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as Platform)}>
                  <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MT5">MetaTrader 5</SelectItem>
                    <SelectItem value="MT4">MetaTrader 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />}
                {creating ? 'Creating...' : 'Generate Connection Token'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      {activeToken && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" /> Setup Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                <div className="flex-1">
                  <p className="font-medium mb-0.5">Download the EA script</p>
                  <p className="text-muted-foreground">Download the {activeToken.platform} Expert Advisor file above.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                <div className="flex-1">
                  <p className="font-medium mb-0.5">Install in MetaTrader</p>
                  <p className="text-muted-foreground">
                    Copy the file to your MetaTrader <code className="text-xs bg-accent px-1 rounded">MQL4/Experts</code> or
                    <code className="text-xs bg-accent px-1 rounded ml-1">MQL5/Experts</code> folder.
                    In MetaTrader: File → Open Data Folder → navigate to the Experts folder.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
                <div className="flex-1">
                  <p className="font-medium mb-0.5">Allow the webhook URL</p>
                  <p className="text-muted-foreground">
                    In MetaTrader: Tools → Options → Expert Advisors. Check "Allow WebRequest for listed URL" and add:
                    <br />
                    <code className="text-xs bg-accent px-1.5 py-0.5 rounded mt-1 inline-block">
                      {process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '') ?? 'your-project.supabase.co'}
                    </code>
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">4</span>
                <div className="flex-1">
                  <p className="font-medium mb-0.5">Attach the EA to a chart</p>
                  <p className="text-muted-foreground">
                    Refresh the Navigator panel, find <strong>TradeLensSync</strong> under Expert Advisors, and drag it onto any chart.
                    When prompted, enter:
                  </p>
                  <div className="mt-2 space-y-1 text-xs bg-accent rounded-md p-3 font-mono">
                    <div>Webhook URL: <span className="text-primary">{webhookUrl}</span></div>
                    <div>Connection Token: <span className="text-primary">{activeToken.token}</span></div>
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">5</span>
                <div className="flex-1">
                  <p className="font-medium mb-0.5">Enable auto-trading</p>
                  <p className="text-muted-foreground">
                    Click the "Auto Trading" button in the toolbar. The EA will sync your closed trades every 5 minutes.
                    You can check the Experts tab for sync status messages.
                  </p>
                </div>
              </li>
            </ol>
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                The EA only syncs <strong>closed trades</strong> — it does not open or modify any positions.
                It runs in the background and does not interfere with your trading.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const segments = [8, 4, 4, 12];
  return segments
    .map((len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
    .join('-');
}
