import { FounderSidebar } from '@/components/founder/FounderSidebar';
import { FounderTopBar } from '@/components/founder/FounderTopBar';

interface FounderCommandCentreLayoutProps {
  children: React.ReactNode;
}

export function FounderCommandCentreLayout({ children }: FounderCommandCentreLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <FounderSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <FounderTopBar />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
