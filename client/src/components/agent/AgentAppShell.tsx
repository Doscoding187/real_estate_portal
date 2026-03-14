import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { AgentSidebar } from '@/components/agent/AgentSidebar';
import { AgentTopNav } from '@/components/agent/AgentTopNav';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function AgentAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f7f6f3]">
      <AgentSidebar />

      <Sheet>
        <SheetTrigger asChild className="fixed left-4 top-4 z-50 lg:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[232px] p-0">
          <AgentSidebar mode="sheet" />
        </SheetContent>
      </Sheet>

      <div className="flex-1 lg:pl-[232px]">
        <AgentTopNav />
        {children}
      </div>
    </div>
  );
}
