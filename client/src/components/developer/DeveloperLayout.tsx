import { ReactNode } from 'react';
import { EnhancedSidebar } from './EnhancedSidebar';
import { DeveloperTopNav } from './DeveloperTopNav';

interface DeveloperLayoutProps {
  children?: ReactNode;
}

export function DeveloperLayout({ children }: DeveloperLayoutProps) {
  return (
    <div className="flex h-screen w-screen bg-[#F4F7FA]">
      <EnhancedSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <DeveloperTopNav />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
