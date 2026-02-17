import type { ReactNode } from 'react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { ModernFooter } from '@/components/ModernFooter';

export function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedNavbar />
      {children}
      <ModernFooter />
    </div>
  );
}

