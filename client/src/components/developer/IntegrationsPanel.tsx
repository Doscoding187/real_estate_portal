import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function IntegrationsPanel() {
  return (
    <div className="space-y-4">
      <h2 className="typ-h2">Integrations</h2>
      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">API Settings</CardTitle>
          <CardDescription>Webhook URLs and credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm">Webhook URL</label>
            <Input placeholder="https://example.com/webhook" className="input" />
          </div>
          <div>
            <label className="text-sm">API Key</label>
            <Input placeholder="********" type="password" className="input" />
          </div>
          <Button className="btn btn-primary">Save</Button>
        </CardContent>
      </Card>
      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Sync Status</CardTitle>
          <CardDescription>External CRM/ERP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Not connected.</div>
        </CardContent>
      </Card>
    </div>
  );
}
