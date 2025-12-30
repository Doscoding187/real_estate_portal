import React from 'react';
import { useDeveloperContext } from '@/contexts/DeveloperContextProvider';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, Home, ArrowUpRight } from 'lucide-react';

const MetricCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; subtext?: string }> = ({ 
  title, value, icon, subtext 
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">
        {title}
      </CardTitle>
      <div className="text-muted-foreground">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </CardContent>
  </Card>
);

const PublisherMetrics: React.FC = () => {
  const { selectedBrandId } = useDeveloperContext();

  const { data: metrics, isLoading } = trpc.superAdminPublisher.getBrandMetrics.useQuery(
    { brandProfileId: selectedBrandId! },
    { enabled: !!selectedBrandId }
  );

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-lg"></div>)}
    </div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Brand Performance</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          title="Total Leads" 
          value={metrics?.totalLeads || 0} 
          icon={<Users className="h-4 w-4" />}
          subtext="All time inquiries"
        />
        <MetricCard 
          title="Developments" 
          value={metrics?.developmentCount || 0} 
          icon={<Building2 className="h-4 w-4" />}
          subtext="Active projects"
        />
         <MetricCard 
          title="Properties" 
          value={metrics?.propertyCount || 0} 
          icon={<Home className="h-4 w-4" />}
          subtext="Total units listed"
        />
      </div>
      
      <div className="bg-muted/10 p-6 rounded-lg border border-dashed border-muted-foreground/20 text-center">
         <p className="text-sm text-muted-foreground">More granular analytics (views, clicks, conversion rates) coming soon.</p>
      </div>
    </div>
  );
};

export default PublisherMetrics;
