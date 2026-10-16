import type { ReactNode } from 'react';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';

export function LandPublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <ListingNavbar neutralSearch />
      {children}
      <Footer />
    </div>
  );
}
