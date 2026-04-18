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
    <header className="sticky top-0 z-30 border-b border-[#1a1a18]/10 bg-white/92 backdrop-blur-xl">
      <div className="flex min-h-[58px] flex-wrap items-center gap-3 px-4 py-2 md:px-7 xl:h-[58px] xl:flex-nowrap xl:gap-3 xl:py-0">
        <div className="hidden items-center gap-3 xl:flex">
          <div className="text-[13px] text-[#6b6a64]">
            <strong className="font-semibold text-[#1a1a18]">{dateParts.dayLabel}</strong>
            <span className="ml-2">{dateParts.year}</span>
          </div>
          <div className="h-6 w-px bg-[#1a1a18]/10" />
        </div>

        <div className="relative min-w-[220px] flex-1 xl:max-w-[380px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9e9d96]" />
          <Input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search developments, referrals, buyers..."
            className="h-9 rounded-md border-[#1a1a18]/20 bg-[#f5f4f0] pl-10 pr-4 text-[13px] shadow-none focus-visible:border-[#1a1a18]/35 focus-visible:ring-0"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setLocation('/distribution/partner/submit')}
            className="h-[34px] rounded-md border border-[#1a1a18]/20 bg-white px-[16px] text-[12.5px] font-medium text-[#1a1a18] hover:bg-[#f5f4f0]"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            <span>Submit Referral</span>
          </Button>
          <Button
            type="button"
            onClick={() => setLocation('/distribution/partner/accelerator')}
            className="hidden h-[34px] rounded-md bg-[#1a1a18] px-[14px] text-[12.5px] text-white hover:bg-[#2a2a28] xl:inline-flex"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Pre-Qualify Buyer</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
