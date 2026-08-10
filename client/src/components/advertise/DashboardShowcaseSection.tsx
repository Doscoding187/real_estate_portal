import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Inbox,
  ListTodo,
  MessageSquareText,
  Search,
  Settings2,
  Users,
} from 'lucide-react';

const navigation = [
  { label: 'Overview', icon: BriefcaseBusiness, active: true },
  { label: 'Enquiries', icon: Inbox },
  { label: 'Listings', icon: FileText },
  { label: 'Pipeline', icon: BarChart3 },
  { label: 'Tasks', icon: ListTodo },
  { label: 'Reports', icon: ClipboardCheck },
];

const kpis = [
  { label: 'Enquiries', value: 'Organised', detail: 'Capture and route interest', icon: Inbox },
  { label: 'Active listings', value: 'Managed', detail: 'Keep inventory accurate', icon: FileText },
  { label: 'Follow-ups', value: 'Planned', detail: 'Keep the next action visible', icon: ListTodo },
  { label: 'Pipeline', value: 'Tracked', detail: 'Move opportunities forward', icon: BarChart3 },
];

const enquiryRows = [
  { label: 'Property enquiry', context: 'Illustrative listing interest', tone: 'bg-blue-500' },
  {
    label: 'Development enquiry',
    context: 'Illustrative project interest',
    tone: 'bg-emerald-500',
  },
  { label: 'Follow-up task', context: 'Illustrative next action', tone: 'bg-orange-500' },
];

