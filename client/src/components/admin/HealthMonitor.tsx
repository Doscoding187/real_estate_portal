import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Home, Clock, AlertCircle } from 'lucide-react';

interface HealthMonitorProps {
  stats: {
    totalInventoryValue: number;
    newListingsToday: number;
    pendingApprovals: number;
  } | undefined;
  isLoading: boolean;
}

export const HealthMonitor: React.FC<HealthMonitorProps> = ({ stats, isLoading }) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `R${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `R${(value / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Inventory Value</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : formatCurrency(stats?.totalInventoryValue || 0)}
            </h3>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-full text-purple-600">
            <Home className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">New Listings (24h)</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : stats?.newListingsToday || 0}
            </h3>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-orange-100 rounded-full text-orange-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : stats?.pendingApprovals || 0}
            </h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
