'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plug, Lock, Clock } from 'lucide-react';

export default function ConnectionsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Connections" description="Connect your MetaTrader accounts for automatic sync" />

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent shrink-0">
              <Plug className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">MetaTrader 5</h3>
                <Badge variant="outline" className="text-muted-foreground">Not connected</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Connect your MT5 account to automatically sync trades. An Expert Advisor (EA) installed on your MetaTrader terminal will push trade data to TradeLens.
              </p>
              <Button disabled>
                <Lock className="h-4 w-4 mr-2" />
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent shrink-0">
              <Plug className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">MetaTrader 4</h3>
                <Badge variant="outline" className="text-muted-foreground">Not connected</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Connect your MT4 account to automatically sync trades. An Expert Advisor (EA) installed on your MetaTrader terminal will push trade data to TradeLens.
              </p>
              <Button disabled>
                <Lock className="h-4 w-4 mr-2" />
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Automatic MetaTrader sync is under development. In the meantime, you can import your trade history manually using CSV files exported from MT4 or MT5.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/dashboard/import'}>
            Import Trades Manually
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
