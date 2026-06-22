/**
 * Transitional agency workspace layout.
 * Currently renders the legacy Navbar while agency navigation ownership is consolidated.
 * Will be refactored to dedicated agency shell in a future phase.
 */
import type { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';

export function AgencyLayout({
  children,
  className = 'bg-[#F4F7FA]',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-h-screen ${className}`.trim()}>
      <Navbar />
      {children}
    </div>
  );
}
