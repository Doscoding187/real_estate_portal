import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon,
  color,
}) => {
  return (
    <div className="card p-6">
      <div className="flex items-center">
        <div className={`${color} p-3 rounded-lg`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{change}</p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;