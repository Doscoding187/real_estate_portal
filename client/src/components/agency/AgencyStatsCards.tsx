import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, TrendingUp, Users, UserPlus } from 'lucide-react';
import { KpiValue } from '@/components/dashboard/KpiValue';

interface AgencyStatsCardsProps {
  stats?: {
    totalListings: number;
    totalSales: number;
    totalLeads: number;
    totalAgents: number;
    activeListings: number;
    pendingListings: number;
    recentLeads: number;
    recentSales: number;
  };
  isLoading?: boolean;
}

export function AgencyStatsCards({ stats, isLoading }: AgencyStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Loading...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse h-8 bg-muted rounded"></div>
              <div className="animate-pulse h-4 bg-muted rounded mt-2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hasStats = Boolean(stats);
  const cards = [
    {
      title: 'Total Listings',
      value: stats?.totalListings ?? null,
      description: hasStats
        ? `${stats?.activeListings ?? 0} active, ${stats?.pendingListings ?? 0} pending`
        : 'Not available yet',
      icon: Home,
      color: 'text-blue-600',
    },
    {
      title: 'Total Sales',
      value: stats?.totalSales ?? null,
      description: hasStats ? `+${stats?.recentSales ?? 0} this month` : 'Not available yet',
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      title: 'Total Leads',
      value: stats?.totalLeads ?? null,
      description: hasStats ? `+${stats?.recentLeads ?? 0} this month` : 'Not available yet',
      icon: UserPlus,
      color: 'text-orange-600',
    },
    {
      title: 'Team Agents',
      value: stats?.totalAgents ?? null,
      description: hasStats ? 'Active team members' : 'Not available yet',
      icon: Users,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <KpiValue
              value={typeof card.value === 'number' ? card.value.toLocaleString() : null}
              status={hasStats ? 'real' : 'unavailable'}
              className="text-2xl font-bold"
              hint={hasStats ? undefined : 'Agency stats are currently unavailable.'}
            />
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
