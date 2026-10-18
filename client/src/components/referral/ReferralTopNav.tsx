import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Send } from 'lucide-react';

export function ReferralTopNav() {
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/92 backdrop-blur-xl">
      <div className="flex min-h-[58px] items-center gap-3 px-4 py-2 md:px-7 xl:h-[58px] xl:py-0">
        <p className="text-sm font-semibold text-foreground">Your distribution network</p>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setLocation('/distribution/partner/referrals')}
            variant="outline"
            className="h-[34px] rounded-md px-[16px] text-[12.5px] font-medium"
          >
            <Send className="h-3.5 w-3.5" />
            <span>My deals</span>
          </Button>
          <Button
            type="button"
            onClick={() => setLocation('/distribution/partner/developments')}
            variant="conversion"
            className="h-[34px] rounded-md px-[14px] text-[12.5px] font-medium"
          >
            <span>Find opportunities</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
