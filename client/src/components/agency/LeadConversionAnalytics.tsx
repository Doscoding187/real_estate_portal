import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, Users, CheckCircle } from 'lucide-react';

interface LeadConversionAnalyticsProps {
  data: {
    total: number;
    converted: number;
    conversionRate: number;
    byStatus: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
  };
  isLoading?: boolean;
}

export function LeadConversionAnalytics({ data, isLoading }: LeadConversionAnalyticsProps) {
  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Lead Conversion Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse h-8 bg-muted rounded"></div>
            <div className="animate-pulse h-4 bg-muted rounded w-3/4"></div>
            <div className="animate-pulse h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Lead Conversion Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">No conversion data available</div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500';
      case 'contacted':
        return 'bg-yellow-500';
      case 'qualified':
        return 'bg-orange-500';
      case 'converted':
        return 'bg-green-500';
      case 'closed':
        return 'bg-purple-500';
      case 'lost':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Lead Conversion Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Conversion Rate Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{data.total}</div>
            <div className="text-sm text-muted-foreground">Total Leads</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{data.converted}</div>
            <div className="text-sm text-muted-foreground">Converted</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{data.conversionRate}%</div>
            <div className="text-sm text-muted-foreground">Conversion Rate</div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Conversion Funnel
          </h4>

          {data.byStatus.map((statusData, index) => (
            <div key={statusData.status} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(statusData.status)}`}
                  ></div>
                  <span className="text-sm font-medium">{getStatusLabel(statusData.status)}</span>
                  <Badge variant="outline" className="text-xs">
                    {statusData.count}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">{statusData.percentage}%</span>
              </div>
              <Progress value={statusData.percentage} className="h-2" />
            </div>
          ))}
        </div>

        {/* Conversion Insights */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium text-sm">Conversion Insights</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {data.conversionRate >= 20 ? (
              <span className="text-green-600">
                Excellent conversion rate! Keep up the great work.
              </span>
            ) : data.conversionRate >= 10 ? (
              <span className="text-blue-600">
                Good conversion rate. Focus on lead qualification to improve further.
              </span>
            ) : data.conversionRate >= 5 ? (
              <span className="text-orange-600">
                Average conversion rate. Consider improving follow-up processes.
              </span>
            ) : (
              <span className="text-red-600">
                Low conversion rate. Review lead quality and agent training.
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
