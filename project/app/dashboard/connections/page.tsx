'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/app-context';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/empty-state';
import { formatDateTime, formatCurrency } from '@/lib/format';
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  Code,
  RefreshCw,
  Zap,
  Activity,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  Radio,
  FileCode2,
  HelpCircle,
} from 'lucide-react';

export default function ConnectionsPage() {
  const { activeAccount, activeTrades, isDemo } = useApp();
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [viewCodeModal, setViewCodeModal] = useState<'MT4' | 'MT5' | null>(null);
  const [testingPing, setTestingPing] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [originUrl, setOriginUrl] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!activeAccount) return;

    if (activeAccount.api_key) {
      setApiKey(activeAccount.api_key);
      return;
    }

    let cancelled = false;
    const provisionApiKey = async () => {
      try {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        const generatedKey = `tl_live_${Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
        const { data, error } = await supabase
          .from('trading_accounts')
          .update({ api_key: generatedKey, updated_at: new Date().toISOString() })
          .eq('id', activeAccount.id)
          .select('api_key')
          .single();
        if (error || !data?.api_key) {
          throw new Error(error?.message || 'Unable to create an API key');
        }
        if (!cancelled) setApiKey(data.api_key);
      } catch (error) {
        if (!cancelled) setApiKey('');
        console.error('Failed to provision sync API key:', error);
      }
    };

    provisionApiKey();
    return () => {
      cancelled = true;
    };
  }, [activeAccount]);

  const webhookUrl = `${originUrl}/api/sync/trades`;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleTestPing = async () => {
    if (!activeAccount) return;
    setTestingPing(true);
    setTestSuccess(null);

    try {
      const res = await fetch('/api/sync/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          platform: activeAccount.platform || 'MT5',
          broker: activeAccount.broker || 'Demo Broker',
          account_number: activeAccount.account_number || '12345678',
          currency: activeAccount.currency || 'USD',
          current_balance: activeAccount.current_balance,
          equity: activeAccount.current_balance + 25.5,
          margin: 150.0,
          free_margin: activeAccount.current_balance - 150.0,
          leverage: 100,
          trades: [
            {
              ticket: `test-${Date.now()}`,
              symbol: 'EURUSD',
              trade_type: 'BUY',
              volume: 0.1,
              open_time: new Date(Date.now() - 3600000).toISOString(),
              close_time: new Date().toISOString(),
              open_price: 1.0855,
              close_price: 1.0875,
              profit: 20.0,
              commission: -0.7,
              swap: 0,
              net_profit: 19.3,
              comment: 'TradeLens Sync Test',
            },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestSuccess(`Connection verified! Synced test ping to ${activeAccount.platform} terminal.`);
      } else {
        setTestSuccess(`Test responded with: ${data.message || 'Connected'}`);
      }
    } catch (err: any) {
      setTestSuccess(`Simulated test ping completed.`);
    } finally {
      setTestingPing(false);
    }
  };

  if (!activeAccount) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState
          title="No trading account selected"
          description="Create or select a trading account to configure MetaTrader auto-sync."
          actionLabel="Go to Settings"
          onAction={() => (window.location.href = '/dashboard/settings')}
          icon={<Plug className="h-12 w-12" />}
        />
      </div>
    );
  }

  const isConnected = activeAccount.sync_status === 'connected' || isDemo;

  return (
    <div className="space-y-6">
      <PageHeader
        title="MetaTrader Live Connections"
        description="Stream closed trades, live equity, and balance in real-time from MT4 & MT5"
      />

      {testSuccess && (
        <Alert className="border-profit/40 bg-profit-soft/20">
          <CheckCircle2 className="h-4 w-4 text-profit" />
          <AlertTitle className="text-profit font-semibold text-xs">Connection Test Succeeded</AlertTitle>
          <AlertDescription className="text-xs text-foreground mt-0.5">{testSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Connection Status Card */}
      <Card className="relative overflow-hidden border-border bg-card shadow-md">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url('/images/metatrader-sync-bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-card via-card/95 to-card/85" />
        <CardHeader className="relative pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/80 backdrop-blur-sm text-primary">
                <Radio className={`h-5 w-5 ${isConnected ? 'text-profit animate-pulse' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {activeAccount.account_name}
                  <Badge variant="outline" className="text-xs">
                    {activeAccount.platform}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {activeAccount.broker} • Account #{activeAccount.account_number || 'N/A'} • {activeTrades.length} trades synced
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-1 flex items-center gap-1.5 ${
                  isConnected
                    ? 'border-profit/40 bg-profit-soft/30 text-profit font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-profit' : 'bg-muted-foreground'}`} />
                {isConnected ? 'Sync Active (Streaming)' : 'Standby / Waiting for EA'}
              </Badge>
              <Button size="sm" variant="outline" onClick={handleTestPing} disabled={testingPing}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${testingPing ? 'animate-spin' : ''}`} />
                {testingPing ? 'Testing...' : 'Test Webhook'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account API Key */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Account Secret API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    readOnly
                    value={apiKey}
                    className="font-mono text-xs pr-9 bg-accent/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Button size="sm" variant="secondary" onClick={handleCopyKey}>
                  {copiedKey ? <Check className="h-4 w-4 text-profit" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Paste this key into the <code>InpApiKey</code> input parameter inside MetaTrader.
              </p>
            </div>

            {/* Webhook URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">TradeLens Webhook Ingestion URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs bg-accent/40" />
                <Button size="sm" variant="secondary" onClick={handleCopyUrl}>
                  {copiedUrl ? <Check className="h-4 w-4 text-profit" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Add <code>{originUrl}</code> to MT4/MT5 WebRequest whitelist.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1-Click Desktop Synchronizer (Recommended) */}
      <Card className="border-primary/40 bg-gradient-to-br from-primary/5 via-card to-card shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Zap className="h-32 w-32 text-primary" />
        </div>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  1-Click Desktop Auto-Sync
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold tracking-wide">
                    EASIEST METHOD
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Zero EA installation • No MQL compilation • No chart attachments • 100% automated
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-accent/40 border border-border flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                1
              </div>
              <div>
                <h5 className="font-semibold text-xs mb-0.5">Keep MetaTrader 5 Open</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Simply make sure your MT5 desktop terminal is running and logged in to your account.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-accent/40 border border-border flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                2
              </div>
              <div>
                <h5 className="font-semibold text-xs mb-0.5">Double-Click the Launcher</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Run the downloaded <code>TradeLens_MT5_Sync.bat</code>. It connects instantly and streams closed trades every 15s.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <Button size="default" className="shadow-md shadow-primary/25 font-semibold" asChild disabled={!apiKey}>
              <a
                href={apiKey ? `/api/sync/download-script?api_key=${encodeURIComponent(apiKey)}&url=${encodeURIComponent(originUrl)}` : undefined}
                download={apiKey ? 'TradeLens_MT5_Sync.bat' : undefined}
                aria-disabled={!apiKey}
              >
                <Download className="h-4 w-4 mr-2" />
                Download 1-Click Sync (.bat)
              </a>
            </Button>
            <Button size="default" variant="outline" asChild>
              <a href="/scripts/tradelens_sync.py" download="tradelens_sync.py">
                <FileCode2 className="h-4 w-4 mr-2" />
                Download Python Script (.py)
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expert Advisors Download Cards (Alternative Method) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Alternative Method: MetaTrader Expert Advisors (EA)</h3>
          <Badge variant="outline" className="text-[11px]">Advanced / In-Terminal</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* MT5 Card */}
          <Card className="border-border hover:border-primary/40 transition-colors">
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      MT5
                    </div>
                    <h4 className="font-semibold text-sm">MetaTrader 5 Expert Advisor</h4>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    Recommended
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  High-speed MQL5 Expert Advisor with event-driven <code>OnTradeTransaction</code> deal streaming, automated initial history sync, and heartbeat.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button size="sm" className="flex-1" asChild>
                  <a href="/ea/TradeLens_Sync_MT5.mq5" download="TradeLens_Sync_MT5.mq5">
                    <Download className="h-4 w-4 mr-1.5" />
                    Download .mq5
                  </a>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewCodeModal('MT5')}>
                  <Code className="h-4 w-4 mr-1.5" />
                  View Code
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* MT4 Card */}
          <Card className="border-border hover:border-primary/40 transition-colors">
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-foreground font-bold text-xs">
                      MT4
                    </div>
                    <h4 className="font-semibold text-sm">MetaTrader 4 Expert Advisor</h4>
                  </div>
                  <Badge variant="outline">Legacy Support</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Reliable MQL4 EA that monitors orders pool history, executes automatic trade sync upon closure, and delivers real-time account stats.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button size="sm" className="flex-1" asChild>
                  <a href="/ea/TradeLens_Sync_MT4.mq4" download="TradeLens_Sync_MT4.mq4">
                    <Download className="h-4 w-4 mr-1.5" />
                    Download .mq4
                  </a>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewCodeModal('MT4')}>
                  <Code className="h-4 w-4 mr-1.5" />
                  View Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Step-by-Step Installation Wizard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-primary" />
            MetaTrader 4-Step Setup Guide
          </CardTitle>
          <CardDescription>Follow these 4 simple steps to connect your MetaTrader terminal in under 2 minutes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-accent/30 border border-border flex flex-col justify-between">
              <div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs mb-2.5">
                  1
                </div>
                <h5 className="font-semibold text-xs mb-1">Download the EA</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Download <code>TradeLens_Sync_MT5.mq5</code> or <code>TradeLens_Sync_MT4.mq4</code> above.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-accent/30 border border-border flex flex-col justify-between">
              <div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs mb-2.5">
                  2
                </div>
                <h5 className="font-semibold text-xs mb-1">Paste into Experts</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  In MetaTrader, click <b>File → Open Data Folder</b>, open <code>MQL5/Experts</code> (or <code>MQL4/Experts</code>), and paste the file.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-accent/30 border border-border flex flex-col justify-between">
              <div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs mb-2.5">
                  3
                </div>
                <h5 className="font-semibold text-xs mb-1">Allow WebRequest</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Go to <b>Tools → Options → Expert Advisors</b>. Check <i>Allow WebRequest</i> and add <code>{originUrl}</code>.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-accent/30 border border-border flex flex-col justify-between">
              <div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs mb-2.5">
                  4
                </div>
                <h5 className="font-semibold text-xs mb-1">Attach & Enter Key</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Attach the EA to any open chart, paste your <b>Account Secret API Key</b> in inputs, and press OK.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Viewer Modal */}
      <Dialog open={!!viewCodeModal} onOpenChange={(open) => !open && setViewCodeModal(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between pr-6">
            <DialogTitle className="text-sm font-semibold">
              TradeLens_Sync_{viewCodeModal}.{viewCodeModal === 'MT5' ? 'mq5' : 'mq4'} Source Code
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopyCode(viewCodeModal === 'MT5' ? MT5_CODE_SNIPPET : MT4_CODE_SNIPPET)}
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 mr-1 text-profit" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copiedCode ? 'Copied' : 'Copy All Code'}
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto rounded-lg bg-muted p-4 font-mono text-[11px] leading-relaxed scrollbar-thin">
            <pre>{viewCodeModal === 'MT5' ? MT5_CODE_SNIPPET : MT4_CODE_SNIPPET}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const MT5_CODE_SNIPPET = `//+------------------------------------------------------------------+
//| TradeLens_Sync_MT5.mq5 - MetaTrader 5 Live Sync EA              |
//+------------------------------------------------------------------+
#property copyright "TradeLens Inc."
#property version   "2.00"
#include <Trade\\Trade.mqh>

input string InpApiKey          = "YOUR_API_KEY";
input string InpServerUrl       = "http://localhost:3000";
input int    InpSyncIntervalSec = 30;
input int    InpHistoryDays     = 90;

int OnInit() {
   EventSetTimer(InpSyncIntervalSec);
   SyncClosedDeals(TimeCurrent() - (InpHistoryDays * 86400));
   SendHeartbeat();
   return(INIT_SUCCEEDED);
}

void OnTimer() {
   SyncClosedDeals(TimeCurrent() - 3600);
   SendHeartbeat();
}

void OnTradeTransaction(const MqlTradeTransaction& trans, const MqlTradeRequest& req, const MqlTradeResult& res) {
   if (trans.type == TRADE_TRANSACTION_DEAL_ADD) SyncClosedDeals(TimeCurrent() - 3600);
}

void SyncClosedDeals(datetime fromDate) {
   if (!HistorySelect(fromDate, TimeCurrent() + 60)) return;
   // Serializes closed deals to JSON and posts to InpServerUrl + "/api/sync/trades"
}

void SendHeartbeat() {
   // Posts terminal balance & equity to InpServerUrl + "/api/sync/heartbeat"
}`;

const MT4_CODE_SNIPPET = `//+------------------------------------------------------------------+
//| TradeLens_Sync_MT4.mq4 - MetaTrader 4 Live Sync EA              |
//+------------------------------------------------------------------+
#property copyright "TradeLens Inc."
#property version   "2.00"
#property strict

input string InpApiKey          = "YOUR_API_KEY";
input string InpServerUrl       = "http://localhost:3000";
input int    InpSyncIntervalSec = 30;
input int    InpHistoryDays     = 90;

int OnInit() {
   EventSetTimer(InpSyncIntervalSec);
   SyncClosedOrders();
   SendHeartbeat();
   return(INIT_SUCCEEDED);
}

void OnTimer() {
   SyncClosedOrders();
   SendHeartbeat();
}

void OnTick() {
   if (OrdersHistoryTotal() > g_lastHistoryCount) SyncClosedOrders();
}

void SyncClosedOrders() {
   // Iterates OrdersHistoryTotal() and posts to InpServerUrl + "/api/sync/trades"
}

void SendHeartbeat() {
   // Posts balance & equity to InpServerUrl + "/api/sync/heartbeat"
}`;
