import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MarketingCampaigns() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="typ-h2">Marketing & Campaigns</h2>
        <Button className="btn btn-primary">Boost Development</Button>
      </div>
      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Active Campaigns</CardTitle>
          <CardDescription>Impressions, clicks, cost, ROI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No active campaigns.</div>
        </CardContent>
      </Card>
      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Order Placements</CardTitle>
          <CardDescription>Order banners or featured placements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Coming soon.</div>
        </CardContent>
      </Card>
    </div>
  );
}
