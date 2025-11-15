import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function IntegrationsPanel() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Integrations</h2>
      <Card>
        <CardHeader>
          <CardTitle>API Settings</CardTitle>
          <CardDescription>Webhook URLs and credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm">Webhook URL</label>
            <Input placeholder="https://example.com/webhook" />
          </div>
          <div>
            <label className="text-sm">API Key</label>
            <Input placeholder="********" type="password" />
          </div>
          <Button>Save</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
          <CardDescription>External CRM/ERP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Not connected.</div>
        </CardContent>
      </Card>
    </div>
  );
}
