import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';

  const variantClasses = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-orange-100 text-orange-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    default: 'bg-slate-100 text-slate-800',
  };

  const classes = [baseClasses, variantClasses[variant], className].join(' ');

  return <span className={classes}>{children}</span>;
};

export default Badge;
