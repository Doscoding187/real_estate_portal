import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MarketingTools() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card">
          <CardHeader>
            <CardTitle className="typ-h3">Feature Listing</CardTitle>
            <CardDescription>Boost visibility across the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Choose a featured package and duration.
            </div>
            <Button className="btn btn-primary w-full">Purchase Feature</Button>
          </CardContent>
        </Card>
        <Card className="card">
          <CardHeader>
            <CardTitle className="typ-h3">Boost Options</CardTitle>
            <CardDescription>Targeted promotion options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">Select boost tiers and budget.</div>
            <Button className="btn btn-primary w-full">Create Boost</Button>
          </CardContent>
        </Card>
        <Card className="card">
          <CardHeader>
            <CardTitle className="typ-h3">Landing Page</CardTitle>
            <CardDescription>Preview and publish</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-32 bg-secondary rounded-16" />
            <Button className="btn btn-secondary w-full">Open Builder</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Performance Overview</CardTitle>
          <CardDescription>Track impressions, clicks, and conversions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-56 bg-secondary rounded-16" />
        </CardContent>
      </Card>
    </div>
  );
}
