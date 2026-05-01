import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Compass, FilePlus2, Search } from 'lucide-react';

export function ReferralTopNav() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const dateParts = useMemo(() => {
    const now = new Date();
    return {
      dayLabel: now.toLocaleDateString('en-ZA', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      }),
      year: now.getFullYear(),
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/92 backdrop-blur-xl">
      <div className="flex min-h-[58px] flex-wrap items-center gap-3 px-4 py-2 md:px-7 xl:h-[58px] xl:flex-nowrap xl:gap-3 xl:py-0">
        <div className="hidden items-center gap-3 xl:flex">
          <div className="text-[13px] text-muted-foreground">
            <strong className="font-semibold text-foreground">{dateParts.dayLabel}</strong>
            <span className="ml-2">{dateParts.year}</span>
          </div>
          <div className="h-6 w-px bg-border" />
        </div>

        <div className="relative min-w-[220px] flex-1 xl:max-w-[380px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search developments, referrals, buyers..."
            className="h-9 rounded-md border-border bg-surface pl-10 pr-4 text-[13px] shadow-none focus-visible:border-primary/40 focus-visible:ring-0"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setLocation('/distribution/partner/submit')}
            variant="conversion"
            className="h-[34px] rounded-md px-[16px] text-[12.5px] font-medium"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            <span>Submit Referral</span>
          </Button>
          <Button
            type="button"
            onClick={() => setLocation('/distribution/partner/accelerator')}
            variant="conversion"
            className="hidden h-[34px] rounded-md px-[14px] text-[12.5px] xl:inline-flex"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Pre-Qualify Buyer</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
