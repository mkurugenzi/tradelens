'use client';

import { useState, useCallback } from 'react';
import { useApp } from '@/lib/app-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, Plus, X } from 'lucide-react';
import type { Trade, Platform } from '@/lib/types';

const TRADE_FIELDS = [
  { key: 'ticket', label: 'Ticket' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'trade_type', label: 'Direction (Buy/Sell)' },
  { key: 'volume', label: 'Volume / Lots' },
  { key: 'open_time', label: 'Open Time' },
  { key: 'close_time', label: 'Close Time' },
  { key: 'open_price', label: 'Open Price' },
  { key: 'close_price', label: 'Close Price' },
  { key: 'stop_loss', label: 'Stop Loss' },
  { key: 'take_profit', label: 'Take Profit' },
  { key: 'profit', label: 'Gross Profit' },
  { key: 'commission', label: 'Commission' },
  { key: 'swap', label: 'Swap' },
  { key: 'net_profit', label: 'Net Profit' },
  { key: 'comment', label: 'Comment' },
  { key: 'magic_number', label: 'Magic Number' },
];

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done';

export default function ImportPage() {
  const { isDemo, accounts, activeAccountId, setLiveAccounts, allAccountTrades } = useApp();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; duplicates: number; failed: number; total: number } | null>(null);

  if (isDemo) {
    return (
      <div className="space-y-4">
        <PageHeader title="Import Trades" description="Import your MT4 or MT5 trade history" />
        <EmptyState
          title="Demo mode"
          description="You're exploring the demo. Sign up for a free account to import your own trade history and start analyzing your performance."
          actionLabel="Create Free Account"
          onAction={() => window.location.href = '/signup'}
          icon={<Upload className="h-12 w-12" />}
        />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Import Trades" description="Import your MT4 or MT5 trade history" />
        <EmptyState
          title="No trading account yet"
          description="Create your first trading account before importing trades."
          actionLabel="Create Account"
          onAction={() => window.location.href = '/dashboard/settings'}
          icon={<Plus className="h-12 w-12" />}
        />
      </div>
    );
  }

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '');
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length === 0) return;
      const parsedHeaders = lines[0].split(/[,\t;]/).map((h) => h.trim().replace(/"/g, ''));
      const parsedRows = lines.slice(1, 101).map((l) => l.split(/[,\t;]/).map((c) => c.trim().replace(/"/g, '')));
      setHeaders(parsedHeaders);
      setRows(parsedRows);

      // Auto-detect mapping
      const autoMap: Record<string, string> = {};
      for (const field of TRADE_FIELDS) {
        const match = parsedHeaders.find((h) => {
          const hl = h.toLowerCase();
          const fl = field.key.toLowerCase();
          const flLabel = field.label.toLowerCase();
          return hl === fl || hl === flLabel || hl.includes(fl) || hl.includes(flLabel.split(' ')[0]);
        });
        if (match) autoMap[field.key] = match;
      }
      setMapping(autoMap);
      setStep('map');
    };
    reader.readAsText(f);
  };

  const validateRow = (row: string[], map: Record<string, string>): { valid: boolean; trade?: Partial<Trade>; error?: string } => {
    const getVal = (key: string) => {
      const col = map[key];
      if (!col) return undefined;
      const idx = headers.indexOf(col);
      return idx >= 0 ? row[idx] : undefined;
    };

    const required = ['symbol', 'open_time', 'close_time', 'open_price', 'close_price'];
    for (const req of required) {
      if (!getVal(req)) return { valid: false, error: `Missing ${req}` };
    }

    const direction = (getVal('trade_type') ?? '').toLowerCase();
    if (direction && direction !== 'buy' && direction !== 'sell' && direction !== 'b' && direction !== 's') {
      return { valid: false, error: `Invalid direction: ${direction}` };
    }

    const openTime = new Date(getVal('open_time')!);
    const closeTime = new Date(getVal('close_time')!);
    if (isNaN(openTime.getTime())) return { valid: false, error: 'Invalid open time' };
    if (isNaN(closeTime.getTime())) return { valid: false, error: 'Invalid close time' };

    const durationMin = Math.round((closeTime.getTime() - openTime.getTime()) / 60000);

    const tradeType: 'BUY' | 'SELL' = direction.startsWith('s') ? 'SELL' : 'BUY';
    const volume = parseFloat(getVal('volume') ?? '0') || 0;
    const openPrice = parseFloat(getVal('open_price')!) || 0;
    const closePrice = parseFloat(getVal('close_price')!) || 0;
    const profit = parseFloat(getVal('profit') ?? '0') || 0;
    const commission = parseFloat(getVal('commission') ?? '0') || 0;
    const swap = parseFloat(getVal('swap') ?? '0') || 0;
    const netProfit = getVal('net_profit') ? parseFloat(getVal('net_profit')!) : profit + commission + swap;
    const stopLoss = getVal('stop_loss') ? parseFloat(getVal('stop_loss')!) : null;
    const takeProfit = getVal('take_profit') ? parseFloat(getVal('take_profit')!) : null;
    const ticket = getVal('ticket') ?? `imp-${Date.now()}-${Math.random()}`;
    const comment = getVal('comment') ?? null;
    const magicNumber = getVal('magic_number') ? parseInt(getVal('magic_number')!) : null;

    return {
      valid: true,
      trade: {
        ticket: String(ticket),
        symbol: String(getVal('symbol')),
        trade_type: tradeType,
        volume,
        open_time: openTime.toISOString(),
        close_time: closeTime.toISOString(),
        open_price: openPrice,
        close_price: closePrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        profit,
        commission,
        swap,
        net_profit: netProfit,
        comment,
        magic_number: magicNumber,
        duration_minutes: durationMin,
      },
    };
  };

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);

    const allRows = file ? await readFileAllRows(file) : [];
    const validTrades: Partial<Trade>[] = [];
    const duplicates: string[] = [];
    const failed: { row: number; error: string }[] = [];

    const existingTickets = new Set(
      (allAccountTrades.get(activeAccountId ?? '') ?? []).map((t) => t.ticket)
    );

    for (let i = 0; i < allRows.length; i++) {
      const result = validateRow(allRows[i], mapping);
      if (result.valid && result.trade) {
        if (existingTickets.has(result.trade.ticket!)) {
          duplicates.push(result.trade.ticket!);
        } else {
          validTrades.push(result.trade);
        }
      } else {
        failed.push({ row: i + 2, error: result.error ?? 'Unknown error' });
      }
      setProgress(Math.round(((i + 1) / allRows.length) * 100));
    }

    // Insert valid trades
    let successCount = 0;
    if (validTrades.length > 0 && activeAccountId) {
      const tradesToInsert = validTrades.map((t) => ({ ...t, account_id: activeAccountId }));
      const { data: inserted, error } = await supabase.from('trades').insert(tradesToInsert).select('id');
      if (!error && inserted) {
        successCount = inserted.length;
      } else if (error) {
        // Check for unique constraint violations
        if (error.code === '23505') {
          successCount = validTrades.length - 1;
        }
      }
    }

    // Update account balance
    if (activeAccountId && successCount > 0) {
      const account = accounts.find((a) => a.id === activeAccountId);
      if (account) {
        const newBalance = account.initial_balance + validTrades.slice(0, successCount).reduce((s, t) => s + (t.net_profit ?? 0), 0);
        await supabase.from('trading_accounts').update({ current_balance: newBalance, updated_at: new Date().toISOString() }).eq('id', activeAccountId);
      }
    }

    // Record import job
    if (activeAccountId) {
      await supabase.from('import_jobs').insert({
        account_id: activeAccountId,
        filename: file?.name ?? 'unknown.csv',
        status: failed.length > 0 && successCount > 0 ? 'partial' : successCount > 0 ? 'completed' : 'failed',
        total_rows: allRows.length,
        successful_rows: successCount,
        failed_rows: failed.length,
        duplicate_rows: duplicates.length,
      });
    }

    setImportResult({
      success: successCount,
      duplicates: duplicates.length,
      failed: failed.length,
      total: allRows.length,
    });
    setErrors(failed.slice(0, 10).map((f) => `Row ${f.row}: ${f.error}`));
    setStep('done');
  };

  const readFileAllRows = async (f: File): Promise<string[][]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = String(e.target?.result ?? '');
        const lines = text.split('\n').filter((l) => l.trim());
        resolve(lines.slice(1).map((l) => l.split(/[,\t;]/).map((c) => c.trim().replace(/"/g, ''))));
      };
      reader.readAsText(f);
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Import Trades" description="Import your MT4 or MT5 trade history from a CSV file" />

      {step === 'upload' && (
        <Card>
          <CardContent className="p-6">
            <div
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById('csv-upload')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-medium mb-1">Drop your CSV file here</h3>
              <p className="text-sm text-muted-foreground mb-4">or click to browse — MT4 and MT5 export formats supported</p>
              <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <p className="mb-1">To export from MetaTrader:</p>
              <ol className="list-decimal list-inside space-y-0.5 ml-2">
                <li>Open your MT4/MT5 terminal</li>
                <li>Go to the Account History tab</li>
                <li>Right-click and select Report → Open (or Save as Report)</li>
                <li>Save as CSV and upload it here</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'map' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Map Columns</CardTitle>
              <Badge variant="outline">{file?.name}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We've auto-detected your columns. Review and adjust the mapping below.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TRADE_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <Label className="w-32 text-xs shrink-0">{field.label}</Label>
                  <Select
                    value={mapping[field.key] ?? 'none'}
                    onValueChange={(v) => setMapping({ ...mapping, [field.key]: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Not mapped —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => { setStep('upload'); setFile(null); }}><X className="h-4 w-4 mr-1" />Cancel</Button>
              <Button onClick={() => setStep('preview')}>Preview <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Preview & Validate</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Ticket</th>
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-left p-2">Dir</th>
                    <th className="text-right p-2">Vol</th>
                    <th className="text-left p-2">Open Time</th>
                    <th className="text-left p-2">Close Time</th>
                    <th className="text-right p-2">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => {
                    const result = validateRow(row, mapping);
                    return (
                      <tr key={i} className="border-b border-border/50">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2">{mapping.ticket ? row[headers.indexOf(mapping.ticket)] : '—'}</td>
                        <td className="p-2 font-medium">{mapping.symbol ? row[headers.indexOf(mapping.symbol)] : '—'}</td>
                        <td className="p-2">{mapping.trade_type ? row[headers.indexOf(mapping.trade_type)] : '—'}</td>
                        <td className="p-2 text-right">{mapping.volume ? row[headers.indexOf(mapping.volume)] : '—'}</td>
                        <td className="p-2 text-muted-foreground">{mapping.open_time ? row[headers.indexOf(mapping.open_time)] : '—'}</td>
                        <td className="p-2 text-muted-foreground">{mapping.close_time ? row[headers.indexOf(mapping.close_time)] : '—'}</td>
                        <td className="p-2 text-right">{mapping.net_profit ? row[headers.indexOf(mapping.net_profit)] : mapping.profit ? row[headers.indexOf(mapping.profit)] : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">Showing first 10 rows. Duplicates (same ticket) will be skipped during import.</p>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('map')}>Back</Button>
              <Button onClick={handleImport}>Import {rows.length} rows <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'importing' && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="font-medium mb-2">Importing trades...</h3>
            <div className="w-full max-w-sm mx-auto bg-accent rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
          </CardContent>
        </Card>
      )}

      {step === 'done' && importResult && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-profit" />
              <h3 className="text-lg font-semibold">Import Complete</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Total Rows</div><div className="text-xl font-bold">{importResult.total}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Imported</div><div className="text-xl font-bold text-profit">{importResult.success}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Duplicates</div><div className="text-xl font-bold text-warning">{importResult.duplicates}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Failed</div><div className="text-xl font-bold text-loss">{importResult.failed}</div></div>
            </div>
            {errors.length > 0 && (
              <Alert><AlertCircle className="h-4 w-4" /><AlertDescription><div className="text-xs space-y-0.5">{errors.map((e, i) => <div key={i}>{e}</div>)}</div></AlertDescription></Alert>
            )}
            <div className="flex gap-2">
              <Button onClick={() => window.location.href = '/dashboard'}>View Dashboard</Button>
              <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); setImportResult(null); }}>Import Another File</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