const pipelineStages = [
  { label: 'New', tone: 'bg-blue-50 text-blue-700 border-blue-100' },
  { label: 'Contacted', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  { label: 'Qualified', tone: 'bg-violet-50 text-violet-700 border-violet-100' },
  { label: 'Viewing', tone: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  { label: 'Offer', tone: 'bg-orange-50 text-orange-700 border-orange-100' },
  { label: 'Follow-up', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const nextActions = [
  'Respond to a new property enquiry',
  'Review listing details before publishing',
  'Prepare the next follow-up note',
];

function PreviewLabel({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
        dark
          ? 'border-slate-700 bg-slate-800/80 text-slate-300'
          : 'border-blue-100 bg-blue-50 text-blue-700'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dark ? 'bg-cyan-400' : 'bg-blue-500'}`} />
      Product preview
    </span>
  );
}

/**
 * Compact dark preview used in the hero. It intentionally shows interface
 * structure and workflow rather than live activity or performance numbers.
 */
export function WorkspaceProductPreview() {
  return (
    <div
      data-testid="hero-product-preview"
      aria-label="Illustrative Property Listify workspace preview"
      className="relative overflow-hidden rounded-[1.75rem] border border-slate-700/80 bg-slate-950 p-3 shadow-2xl shadow-slate-950/40"
    >
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="ml-2 text-xs font-semibold text-slate-300">
            Property Listify workspace
          </span>
        </div>
        <PreviewLabel dark />
      </div>

      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300">
                Overview
              </p>
              <h3 className="mt-1 text-sm font-bold text-white">Your business activity</h3>
            </div>
            <Bell className="h-4 w-4 text-slate-500" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {kpis.slice(0, 3).map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                >
                  <Icon className="mb-3 h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
                  <p className="text-[10px] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-xs font-bold text-slate-100">{item.value}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-300">Enquiry activity</span>
                <span className="text-[9px] text-slate-500">Illustrative view</span>
              </div>
              <svg
                viewBox="0 0 320 92"
                className="h-24 w-full"
                role="img"
                aria-label="Illustrative enquiry activity trend"
              >
                <path
                  d="M0 75 C34 67 42 58 72 63 S108 47 138 55 S178 35 207 45 S247 21 276 34 S300 19 320 23 V92 H0 Z"
                  fill="#60a5fa"
                  fillOpacity="0.14"
                />
                <path
                  d="M0 75 C34 67 42 58 72 63 S108 47 138 55 S178 35 207 45 S247 21 276 34 S300 19 320 23"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-300">Recent activity</span>
                <MessageSquareText className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              </div>
              <div className="space-y-2.5">
                {enquiryRows.slice(0, 2).map(row => (
                  <div key={row.label} className="flex items-start gap-2">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${row.tone}`} />
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold text-slate-200">
                        {row.label}
                      </p>
                      <p className="truncate text-[9px] text-slate-500">{row.context}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const DashboardShowcaseSection: React.FC = () => {
  return (
    <section
      id="dashboard-showcase"
      data-testid="dashboard-showcase-section"
      className="border-b border-slate-100 bg-white py-24 md:py-32"
      aria-labelledby="dashboard-showcase-heading"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-4xl text-center md:mb-16">
          <PreviewLabel />
          <h2
            id="dashboard-showcase-heading"
            className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl"
          >
            Your property business dashboard
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600 md:text-xl md:leading-9">
            Organise inventory, enquiries, follow-up and business activity from the Property Listify
            workspace that fits how you operate.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65 }}
          className="mx-auto max-w-[1320px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 shadow-2xl shadow-slate-200/70 md:p-6"
        >
          <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[220px_1fr] md:p-6">
            <aside className="hidden rounded-xl bg-slate-950 p-5 text-slate-300 md:block">
              <div className="mb-8 flex items-center gap-2 text-sm font-bold text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
                  <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                </div>
                Workspace
              </div>
              <nav aria-label="Illustrative workspace navigation" className="space-y-1.5">
                {navigation.map(item => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium ${
                        item.active ? 'bg-blue-500/15 text-blue-200' : 'text-slate-500'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </div>
                  );
                })}
              </nav>
              <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Workspace note
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Use the supported tools for your business path.
                </p>
              </div>
            </aside>

            <div className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                    Overview
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-950">Business activity</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="hidden sm:inline">Illustrative interface</span>
                  <Settings2 className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {kpis.map(item => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Preview
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500">{item.label}</p>
                      <p className="mt-1 text-xl font-extrabold text-slate-950">{item.value}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-950">Activity trend</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        A simple view of enquiry and follow-up movement.
                      </p>
                    </div>
                    <BarChart3 className="h-5 w-5 text-blue-500" aria-hidden="true" />
                  </div>
                  <svg
                    viewBox="0 0 680 180"
                    className="h-48 w-full"
                    role="img"
                    aria-label="Illustrative activity trend chart"
                  >
                    <defs>
                      <linearGradient id="workspace-area" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[30, 70, 110, 150].map(y => (
                      <line
                        key={y}
                        x1="0"
                        x2="680"
                        y1={y}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />
                    ))}
                    <path
                      d="M0 146 C65 138 77 108 132 122 S205 92 260 108 S336 56 397 86 S476 43 530 68 S618 32 680 45 V180 H0 Z"
                      fill="url(#workspace-area)"
                    />
                    <path
                      d="M0 146 C65 138 77 108 132 122 S205 92 260 108 S336 56 397 86 S476 43 530 68 S618 32 680 45"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-600" /> Enquiry activity
                    </span>
                    <span className="text-slate-400">Illustrative only</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-950">Recent enquiries</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Property context stays attached to interest.
                      </p>
                    </div>
                    <MessageSquareText className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                  </div>
                  <div className="space-y-3">
                    {enquiryRows.map(row => (
                      <div
                        key={row.label}
                        className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
                      >
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${row.tone}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800">{row.label}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{row.context}</p>
                        </div>
                        <span className="ml-auto whitespace-nowrap text-[10px] font-semibold text-slate-400">
                          Sample
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-950">Pipeline status</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Use current enquiry stages to guide follow-up.
                      </p>
                    </div>
                    <Users className="h-5 w-5 text-violet-500" aria-hidden="true" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pipelineStages.map(stage => (
                      <span
                        key={stage.label}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${stage.tone}`}
                      >
                        {stage.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-950">Next actions</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Turn interest into organised follow-up.
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                  </div>
                  <ul className="space-y-2.5">
                    {nextActions.map(action => (
                      <li
                        key={action}
                        className="flex items-start gap-2 text-xs font-medium text-slate-700"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-slate-600">
            The dashboard is a product illustration, not live market or customer-performance
            evidence.
          </p>
          <a
            href="#live-demand"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900"
          >
            See how interest moves through the platform
            <Search className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default DashboardShowcaseSection;
