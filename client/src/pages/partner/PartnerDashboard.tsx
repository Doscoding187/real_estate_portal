import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PartnerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Partner Dashboard</h1>
        <p className="text-muted-foreground">Coming soon</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partner Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This dashboard is under development. Please check back later.</p>
        </CardContent>
      </Card>
    </div>
  );
}
