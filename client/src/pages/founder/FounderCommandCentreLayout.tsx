import { useState, useCallback, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { FounderSidebar } from '@/components/founder/FounderSidebar';
import { FounderTopBar } from '@/components/founder/FounderTopBar';

interface FounderCommandCentreLayoutProps {
  children: React.ReactNode;
}

export function FounderCommandCentreLayout({ children }: FounderCommandCentreLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  // Close mobile nav if viewport crosses into desktop while drawer is open
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  useEffect(() => {
    if (isDesktop && mobileNavOpen) setMobileNavOpen(false);
  }, [isDesktop, mobileNavOpen]);

  // Body scroll lock while mobile navigation is open
  useEffect(() => {
    if (!mobileNavOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileNavOpen]);

  // Escape key closes mobile navigation
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <FounderSidebar mobileOpen={mobileNavOpen} onMobileClose={closeMobileNav} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <FounderTopBar onOpenMobileNav={() => setMobileNavOpen(true)} />

        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
