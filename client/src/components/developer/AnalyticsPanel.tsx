import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsPanel() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card">
          <CardHeader>
            <CardTitle className="typ-h3">Leads Over Time</CardTitle>
            <CardDescription>Daily lead volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Line chart placeholder</div>
            <div className="h-40 bg-secondary rounded-16" />
          </CardContent>
        </Card>
        <Card className="card">
          <CardHeader>
            <CardTitle className="typ-h3">Leads per Development</CardTitle>
            <CardDescription>Compare performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Bar chart placeholder</div>
            <div className="h-40 bg-secondary rounded-16" />
          </CardContent>
        </Card>
        <Card className="card">
          <CardHeader>
            <CardTitle className="typ-h3">Conversion Funnel</CardTitle>
            <CardDescription>From views to sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Funnel chart placeholder</div>
            <div className="h-40 bg-secondary rounded-16" />
          </CardContent>
        </Card>
      </div>

      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Traffic Sources</CardTitle>
          <CardDescription>Where visitors come from</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Heatmap/table placeholder</div>
          <div className="h-56 bg-secondary rounded-16" />
        </CardContent>
      </Card>
    </div>
  );
}
