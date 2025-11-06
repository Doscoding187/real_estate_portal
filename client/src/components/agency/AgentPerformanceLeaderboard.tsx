import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, TrendingUp, Home, Users, DollarSign } from 'lucide-react';

interface AgentPerformanceLeaderboardProps {
  data: Array<{
    agentId: number;
    agentName: string;
    earnings: number;
    propertiesListed: number;
    leadsGenerated: number;
    propertiesSold: number;
    conversionRate: number;
  }>;
  isLoading?: boolean;
}

export function AgentPerformanceLeaderboard({ data, isLoading }: AgentPerformanceLeaderboardProps) {
  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Agent Performance Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Agent Performance Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No performance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return `#${index + 1}`;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'text-yellow-600';
      case 1:
        return 'text-gray-500';
      case 2:
        return 'text-amber-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Agent Performance Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.slice(0, 10).map((agent, index) => (
            <div
              key={agent.agentId}
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                index < 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent border-yellow-200' : ''
              }`}
            >
              {/* Rank */}
              <div className={`flex-shrink-0 w-8 text-center font-bold ${getRankColor(index)}`}>
                {getRankIcon(index)}
              </div>

              {/* Avatar */}
              <Avatar className="flex-shrink-0">
                <AvatarFallback className="bg-primary/10">
                  {getInitials(agent.agentName)}
                </AvatarFallback>
              </Avatar>

              {/* Agent Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold truncate">{agent.agentName}</h4>
                  {index < 3 && (
                    <Badge variant="outline" className="text-xs">
                      Top Performer
                    </Badge>
                  )}
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-muted-foreground">Earnings</span>
                    </div>
                    <div className="text-sm font-bold text-green-600">
                      {formatCurrency(agent.earnings)}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Home className="h-3 w-3 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Listed</span>
                    </div>
                    <div className="text-sm font-bold">{agent.propertiesListed}</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="h-3 w-3 text-purple-600" />
                      <span className="text-xs text-muted-foreground">Leads</span>
                    </div>
                    <div className="text-sm font-bold">{agent.leadsGenerated}</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="h-3 w-3 text-orange-600" />
                      <span className="text-xs text-muted-foreground">Sold</span>
                    </div>
                    <div className="text-sm font-bold">{agent.propertiesSold}</div>
                  </div>
                </div>

                {/* Conversion Rate */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">Conversion Rate:</span>
                  <Badge
                    variant={
                      agent.conversionRate >= 20
                        ? 'default'
                        : agent.conversionRate >= 10
                          ? 'secondary'
                          : 'outline'
                    }
                    className="text-xs"
                  >
                    {agent.conversionRate}%
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {data.length > 10 && (
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Showing top 10 performers. {data.length - 10} more agents...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
