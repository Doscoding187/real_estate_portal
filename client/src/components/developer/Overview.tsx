import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Home, ClipboardList } from 'lucide-react';

export default function Overview() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Total Leads', value: '0', icon: Users },
          { title: 'Total Sales', value: '0', icon: TrendingUp },
          { title: 'Active Developments', value: '0', icon: Home },
          { title: 'Pending Tasks', value: '0', icon: ClipboardList },
        ].map(({ title, value, icon: Icon }) => (
          <Card key={title} className="card metric-card">
            <CardHeader className="pb-2">
              <CardDescription>{title}</CardDescription>
              <CardTitle className="typ-h3 flex items-center gap-2">
                <Icon className="h-5 w-5 text-muted-foreground" /> {value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card">
          <CardHeader>
            <CardTitle className="typ-h3">Leads per Day</CardTitle>
            <CardDescription>Recent lead activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Chart placeholder</div>
            <div className="bg-secondary h-40 rounded-16" />
          </CardContent>
        </Card>

        <Card className="card">
          <CardHeader>
            <CardTitle className="typ-h3">Traffic Sources</CardTitle>
            <CardDescription>Where your traffic comes from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Chart placeholder</div>
            <div className="bg-secondary h-40 rounded-16" />
          </CardContent>
        </Card>
      </div>

      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Units Sold vs Available</CardTitle>
          <CardDescription>Inventory breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary">Sold: 0</Badge>
            <Badge variant="outline">Available: 0</Badge>
          </div>
          <div className="bg-secondary h-6 rounded-16 mt-4" />
        </CardContent>
      </Card>
    </div>
  );
}
