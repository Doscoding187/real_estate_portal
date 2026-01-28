import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, hover = false }) => {
  return (
    <div
      className={cn(
        'bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/40',
        'shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)]',
        hover &&
          'transition-all duration-300 hover:shadow-[0_25px_60px_rgba(8,_112,_184,_0.12)] hover:-translate-y-1',
        className,
      )}
    >
      {children}
    </div>
  );
};
