import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { Building2, CalendarDays, CalendarPlus, Loader2, Plus, Search, Users } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

type SearchListing = {
  id: number;
  title: string;
  address?: string | null;
  city?: string | null;
};

type SearchLead = {
  id: number;
  name?: string | null;
  email?: string | null;
  property?: {
    title?: string | null;
  } | null;
  commercial?: {
    listingTitle?: string | null;
    assetName?: string | null;
    spaceIdentifier?: string | null;
  } | null;
};

type SearchShowing = {
  id: number;
  scheduledAt?: string | Date | null;
  property?: {
    title?: string | null;
    address?: string | null;
  } | null;
  client?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

type WorkspaceSearchResult = {
  id: string;
  kind: 'listing' | 'lead' | 'showing';
  title: string;
  detail: string;
  href: string;
};

function includesSearchTerm(value: string | null | undefined, term: string) {
  return String(value || '')
    .toLocaleLowerCase()
    .includes(term);
}

function formatShowingDate(value: string | Date | null | undefined) {
  if (!value) return 'Appointment date pending';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Appointment date pending';
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AgentTopNav() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const canSearch = normalizedSearch.length >= 2 && user?.role === 'agent';

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

  const showingSearchRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const end = new Date(now);
    end.setDate(end.getDate() + 180);

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, []);

  const listingsQuery = trpc.agent.getMyListings.useQuery(
    { status: 'all', limit: 50 },
    {
      enabled: canSearch,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  const leadsQuery = trpc.agent.getLeadsPipeline.useQuery(
    { filters: {} },
    {
      enabled: canSearch,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  const showingsQuery = trpc.agent.getMyShowings.useQuery(
    {
      startDate: showingSearchRange.startDate,
      endDate: showingSearchRange.endDate,
      status: 'all',
    },
    {
      enabled: canSearch,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const searchResults = useMemo<WorkspaceSearchResult[]>(() => {
    if (!canSearch) return [];

    const listings: SearchListing[] = listingsQuery.data || [];
    const pipeline = leadsQuery.data;
    const leads: SearchLead[] = pipeline
      ? [
          ...pipeline.new,
          ...pipeline.contacted,
          ...pipeline.viewing,
          ...pipeline.offer,
          ...pipeline.closed,
        ]
      : [];
    const showings: SearchShowing[] = showingsQuery.data || [];

    const listingResults = listings
      .filter(
        listing =>
          includesSearchTerm(listing.title, normalizedSearch) ||
          includesSearchTerm(listing.address, normalizedSearch) ||
          includesSearchTerm(listing.city, normalizedSearch),
      )
      .slice(0, 3)
      .map(listing => ({
        id: `listing-${listing.id}`,
        kind: 'listing' as const,
        title: listing.title || 'Untitled listing',
        detail: [listing.address, listing.city].filter(Boolean).join(', ') || 'Open listing',
        href: `/property/${listing.id}`,
      }));

    const leadResults = leads
      .filter(
        lead =>
          includesSearchTerm(lead.name, normalizedSearch) ||
          includesSearchTerm(lead.email, normalizedSearch) ||
          includesSearchTerm(lead.property?.title, normalizedSearch) ||
          includesSearchTerm(lead.commercial?.listingTitle, normalizedSearch) ||
          includesSearchTerm(lead.commercial?.assetName, normalizedSearch) ||
          includesSearchTerm(lead.commercial?.spaceIdentifier, normalizedSearch),
      )
      .slice(0, 3)
      .map(lead => ({
        id: `lead-${lead.id}`,
        kind: 'lead' as const,
        title: lead.name || lead.email || 'Unnamed lead',
        detail:
          lead.property?.title ||
          lead.commercial?.listingTitle ||
          lead.commercial?.assetName ||
          'Open lead record',
        href: `/agent/leads?leadId=${lead.id}`,
      }));

    const showingResults = showings
      .filter(
        showing =>
          includesSearchTerm(showing.property?.title, normalizedSearch) ||
          includesSearchTerm(showing.property?.address, normalizedSearch) ||
          includesSearchTerm(showing.client?.name, normalizedSearch) ||
          includesSearchTerm(showing.client?.email, normalizedSearch),
      )
      .slice(0, 3)
      .map(showing => ({
        id: `showing-${showing.id}`,
        kind: 'showing' as const,
        title: showing.property?.title || showing.client?.name || 'Scheduled showing',
        detail: formatShowingDate(showing.scheduledAt),
        href: `/agent/productivity?tab=showings&showingId=${showing.id}`,
      }));

    return [...listingResults, ...leadResults, ...showingResults].slice(0, 7);
  }, [canSearch, leadsQuery.data, listingsQuery.data, normalizedSearch, showingsQuery.data]);

  const searchesLoading =
    canSearch && (listingsQuery.isLoading || leadsQuery.isLoading || showingsQuery.isLoading);
  const showSearchMenu = searchFocused && searchQuery.trim().length > 0;

  const openSearchResult = (href: string) => {
    setSearchFocused(false);
    setSearchQuery('');
    setLocation(href);
  };

  const openFirstResult = () => {
    const firstResult = searchResults[0];
    if (firstResult) openSearchResult(firstResult.href);
  };

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
            onFocus={() => setSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                openFirstResult();
              }
              if (event.key === 'Escape') {
                setSearchQuery('');
                setSearchFocused(false);
              }
            }}
            aria-label="Search your agent workspace"
            aria-expanded={showSearchMenu}
            aria-controls="agent-workspace-search-results"
            placeholder="Search listings, leads, appointments..."
            className="h-9 rounded-full border-slate-200 bg-[#f7f6f3] pl-10 pr-4 text-[13px] shadow-none focus-visible:border-[var(--primary)] focus-visible:ring-[3px] focus-visible:ring-[color:color-mix(in_oklab,var(--primary)_12%,white)]"
          />

          {showSearchMenu ? (
            <div
              id="agent-workspace-search-results"
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.16)]"
            >
              {searchQuery.trim().length < 2 ? (
                <p className="px-3 py-3 text-sm text-slate-500">
                  Type at least two characters to search.
                </p>
              ) : searchesLoading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                  Searching your workspace…
                </div>
              ) : searchResults.length ? (
                <div className="space-y-0.5">
                  {searchResults.map(result => {
                    const Icon =
                      result.kind === 'listing'
                        ? Building2
                        : result.kind === 'lead'
                          ? Users
                          : CalendarDays;
                    const label =
                      result.kind === 'listing'
                        ? 'Listing'
                        : result.kind === 'lead'
                          ? 'Lead'
                          : 'Appointment';

                    return (
                      <button
                        key={result.id}
                        type="button"
                        role="option"
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => openSearchResult(result.href)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--primary)]/7"
                      >
                        <span className="rounded-lg bg-slate-100 p-2 text-[var(--primary)]">
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {result.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {result.detail}
                          </span>
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                  <p className="border-t border-slate-100 px-3 pb-1 pt-2 text-[11px] text-slate-400">
                    Press Enter to open the first result · Esc to close
                  </p>
                </div>
              ) : (
                <p className="px-3 py-3 text-sm text-slate-500">
                  No listings, leads, or appointments match “{searchQuery.trim()}”.
                </p>
              )}
            </div>
          ) : null}
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
            onClick={() => setLocation('/agent/productivity')}
            className="hidden h-[34px] rounded-full border-slate-200 bg-white px-[14px] text-[12.5px] text-slate-600 hover:border-[color:color-mix(in_oklab,var(--primary)_24%,white)] hover:bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] hover:text-[var(--primary)] xl:inline-flex"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span>Book Showing</span>
          </Button>

          <div className="hidden h-6 w-px bg-slate-200 xl:block" />

          <NotificationCenter className="h-[34px] w-[34px] rounded-full border border-slate-200 bg-white px-0 text-slate-500 hover:border-[color:color-mix(in_oklab,var(--primary)_24%,white)] hover:bg-white hover:text-[var(--primary)]" />
        </div>
      </div>
    </header>
  );
}
