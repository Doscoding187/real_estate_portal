import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText } from 'lucide-react';

export function ReferralTopNav() {
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/92 backdrop-blur-xl">
      <div className="flex min-h-[62px] items-center gap-3 px-4 py-2 md:px-7 xl:h-[62px] xl:py-0">
        <p className="text-[15px] font-semibold text-foreground">Your distribution network</p>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setLocation('/distribution/partner/referrals')}
            variant="outline"
            className="h-10 rounded-lg px-4 text-[13px] font-medium"
          >
            <FileText className="h-4 w-4" />
            <span>My deals</span>
          </Button>
          <Button
            type="button"
            onClick={() => setLocation('/distribution/partner/developments')}
            variant="conversion"
            className="h-10 rounded-lg px-4 text-[13px] font-medium"
          >
            <span>Find opportunities</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
