import type { ReactNode } from 'react';

export function AgencyLayout({
  children,
  className = 'bg-[#F4F7FA]',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`min-h-screen ${className}`.trim()}>{children}</div>;
}
