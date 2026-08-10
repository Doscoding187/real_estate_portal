import {
  Building2,
  Check,
  ClipboardCheck,
  Clock3,
  FileText,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  PackageOpen,
  Search,
  ShieldCheck,
  Tag,
} from 'lucide-react';

type DeveloperWorkspacePreviewProps = {
  compact?: boolean;
};

const NAVIGATION = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Developments', icon: Building2, active: false },
  { label: 'Unit inventory', icon: PackageOpen, active: false },
  { label: 'Enquiries', icon: MessageSquareText, active: false },
  { label: 'Readiness', icon: ShieldCheck, active: false },
] as const;

const KPI_ITEMS = [
  { label: 'Active developments', value: '6', icon: Building2, tone: 'text-[var(--brand-blue)]' },
  { label: 'Unit types', value: '18', icon: PackageOpen, tone: 'text-indigo-700' },
  { label: 'Available units', value: '64', icon: Tag, tone: 'text-emerald-700' },
  { label: 'Project enquiries', value: '24', icon: MessageSquareText, tone: 'text-orange-700' },
] as const;

const DEVELOPMENTS = [
  {
    image: '/placeholders/development_placeholder_3_1763712078958.png',
    alt: 'Illustrative modern mixed-use development',
    name: 'The Ridge',
    location: 'Midrand',
    status: 'Under construction',
    unitTypes: '4 unit types',
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    image: '/placeholders/development_placeholder_1_1763712033438.png',
    alt: 'Illustrative coastal residential development',
    name: 'Parkview Residences',
    location: 'Rosebank',
    status: 'Selling now',
    unitTypes: '6 unit types',
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    image: '/placeholders/development_placeholder_2_1763712057181.png',
    alt: 'Illustrative residential development with mountain views',
    name: 'Harbour Mews',
    location: 'Cape Town',
    status: 'Launching soon',
    unitTypes: '3 unit types',
    tone: 'bg-blue-50 text-[var(--brand-blue)]',
  },
] as const;

const INVENTORY_ITEMS = [
  { name: '2-bed apartment', detail: '85 m² · from R1.28m', available: '24 available' },
  { name: '3-bed townhouse', detail: '120 m² · from R1.8m', available: '17 available' },
  { name: 'Studio apartment', detail: '48 m² · from R890k', available: '9 available' },
] as const;

const INTEREST_ITEMS = [
  {
    development: 'The Ridge',
    unit: '2-bed apartment',
    detail: 'New project enquiry',
    tone: 'bg-blue-50 text-[var(--brand-blue)]',
  },
  {
    development: 'Parkview Residences',
    unit: '3-bed townhouse',
    detail: 'Follow-up due',
    tone: 'bg-orange-50 text-orange-700',
  },
  {
    development: 'Harbour Mews',
    unit: 'Unit interest',
    detail: 'Needs an owner',
    tone: 'bg-violet-50 text-violet-700',
  },
] as const;

const READINESS_ITEMS = [
  { label: 'The Ridge', detail: 'Readiness · under review', tone: 'text-amber-700' },
  { label: 'Parkview Residences', detail: 'Public page · live', tone: 'text-emerald-700' },
  { label: 'Harbour Mews', detail: 'Draft · media to complete', tone: 'text-slate-500' },
] as const;

function WorkspaceNavigation({ compact }: { compact: boolean }) {
  return (
    <aside
      className={`${compact ? 'hidden sm:block' : ''} bg-slate-950 p-4 text-slate-300 sm:p-5`}
      aria-label="Illustrative Developer workspace navigation"
    >
      <div className="flex items-center gap-3 border-b border-white/10 pb-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-blue)] text-white">
          <Building2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">Developer</p>
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
        A portfolio view for the projects, unit options and enquiries behind a development launch.
      </div>
    </aside>
  );
}

