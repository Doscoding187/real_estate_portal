
import React from 'react';
import { trpc } from '@/lib/trpc';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Code, User, TrendingUp, Users2, Activity } from 'lucide-react';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const EcosystemOverviewPage: React.FC = () => {
  const { data: stats, isLoading } = trpc.admin.getEcosystemStats.useQuery();

  const StatCard = ({ 
    title, 
    icon: Icon, 
    total, 
    active, 
    growth, 
    color 
  }: { 
    title: string; 
    icon: any; 
    total?: number; 
    active?: number; 
    growth?: number; 
    color: string 
  }) => (
    <GlassCard className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          {title}
        </CardTitle>
        {growth !== undefined && (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
            <TrendingUp className="h-3 w-3 mr-1" />
            +{growth} new
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
             <p className="text-3xl font-bold text-slate-800">{total ?? '-'}</p>
             <p className="text-sm text-slate-500">Total Registered</p>
          </div>
          
          {active !== undefined && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Active / Verified</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-700">{active}</span>
                <span className="text-xs text-slate-400">
                  ({total && total > 0 ? Math.round((active / total) * 100) : 0}%)
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </GlassCard>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Activity className="h-8 w-8 text-indigo-600" />
          Ecosystem Health
        </h1>
        <p className="text-slate-500 mt-2">
          High-level overview of platform participants and growth metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Agencies" 
          icon={Building2} 
          total={stats?.agencies.total} 
          active={stats?.agencies.active} 
          growth={stats?.agencies.growth}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard 
          title="Agents" 
          icon={Users} 
          total={stats?.agents.total} 
          active={stats?.agents.active} 
          growth={stats?.agents.growth}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard 
          title="Developers" 
          icon={Code} 
          total={stats?.developers.total} 
          active={stats?.developers.active} 
          growth={stats?.developers.growth}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard 
          title="End Users" 
          icon={User} 
          total={stats?.users.total} 
          active={stats?.users.active} // Treating total as active for now
          growth={stats?.users.growth}
          color="bg-emerald-100 text-emerald-600"
        />
      </div>

      {/* Placeholder for future detailed charts */}
      <GlassCard className="p-8 text-center border-dashed border-2 bg-slate-50/50">
        <div className="flex flex-col items-center justify-center space-y-3">
           <div className="p-3 bg-slate-100 rounded-full">
             <TrendingUp className="h-6 w-6 text-slate-400" />
           </div>
           <h3 className="text-lg font-medium text-slate-700">Detailed Analytics Coming Soon</h3>
           <p className="text-slate-500 max-w-md">
             Deep dive charts for user retention, agency churn, and geographic distribution will be available in the next update.
           </p>
        </div>
      </GlassCard>
    </div>
  );
};

export default EcosystemOverviewPage;
