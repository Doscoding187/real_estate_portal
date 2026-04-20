import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ReferralSidebar } from '@/components/referral/ReferralSidebar';
import { ReferralTopNav } from '@/components/referral/ReferralTopNav';

export function ReferralAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f0ede8] text-[#1a1a18]">
      <ReferralSidebar />

      <Sheet>
        <SheetTrigger asChild className="fixed left-4 top-4 z-50 lg:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[244px] p-0">
          <ReferralSidebar mode="sheet" />
        </SheetContent>
      </Sheet>

      <div className="flex-1 lg:pl-[210px]">
        <ReferralTopNav />
        {children}
      </div>
    </div>
  );
}
