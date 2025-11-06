import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, TrendingUp, Users, UserPlus } from 'lucide-react';

interface AgencyStatsCardsProps {
  stats: {
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

  const cards = [
    {
      title: 'Total Listings',
      value: stats.totalListings,
      description: `${stats.activeListings} active, ${stats.pendingListings} pending`,
      icon: Home,
      color: 'text-blue-600',
    },
    {
      title: 'Total Sales',
      value: stats.totalSales,
      description: `+${stats.recentSales} this month`,
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      title: 'Total Leads',
      value: stats.totalLeads,
      description: `+${stats.recentLeads} this month`,
      icon: UserPlus,
      color: 'text-orange-600',
    },
    {
      title: 'Team Agents',
      value: stats.totalAgents,
      description: 'Active team members',
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
            <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
