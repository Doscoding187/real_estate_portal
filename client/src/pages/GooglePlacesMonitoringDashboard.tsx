/**
 * Google Places API Monitoring Dashboard
 * 
 * Requirements:
 * - 26.4: Create monitoring dashboard
 * - 26.5: Display alerts for usage thresholds
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  TrendingUp, 
  Clock,
  XCircle,
  Info
} from 'lucide-react';
import { useState } from 'react';

interface UsageStatistics {
  today: DailySummary;
  last7Days: DailySummary;
  last30Days: DailySummary;
  currentHour: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
  };
  topErrors: Array<{
    error: string;
    count: number;
    lastOccurrence: string;
  }>;
  costProjection: {
    dailyProjected: number;
    monthlyProjected: number;
  };
}

interface DailySummary {
  date: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  autocompleteRequests: number;
  placeDetailsRequests: number;
  geocodeRequests: number;
  reverseGeocodeRequests: number;
  averageResponseTime: number;
  totalCost: number;
  errorRate: number;
}

interface AlertData {
  id: number;
  alertType: string;
  thresholdValue: number;
  currentValue: number;
  triggeredAt: string;
  resolvedAt: string | null;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  notified: boolean;
}

interface MonitoringConfig {
  dailyRequestLimit: number;
  usageAlertThreshold: number;
  errorRateThreshold: number;
  responseTimeThreshold: number;
  costAlertThreshold: number;
  autocompleteCostPer1000: number;
  placeDetailsCostPer1000: number;
  geocodeCostPer1000: number;
}

export default function GooglePlacesMonitoringDashboard() {
  const [refreshInterval, setRefreshInterval] = useState(60000); // 1 minute

  // Fetch usage statistics
  const { data: statistics, isLoading: statsLoading } = useQuery<UsageStatistics>({
    queryKey: ['google-places-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/google-places-monitoring/statistics');
      if (!response.ok) throw new Error('Failed to fetch statistics');
      return response.json();
    },
    refetchInterval: refreshInterval,
  });

  // Fetch active alerts
  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery<AlertData[]>({
    queryKey: ['google-places-alerts'],
    queryFn: async () => {
      const response = await fetch('/api/google-places-monitoring/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json();
    },
    refetchInterval: refreshInterval,
  });

  // Fetch configuration
  const { data: config } = useQuery<MonitoringConfig>({
    queryKey: ['google-places-config'],
    queryFn: async () => {
      const response = await fetch('/api/google-places-monitoring/config');
      if (!response.ok) throw new Error('Failed to fetch config');
      return response.json();
    },
  });

  const handleResolveAlert = async (alertId: number) => {
    try {
      const response = await fetch(`/api/google-places-monitoring/alerts/${alertId}/resolve`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to resolve alert');
      refetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (statsLoading || alertsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading monitoring data...</p>
          </div>
        </div>
      </div>
    );
  }

  const usagePercentage = config && statistics
    ? (statistics.today.totalRequests / config.dailyRequestLimit) * 100
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Places API Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and usage statistics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={usagePercentage < 80 ? 'default' : 'destructive'}>
            {usagePercentage.toFixed(1)}% of daily limit
          </Badge>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Active Alerts</h2>
          {alerts.map((alert) => (
            <Alert key={alert.id} variant={getSeverityColor(alert.severity) as any}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  {getSeverityIcon(alert.severity)}
                  <div>
                    <AlertTitle className="capitalize">{alert.severity} Alert</AlertTitle>
                    <AlertDescription>{alert.message}</AlertDescription>
                    <p className="text-xs text-muted-foreground mt-1">
                      Triggered: {new Date(alert.triggeredAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveAlert(alert.id)}
                >
                  Resolve
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Current Hour Stats */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Hour</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.currentHour.totalRequests}
              </div>
              <p className="text-xs text-muted-foreground">
                requests in the last hour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.currentHour.successRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                in the last hour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.currentHour.averageResponseTime.toFixed(0)}ms
              </div>
              <p className="text-xs text-muted-foreground">
                in the last hour
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Stats */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.today.totalRequests}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.today.successfulRequests} successful, {statistics.today.failedRequests} failed
              </p>
              <div className="mt-2 text-xs">
                <div>Autocomplete: {statistics.today.autocompleteRequests}</div>
                <div>Place Details: {statistics.today.placeDetailsRequests}</div>
                <div>Geocode: {statistics.today.geocodeRequests}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${statistics.today.totalCost.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Projected daily: ${statistics.costProjection.dailyProjected.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Projected monthly: ${statistics.costProjection.monthlyProjected.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.last7Days.totalRequests}</div>
              <p className="text-xs text-muted-foreground">
                Error rate: {statistics.last7Days.errorRate.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground">
                Avg response: {statistics.last7Days.averageResponseTime.toFixed(0)}ms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.last30Days.totalRequests}</div>
              <p className="text-xs text-muted-foreground">
                Total cost: ${statistics.last30Days.totalCost.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Error rate: {statistics.last30Days.errorRate.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Errors */}
      {statistics && statistics.topErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Errors (Last 7 Days)</CardTitle>
            <CardDescription>Most frequent API errors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statistics.topErrors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{error.error}</p>
                    <p className="text-xs text-muted-foreground">
                      Last occurred: {new Date(error.lastOccurrence).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{error.count} occurrences</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Current monitoring thresholds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Daily Request Limit</p>
                <p className="text-2xl font-bold">{config.dailyRequestLimit.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Usage Alert Threshold</p>
                <p className="text-2xl font-bold">{(config.usageAlertThreshold * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-sm font-medium">Error Rate Threshold</p>
                <p className="text-2xl font-bold">{(config.errorRateThreshold * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-sm font-medium">Response Time Threshold</p>
                <p className="text-2xl font-bold">{config.responseTimeThreshold}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
