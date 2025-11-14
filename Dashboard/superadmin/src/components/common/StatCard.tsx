import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: 'up' | 'down';
  color?: string;
  change?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  trend,
  color = 'bg-slate-100',
  change,
}) => {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
        {trend && (
          <div className="flex items-center">
            {trend === 'up' ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-slate-900 whitespace-nowrap">
          {value}
        </h3>
        <p className="text-slate-600 text-sm">{label}</p>
        {change && <p className="text-xs text-slate-500 mt-1">{change}</p>}
      </div>
    </div>
  );
};

export default StatCard;
