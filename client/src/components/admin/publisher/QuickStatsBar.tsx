import React from 'react';
import { Building2, Users, Home, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickStat {
  label: string;
  value: number;
  icon: React.ReactNode;
}

interface QuickStatsBarProps {
  totalBrands: number;
  totalDevelopments: number;
  totalLeads: number;
  className?: string;
}

export const QuickStatsBar: React.FC<QuickStatsBarProps> = ({
  totalBrands,
  totalDevelopments,
  totalLeads,
  className,
}) => {
  const stats: QuickStat[] = [
    {
      label: 'Brand Profiles',
      value: totalBrands,
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      label: 'Developments',
      value: totalDevelopments,
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: 'Total Leads',
      value: totalLeads,
      icon: <Users className="w-4 h-4" />,
    },
  ];

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100',
        className,
      )}
    >
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg bg-white/60 backdrop-blur-sm',
            'transition-all duration-200 hover:bg-white/80 hover:shadow-md',
          )}
        >
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <div className="text-white">{stat.icon}</div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {stat.value.toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
