'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/app-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Settings, User, Shield, Palette, Wallet } from 'lucide-react';
import type { Platform } from '@/lib/types';
import { formatCurrencyPlain } from '@/lib/format';

export default function SettingsPage() {
  const { isDemo, accounts, activeAccountId, setLiveAccounts, allAccountTrades } = useApp();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (isDemo) {
    return (
      <div className="space-y-4">
        <PageHeader title="Settings" description="Manage your account and preferences" />
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Settings className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="font-medium mb-1">Demo Mode</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              You're exploring the demo. Sign up for a free account to manage your own trading accounts, import trades, and customize your settings.
            </p>
            <Button onClick={() => window.location.href = '/signup'}>Create Free Account</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Manage your account and preferences" />

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts"><Wallet className="h-4 w-4 mr-1.5" />Accounts</TabsTrigger>
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-1.5" />Profile</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1.5" />Security</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="h-4 w-4 mr-1.5" />Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Your Trading Accounts</h3>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />Create Account</Button>
              </DialogTrigger>
              <CreateAccountDialog
                userId={user?.id ?? ''}
                onCreated={() => {
                  setShowCreate(false);
                  setSuccess('Account created successfully!');
                  setTimeout(() => setSuccess(''), 3000);
                }}
                onError={(msg) => setError(msg)}
              />
            </Dialog>
          </div>

          <div className="space-y-2">
            {accounts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No trading accounts yet. Create one to get started.
                </CardContent>
              </Card>
            ) : (
              accounts.map((acc) => (
                <Card key={acc.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{acc.account_name}</span>
                        <Badge variant="outline">{acc.platform}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {acc.broker} • {formatCurrencyPlain(acc.initial_balance, acc.currency)} start • {allAccountTrades.get(acc.id)?.length ?? 0} trades
                      </p>
                    </div>
                    <DeleteAccountButton accountId={acc.id} accountName={acc.account_name} onDeleted={() => setSuccess('Account deleted.')} onError={setError} />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">Profile</CardTitle><CardDescription>Your account information</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div><Label className="text-xs text-muted-foreground">Email</Label><p className="text-sm font-medium">{user?.email}</p></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader><CardTitle className="text-base">Change Password</CardTitle><CardDescription>Update your account password</CardDescription></CardHeader>
            <CardContent>
              <ChangePasswordForm userEmail={user?.email ?? ''} onSuccess={() => setSuccess('Password updated.')} onError={setError} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader><CardTitle className="text-base">Appearance</CardTitle><CardDescription>Customize how TradeLens looks</CardDescription></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">TradeLens uses a dark theme optimized for financial data. Light theme support is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateAccountDialog({ userId, onCreated, onError }: { userId: string; onCreated: () => void; onError: (msg: string) => void }) {
  const [name, setName] = useState('');
  const [broker, setBroker] = useState('');
  const [platform, setPlatform] = useState<Platform>('MT5');
  const [currency, setCurrency] = useState('USD');
  const [initialBalance, setInitialBalance] = useState('10000');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { onError('Please enter an account name.'); return; }
    setLoading(true);
    const { data, error } = await supabase.from('trading_accounts').insert({
      account_name: name.trim(),
      broker: broker.trim() || 'Unknown',
      platform,
      currency,
      initial_balance: parseFloat(initialBalance) || 0,
      current_balance: parseFloat(initialBalance) || 0,
    }).select().single();
    setLoading(false);
    if (error) { onError(error.message); return; }
    onCreated();
    setName(''); setBroker(''); setInitialBalance('10000');
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Create Trading Account</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label htmlFor="acct-name">Account Name</Label><Input id="acct-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FTMO Challenge" /></div>
        <div><Label htmlFor="broker">Broker</Label><Input id="broker" value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="e.g. IC Markets" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Platform</Label><Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MT4">MT4</SelectItem><SelectItem value="MT5">MT5</SelectItem></SelectContent></Select></div>
          <div><Label>Currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="JPY">JPY</SelectItem></SelectContent></Select></div>
        </div>
        <div><Label htmlFor="balance">Initial Balance</Label><Input id="balance" type="number" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} /></div>
        <div className="flex justify-end gap-2 pt-2"><Button onClick={handleCreate} disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</Button></div>
      </div>
    </DialogContent>
  );
}

function DeleteAccountButton({ accountId, accountName, onDeleted, onError }: { accountId: string; accountName: string; onDeleted: () => void; onError: (msg: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await supabase.from('trading_accounts').delete().eq('id', accountId);
    setLoading(false);
    if (error) { onError(error.message); return; }
    onDeleted();
    setConfirming(false);
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Delete "{accountName}"?</span>
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>{loading ? '...' : 'Yes'}</Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>No</Button>
      </div>
    );
  }

  return <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}><Trash2 className="h-4 w-4" /></Button>;
}

function ChangePasswordForm({ userEmail, onSuccess, onError }: { userEmail: string; onSuccess: () => void; onError: (msg: string) => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (newPassword.length < 6) { onError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { onError(error.message); return; }
    onSuccess();
    setNewPassword('');
  };

  return (
    <div className="space-y-3 max-w-sm">
      <div><Label htmlFor="new-pw">New Password</Label><Input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" /></div>
      <Button onClick={handleChange} disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
    </div>
  );
}
