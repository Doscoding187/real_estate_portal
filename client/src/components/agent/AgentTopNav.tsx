import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarPlus, FileText, Plus, Search, UserPlus } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

export function AgentTopNav() {
  const [, setLocation] = useLocation();
  useAuth();
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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
      <div className="flex min-h-[58px] flex-wrap items-center gap-3 px-4 py-2 md:px-7 xl:h-[58px] xl:flex-nowrap xl:gap-3 xl:py-0">
        <div className="hidden items-center gap-3 xl:flex">
          <div className="text-[13px] text-slate-500">
            <strong className="font-semibold text-slate-700">{dateParts.dayLabel}</strong>
            <span className="ml-2">{dateParts.year}</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
        </div>

        <div className="relative min-w-[220px] flex-1 xl:max-w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search listings, leads, appointments..."
            className="h-9 rounded-full border-slate-200 bg-[#f7f6f3] pl-10 pr-4 text-[13px] shadow-none focus-visible:border-[var(--primary)] focus-visible:ring-[3px] focus-visible:ring-[color:color-mix(in_oklab,var(--primary)_12%,white)]"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setLocation('/listings/create')}
            className="h-[34px] rounded-full bg-[var(--primary)] px-[18px] text-[12.5px] font-medium text-white shadow-[0_8px_28px_rgba(0,92,168,0.24)] hover:bg-[#0b4b81]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Listing</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation('/agent/leads?action=add')}
            className="hidden h-[34px] rounded-full border-slate-200 bg-white px-[14px] text-[12.5px] text-slate-600 hover:border-[color:color-mix(in_oklab,var(--primary)_24%,white)] hover:bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] hover:text-[var(--primary)] xl:inline-flex"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Log Lead</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation('/agent/productivity')}
            className="hidden h-[34px] rounded-full border-slate-200 bg-white px-[14px] text-[12.5px] text-slate-600 hover:border-[color:color-mix(in_oklab,var(--primary)_24%,white)] hover:bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] hover:text-[var(--primary)] xl:inline-flex"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span>Book Showing</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation('/agent/leads')}
            className="hidden h-[34px] rounded-full border-slate-200 bg-white px-[14px] text-[12.5px] text-slate-600 hover:border-[color:color-mix(in_oklab,var(--primary)_24%,white)] hover:bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] hover:text-[var(--primary)] xl:inline-flex"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Submit Offer</span>
          </Button>

          <div className="hidden h-6 w-px bg-slate-200 xl:block" />

          <NotificationCenter className="h-[34px] w-[34px] rounded-full border border-slate-200 bg-white px-0 text-slate-500 hover:border-[color:color-mix(in_oklab,var(--primary)_24%,white)] hover:bg-white hover:text-[var(--primary)]" />
        </div>
      </div>
    </header>
  );
}
