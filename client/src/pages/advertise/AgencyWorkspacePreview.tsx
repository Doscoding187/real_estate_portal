import {
  BarChart3,
  BellRing,
  Building2,
  CalendarCheck2,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Home,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  Route,
  UserPlus,
  UsersRound,
} from 'lucide-react';

type AgencyWorkspacePreviewProps = {
  compact?: boolean;
};

const NAVIGATION = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Team', icon: UsersRound, active: false },
  { label: 'Inventory', icon: ListChecks, active: false },
  { label: 'Opportunities', icon: MessageSquareText, active: false },
  { label: 'Operations', icon: CalendarCheck2, active: false },
  { label: 'Commercial', icon: CircleDollarSign, active: false },
] as const;

const PROPERTIES = [
  {
    image: '/placeholder-property.jpg',
    alt: 'Illustrative apartment building listing thumbnail',
    title: '2-bed apartment',
    location: 'Sandton',
    assignedTo: 'Naledi',
    detail: 'Follow-up due',
    detailTone: 'bg-orange-50 text-orange-700',
    icon: BellRing,
  },
  {
    image: '/placeholders/development_placeholder_1_1763712033438.png',
    alt: 'Illustrative modern home listing thumbnail',
    title: 'Townhouse',
    location: 'Bryanston',
    assignedTo: 'Thabo',
    detail: 'Viewing today',
    detailTone: 'bg-blue-50 text-[var(--brand-blue)]',
    icon: CalendarCheck2,
  },
  {
    image: '/placeholder-property.jpg',
    alt: 'Illustrative residential property listing thumbnail',
    title: 'Family home',
    location: 'Fourways',
    assignedTo: 'Unassigned',
    detail: 'Needs an owner',
    detailTone: 'bg-violet-50 text-violet-700',
    icon: Route,
  },
] as const;

const KPI_ITEMS = [
  { label: 'Active agents', value: '12', icon: UsersRound, tone: 'text-violet-700' },
  { label: 'Pending invites', value: '2', icon: UserPlus, tone: 'text-blue-700' },
  { label: 'Agency inventory', value: '184', icon: Home, tone: 'text-[var(--brand-blue)]' },
  { label: 'New opportunities', value: '18', icon: MessageSquareText, tone: 'text-cyan-700' },
  { label: 'Needs attention', value: '6', icon: BellRing, tone: 'text-orange-700' },
] as const;

const TEAM_ATTENTION = [
  {
    name: 'Naledi',
    property: '2 follow-ups due · Sandton',
    detail: 'Follow-up',
    tone: 'bg-orange-50 text-orange-700',
  },
  {
    name: 'Thabo',
    property: 'Townhouse viewing · Bryanston',
    detail: 'Today',
    tone: 'bg-blue-50 text-[var(--brand-blue)]',
  },
  {
    name: 'Peter',
    property: '3 enquiries need an owner',
    detail: 'Assign',
    tone: 'bg-violet-50 text-violet-700',
  },
] as const;

const OPERATIONS_QUEUE = [
  { label: 'Follow-up due', detail: 'Keep the buyer conversation moving', icon: BellRing },
  { label: 'Viewing today', detail: 'Capture the next outcome', icon: CalendarCheck2 },
  { label: 'Next action', detail: 'Confirm ownership before work stalls', icon: ClipboardCheck },
] as const;

const COMMERCIAL_PROGRESS = [
  { label: 'Offers in progress', detail: 'Supported deal workflow', icon: ClipboardCheck },
  { label: 'Deals progressing', detail: 'Stages and next actions', icon: BarChart3 },
  {
    label: 'Commission visibility',
    detail: 'Tracked in the Agency workspace',
    icon: CircleDollarSign,
  },
] as const;

const MANAGEMENT_SIGNALS = [
  { label: 'Inventory requiring attention', detail: '11 listings', icon: ListChecks },
  { label: 'Unassigned opportunities', detail: '3 enquiries', icon: Route },
  { label: 'Response queue', detail: '6 next actions', icon: Clock3 },
] as const;

