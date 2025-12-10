/**
 * Agency Metrics Cards Component
 * Displays key agency metrics in card format
 * Requirements: 3.2, 3.3
 */

import { Card, CardContent } from '@/components/ui/card';
import { Video, Eye, TrendingUp, Heart } from 'lucide-react';

interface AgencyMetricsCardsProps {
  totalContent: number;
  totalViews: number;
  totalEngagements: number;
  averageEngagementRate: number;
}

export function AgencyMetricsCards({
  totalContent,
  totalViews,
  totalEngagements,
  averageEngagementRate,
}: AgencyMetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        icon={<Video className="h-5 w-5" />}
        label="Total Content"
        value={totalContent.toLocaleString()}
        color="blue"
      />
      <MetricCard
        icon={<Eye className="h-5 w-5" />}
        label="Total Views"
        value={totalViews.toLocaleString()}
        color="green"
      />
      <MetricCard
        icon={<Heart className="h-5 w-5" />}
        label="Total Engagements"
        value={totalEngagements.toLocaleString()}
        color="purple"
      />
      <MetricCard
        icon={<TrendingUp className="h-5 w-5" />}
        label="Engagement Rate"
        value={`${averageEngagementRate.toFixed(1)}%`}
        color="orange"
      />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
