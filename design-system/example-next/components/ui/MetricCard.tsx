import * as React from 'react';
import clsx from 'clsx';
import type { Icon } from 'lucide-react';
import { iconProps } from '../../../icons';

export function MetricCard({
  icon: IconCmp,
  value,
  label,
  className,
}: {
  icon: Icon;
  value: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div className={clsx('metric-card', className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="metric-card__icon">
          <IconCmp {...iconProps('md')} />
        </div>
        <div className="typ-body-s text-gray-700">{label}</div>
      </div>
      <div className="metric-card__value">{value}</div>
    </div>
  );
}

export default MetricCard;
