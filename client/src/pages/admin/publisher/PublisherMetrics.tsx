import React from 'react';
import { useDeveloperContext } from '@/contexts/DeveloperContextProvider';
import { trpc } from '@/lib/trpc';
import { Users, Building2, Home, TrendingUp } from 'lucide-react';
import { MetricCard } from '@/components/admin/publisher/MetricCard';
import { publisherTheme, animations } from '@/lib/publisherTheme';
import '@/styles/animations.css';

const PublisherMetrics: React.FC = () => {
  const { selectedBrandId } = useDeveloperContext();

  const { data: metrics, isLoading } = trpc.superAdminPublisher.getBrandMetrics.useQuery(
    { brandProfileId: selectedBrandId! },
    { enabled: !!selectedBrandId },
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-40 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
          Brand Performance
        </h3>
        <p className="text-muted-foreground">
          Track key metrics and performance indicators for this brand profile
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Leads"
          value={metrics?.totalLeads || 0}
          icon={Users}
          subtext="All time inquiries"
          trend={{
            value: 12,
            isPositive: true,
          }}
        />
        <MetricCard
          title="Developments"
          value={metrics?.developmentCount || 0}
          icon={Building2}
          subtext="Active projects"
        />
        <MetricCard
          title="Properties"
          value={metrics?.propertyCount || 0}
          icon={Home}
          subtext="Total units listed"
        />
      </div>

      {/* Placeholder for future charts */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQzODhjYSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-2">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h4 className="text-lg font-semibold text-blue-900">Advanced Analytics Coming Soon</h4>
          <p className="text-sm text-blue-700 max-w-md mx-auto">
            Detailed charts for views, clicks, conversion rates, and performance trends will be
            available here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublisherMetrics;
