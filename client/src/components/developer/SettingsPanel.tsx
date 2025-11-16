import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SettingsPanel() {
  return (
    <div className="space-y-6">
      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Company Details</CardTitle>
          <CardDescription>Update your organization information</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1">Company Name</label>
            <Input className="input" placeholder="Acme Developments" />
          </div>
          <div>
            <label className="text-sm block mb-1">Website</label>
            <Input className="input" placeholder="https://" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm block mb-1">Address</label>
            <Input className="input" placeholder="Street, City, Country" />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button className="btn btn-primary">Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Team Members</CardTitle>
          <CardDescription>Manage who can access your dashboard</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Invite or remove members.</div>
          <Button className="btn btn-secondary">Manage Team</Button>
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Billing & Subscription</CardTitle>
          <CardDescription>Plan, invoices, and payment methods</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="font-medium">Current Plan: Free</div>
            <div className="text-sm text-muted-foreground">Upgrade for more features</div>
          </div>
          <Button className="btn btn-primary">View Billing</Button>
        </CardContent>
      </Card>
    </div>
  );
}
