import type { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';

export function ProspectLayout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen ${className}`.trim()}>
      <Navbar />
      {children}
    </div>
  );
}

