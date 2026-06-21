/**
 * Transitional agency workspace layout.
 * Currently renders the legacy Navbar while agency navigation ownership is consolidated.
 * Will be refactored to dedicated agency shell in a future phase.
 */
import type { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';

export function AgencyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Navbar />
      {children}
    </div>
  );
}