function PropertyThumbnail({
  image,
  alt,
  compact,
}: {
  image: string;
  alt: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? 'h-12 w-14' : 'h-14 w-16 sm:h-16 sm:w-[4.5rem]'} relative shrink-0 overflow-hidden rounded-xl bg-slate-100`}
    >
      <img
        src={image}
        alt={alt}
        className="h-full w-full object-cover"
        loading={compact ? 'eager' : 'lazy'}
      />
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
      aria-label="Illustrative Agency workspace navigation"
    >
      <div className="flex items-center gap-3 border-b border-white/10 pb-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-blue)] text-white">
          <Building2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">Agency</p>
          <p className="text-[10px] font-semibold text-slate-400">workspace</p>
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
        People, property and commercial progress in one operating view.
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

function StatusRow({
  label,
  detail,
  icon: Icon,
  tone = 'text-[var(--brand-blue)]',
}: {
  label: string;
  detail: string;
  icon: typeof BellRing;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
        <Icon className={`h-3.5 w-3.5 ${tone}`} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-xs font-bold text-slate-900">{label}</strong>
        <span className="mt-0.5 block truncate text-[10px] text-slate-500">{detail}</span>
      </span>
      <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
    </div>
  );
}

export function AgencyWorkspacePreview({ compact = false }: AgencyWorkspacePreviewProps) {
  return (
    <div
      data-testid="agency-workspace-preview"
      aria-label="Illustrative Property Listify Agency workspace preview"
      className={`overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.14)] ${
        compact ? 'max-h-[640px] sm:max-h-[720px]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <p className="text-xs font-bold text-slate-950">Agency workspace</p>
          <span className="hidden rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:inline-flex">
            Illustrative preview
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
          <span className="hidden sm:inline">Mokoena Property Group</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[var(--brand-blue)]">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="grid min-h-[470px] sm:grid-cols-[11.25rem_minmax(0,1fr)]">
        <WorkspaceNavigation compact={compact} />

        <div className="min-w-0 bg-[#f8fafc] p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--brand-blue)]">
                Principal view · overview
              </p>
              <h3 className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                Good morning, Sarah
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Sample interface · values shown for orientation only.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-500">
              Managerial workspace
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-5">
            {KPI_ITEMS.map(item => (
              <KpiCard key={item.label} {...item} />
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Team attention
                  </p>
                  <h4 className="mt-1 text-sm font-bold text-slate-950">
                    Visibility without micromanagement
                  </h4>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                  <UsersRound className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {TEAM_ATTENTION.map(item => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                        {item.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-xs font-semibold text-slate-800">
                          {item.name}
                        </strong>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                          {item.property}
                        </span>
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${item.tone}`}
                    >
                      {item.detail}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Operations
                  </p>
                  <h4 className="mt-1 text-sm font-bold text-slate-950">
                    Keep the next action visible
                  </h4>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {OPERATIONS_QUEUE.map(item => (
                  <StatusRow key={item.label} {...item} />
                ))}
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Agency inventory and opportunities
                </p>
                <h4 className="mt-1 text-sm font-bold text-slate-950">
                  Properties with ownership and context
                </h4>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[var(--brand-blue)]">
                <Route className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {PROPERTIES.map(property => {
                const StatusIcon = property.icon;
                return (
                  <div
                    key={property.title}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5"
                  >
                    <PropertyThumbnail
                      image={property.image}
                      alt={property.alt}
                      compact={compact}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-950">{property.title}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{property.location}</p>
                      <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">
                        {property.assignedTo}
                      </p>
                    </div>
                    <span
                      className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold sm:inline-flex ${property.detailTone}`}
                    >
                      <StatusIcon className="h-3 w-3" aria-hidden="true" />
                      {property.detail}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-[var(--brand-blue)]" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-blue)]">
                  Commercial progress
                </p>
              </div>
              <div className="mt-3 space-y-2.5">
                {COMMERCIAL_PROGRESS.map(item => (
                  <StatusRow key={item.label} {...item} tone="text-emerald-700" />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[var(--brand-blue)]" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-blue)]">
                  Management view
                </p>
              </div>
              <div className="mt-3 space-y-2.5">
                {MANAGEMENT_SIGNALS.map(item => (
                  <StatusRow key={item.label} {...item} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
