import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const colorMap = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
};

export function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const styles = colorMap[color];

  return (
    <Card className="shadow-none border border-slate-200/60 bg-slate-50/50">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-1.5 rounded-md ${styles.bg} ${styles.text}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="font-semibold text-sm text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