function MetricCard({ label, value, icon: Icon, tone }: (typeof KPI_ITEMS)[number]) {
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

function DevelopmentRow({
  item,
  compact,
}: {
  item: (typeof DEVELOPMENTS)[number];
  compact: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-2.5">
      <div
        className={`${compact ? 'h-12 w-14' : 'h-14 w-16'} relative shrink-0 overflow-hidden rounded-xl bg-slate-200`}
      >
        <img
          src={item.image}
          alt={item.alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span className="absolute inset-x-1 bottom-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-center text-[8px] font-semibold uppercase tracking-[0.08em] text-white">
          Preview
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-950">{item.name}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
          {item.location}
        </p>
        <p className="mt-1 truncate text-[10px] text-slate-500">{item.unitTypes}</p>
        <span
          className={`mt-1 inline-flex w-fit rounded-full px-2 py-1 text-[9px] font-bold sm:hidden ${item.tone}`}
        >
          {item.status}
        </span>
      </div>
      <span
        className={`hidden shrink-0 rounded-full px-2 py-1 text-[9px] font-bold sm:inline-flex ${item.tone}`}
      >
        {item.status}
      </span>
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
  icon: typeof Check;
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

export function DeveloperWorkspacePreview({ compact = false }: DeveloperWorkspacePreviewProps) {
  return (
    <div
      data-testid="developer-workspace-preview"
      aria-label="Illustrative Property Listify Developer workspace preview"
      className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.14)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <p className="text-xs font-bold text-slate-950">Developer workspace</p>
          <span className="hidden rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:inline-flex">
            Illustrative preview
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
          <span className="hidden sm:inline">Sample portfolio view</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[var(--brand-blue)]">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="grid min-h-[530px] sm:grid-cols-[11.75rem_minmax(0,1fr)]">
        <WorkspaceNavigation compact={compact} />

        <div className="min-w-0 bg-[#f8fafc] p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--brand-blue)]">
                Portfolio view · developments
              </p>
              <h3 className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                See each development and its next signal.
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Sample interface · values shown for orientation only.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-500">
              Portfolio workspace
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {KPI_ITEMS.map(item => (
              <MetricCard key={item.label} {...item} />
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Portfolio
                  </p>
                  <h4 className="mt-1 text-sm font-bold text-slate-950">
                    Multiple developments, one view
                  </h4>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[var(--brand-blue)]">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {DEVELOPMENTS.map(item => (
                  <DevelopmentRow key={item.name} item={item} compact={compact} />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Inventory snapshot
                  </p>
                  <h4 className="mt-1 text-sm font-bold text-slate-950">
                    Unit types and availability
                  </h4>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <PackageOpen className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {INVENTORY_ITEMS.map(item => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--brand-blue)] shadow-sm">
                      <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs font-bold text-slate-900">
                        {item.name}
                      </strong>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {item.detail}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                      {item.available}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Project interest
                  </p>
                  <h4 className="mt-1 text-sm font-bold text-slate-950">
                    Development-linked enquiries
                  </h4>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                  <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {INTEREST_ITEMS.map(item => (
                  <div
                    key={`${item.development}-${item.unit}`}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-700 shadow-sm">
                      {item.development.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs font-semibold text-slate-900">
                        {item.development}
                      </strong>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {item.unit}
                      </span>
                    </span>
                    <span
                      className={`hidden shrink-0 rounded-full px-2 py-1 text-[9px] font-bold sm:inline-flex ${item.tone}`}
                    >
                      {item.detail}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--brand-blue)]" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-blue)]">
                  Readiness and attention
                </p>
              </div>
              <div className="mt-3 space-y-2.5">
                {READINESS_ITEMS.map(item => (
                  <StatusRow
                    key={item.label}
                    label={item.label}
                    detail={item.detail}
                    icon={ShieldCheck}
                    tone={item.tone}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-white/80 px-3 py-2.5 text-[10px] leading-5 text-slate-600">
                <ClipboardCheck
                  className="h-3.5 w-3.5 shrink-0 text-[var(--brand-blue)]"
                  aria-hidden="true"
                />
                Review and publication status stay visible beside the project work.
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-semibold text-slate-600">
              <Search className="h-3.5 w-3.5 text-[var(--brand-blue)]" aria-hidden="true" />
              Public discovery
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-semibold text-slate-600">
              <FileText className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />
              Media and floor plans
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-semibold text-slate-600">
              <Clock3 className="h-3.5 w-3.5 text-orange-700" aria-hidden="true" />
              Follow-up and next action
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeveloperWorkspacePreview;
