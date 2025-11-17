import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  className,
}: MetricCardProps) {
  return (
    <Card
      className={cn('card metric-card hover:shadow-lg transition-shadow duration-200', className)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="typ-h3 text-3xl font-bold">{value}</p>
            {change && (
              <div
                className={cn(
                  'text-sm font-medium flex items-center gap-1',
                  changeType === 'positive' && 'text-green-600',
                  changeType === 'negative' && 'text-red-600',
                  changeType === 'neutral' && 'text-muted-foreground',
                )}
              >
                {changeType === 'positive' && '↑'}
                {changeType === 'negative' && '↓'}
                <span>{change}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="p-3 bg-muted rounded-12">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
