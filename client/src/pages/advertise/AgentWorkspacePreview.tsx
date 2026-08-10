import {
  BarChart3,
  BellRing,
  CalendarCheck2,
  Check,
  Clock3,
  Home,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MessageSquareText,
  UsersRound,
} from 'lucide-react';

type AgentWorkspacePreviewProps = {
  compact?: boolean;
};

const NAVIGATION = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Listings', icon: ListChecks, active: false },
  { label: 'Enquiries', icon: MessageSquareText, active: false },
  { label: 'Follow-ups', icon: BellRing, active: false },
  { label: 'Analytics', icon: BarChart3, active: false },
] as const;

const PROPERTIES = [
  {
    image: '/placeholder-property.jpg',
    alt: 'Illustrative apartment building listing thumbnail',
    title: '2-bed apartment',
    location: 'Sandton',
    detail: 'New enquiry',
    detailTone: 'bg-blue-50 text-[var(--brand-blue)]',
    icon: MessageSquareText,
  },
  {
    image: '/placeholders/development_placeholder_1_1763712033438.png',
    alt: 'Illustrative modern home listing thumbnail',
    title: 'Townhouse',
    location: 'Bryanston',
    detail: 'Viewing requested',
    detailTone: 'bg-orange-50 text-orange-700',
    icon: CalendarCheck2,
  },
] as const;

const KPI_ITEMS = [
  { label: 'Active listings', value: '18', icon: Home, tone: 'text-[var(--brand-blue)]' },
  { label: 'New enquiries', value: '7', icon: MessageSquareText, tone: 'text-cyan-700' },
  { label: 'Follow-ups due', value: '4', icon: BellRing, tone: 'text-orange-700' },
  { label: 'Viewings today', value: '2', icon: CalendarCheck2, tone: 'text-emerald-700' },
] as const;

function PropertyThumbnail({ image, alt }: { image: string; alt: string }) {
  return (
    <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-16 sm:w-[4.5rem]">
      <img src={image} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      <span className="absolute inset-x-1 bottom-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-center text-[8px] font-semibold uppercase tracking-[0.08em] text-white">
        Preview
      </span>
    </div>
  );
}

function WorkspaceNavigation({ compact }: { compact: boolean }) {
  return (
    <aside
      className={`${compact ? 'hidden sm:block' : ''} bg-slate-950 p-4 text-slate-300 sm:p-5`}
      aria-label="Illustrative Agent workspace navigation"
    >
      <div className="flex items-center gap-3 border-b border-white/10 pb-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-blue)] text-white">
          <Home className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">Property</p>
          <p className="text-[10px] font-semibold text-slate-400">Listify</p>
        </div>
      </div>
      <nav className="mt-6 space-y-1.5">
        {NAVIGATION.map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${
                item.active ? 'bg-white/10 text-white' : 'text-slate-400'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${item.active ? 'text-[var(--brand-blue)]' : 'text-slate-500'}`}
                aria-hidden="true"
              />
              {item.label}
            </div>
          );
        })}
      </nav>
      <div className="mt-8 hidden rounded-2xl border border-white/10 bg-white/5 p-3 text-[10px] leading-5 text-slate-400 sm:block">
        A connected view of the work behind every listing.
      </div>
    </aside>
  );
}

function KpiCard({ label, value, icon: Icon, tone }: (typeof KPI_ITEMS)[number]) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase leading-4 tracking-[0.08em] text-slate-500">
          {label}
        </p>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50">
          <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

export function AgentWorkspacePreview({ compact = false }: AgentWorkspacePreviewProps) {
  return (
    <div
      data-testid="agent-workspace-preview"
      aria-label="Illustrative Property Listify Agent workspace preview"
      className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.14)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <p className="text-xs font-bold text-slate-950">Agent workspace</p>
          <span className="hidden rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:inline-flex">
            Illustrative preview
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
          <span className="hidden sm:inline">Property Listify</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[var(--brand-blue)]">
            <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="grid min-h-[420px] sm:grid-cols-[11.25rem_minmax(0,1fr)]">
        <WorkspaceNavigation compact={compact} />

        <div className="min-w-0 bg-[#f8fafc] p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--brand-blue)]">
                Overview
              </p>
              <h3 className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                Good morning, Thabo
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                A quick view of today&apos;s property work.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-500">
              Product preview
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {KPI_ITEMS.map(item => (
              <KpiCard key={item.label} {...item} />
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Recent property interest
                  </p>
                  <h4 className="mt-1 text-sm font-bold text-slate-950">Enquiries with context</h4>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[var(--brand-blue)]">
                  <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {PROPERTIES.map(property => {
                  const StatusIcon = property.icon;
                  return (
                    <div
                      key={property.title}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5"
                    >
                      <PropertyThumbnail image={property.image} alt={property.alt} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-950">
                          {property.title}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {property.location}
                        </p>
                      </div>
                      <span
                        className={`hidden items-center gap-2 rounded-full px-2 py-1 text-[9px] font-bold sm:inline-flex ${property.detailTone}`}
                      >
                        <StatusIcon className="h-3 w-3" aria-hidden="true" />
                        {property.detail}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Today
                  </p>
                  <h4 className="mt-1 text-sm font-bold text-slate-950">
                    Keep the next action visible
                  </h4>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {[
                  'Reply to Naledi',
                  'Confirm Sandton viewing',
                  'Follow up on Bryanston enquiry',
                ].map(task => (
                  <div key={task} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-orange-300 text-orange-700">
                      <Check className="h-2.5 w-2.5" aria-hidden="true" />
                    </span>
                    <span>{task}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-blue-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-blue)]">
                  Activity
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  See what is moving across listings, enquiries and follow-up.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
