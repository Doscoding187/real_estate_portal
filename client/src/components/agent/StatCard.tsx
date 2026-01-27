import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card
      className={cn(
        'bg-white/60 backdrop-blur-xl border-white/20 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl group',
        className,
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1 group-hover:text-emerald-600 transition-colors">
              {title}
            </p>
            <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
            {trend && (
              <p
                className={cn(
                  'text-xs font-medium mt-1',
                  trend.positive ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {trend.value}
              </p>
            )}
          </div>
          <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
            <Icon className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
