import React, { useState } from 'react';
import { CheckCircle, Plus, Receipt, Users } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { ADMIN_PAGE_CLASS } from '@/components/admin/adminPageLayout';
import { useLocation } from 'wouter';
import GrowthChart from './dashboard/GrowthChart';
import {
  ageTag,
  INBOX_SOURCE_PAGES,
  buildInboxTabs,
  cappedSources,
  filterInbox,
  overdueCount,
  sortInboxItems,
  type AgeLevel,
  type InboxItem,
  type InboxTabId,
  type InboxTotals,
} from './dashboard/inboxModel';

const card = 'bg-white border border-slate-200 rounded-lg';
const focus = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600';

const AGE_CLASS: Record<AgeLevel, string> = {
  ok: 'bg-slate-100 text-slate-700',
  warn: 'bg-amber-100 text-amber-900',
  late: 'bg-red-100 text-red-900',
};

const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-12' }) => (
  <div data-testid="skeleton" className={`animate-pulse rounded bg-slate-100 ${className}`} />
);

const ErrorRetry: React.FC<{ what: string; onRetry: () => void }> = ({ what, onRetry }) => (
  <div role="alert" className="flex items-center justify-between gap-3 p-4 text-sm text-red-800">
    <span>Could not load {what}.</span>
    <button
      type="button"
      onClick={onRetry}
      className={`min-h-[36px] px-3 rounded-md border border-red-300 bg-white font-semibold ${focus}`}
    >
      Retry
    </button>
  </div>
);

const OverviewPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<InboxTabId>('all');
  const analytics = trpc.admin.getAnalytics.useQuery();
  const launch = trpc.admin.getLaunchDashboardStats.useQuery();
  const inbox = trpc.admin.getDailyInbox.useQuery(undefined, { refetchInterval: 30000 });
  const activity = trpc.admin.getRecentAdminActivity.useQuery();
  const growth = trpc.admin.getWeeklyGrowth.useQuery();

  const now = new Date();
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  const formatNumber = (num: number) => new Intl.NumberFormat('en-ZA').format(num);

  const pulseValue = (
    q: { isLoading: boolean; isError: boolean },
    value: number | undefined,
    format: (n: number) => string = formatNumber,
  ) => (q.isLoading ? '...' : q.isError || value === undefined ? 'Unavailable' : format(value));

  const pulse = [
    { label: 'EFT proofs waiting', value: pulseValue(launch, launch.data?.eftAwaitingReview) },
    { label: 'Verified payments', value: pulseValue(launch, launch.data?.approvedThisMonthCount) },
    {
      label: 'Approved amount',
      value: pulseValue(launch, launch.data?.approvedThisMonthRand, formatCurrency),
    },
    {
      label: 'Active subscriptions',
      value: pulseValue(analytics, analytics.data?.paidSubscriptions),
    },
    { label: 'New users, 30 days', value: pulseValue(analytics, analytics.data?.userGrowth) },
    { label: 'Leads, 30 days', value: pulseValue(launch, launch.data?.newLeads30d) },
  ];

  const items: InboxItem[] = sortInboxItems((inbox.data?.items ?? []) as InboxItem[]);
  const totals = inbox.data?.totals as InboxTotals | undefined;
  const tabs = buildInboxTabs(items, totals);
  const totalWaiting = tabs[0].count;
  const visible = filterInbox(items, tab);
  const overdue = overdueCount(items, now);
  const capped = cappedSources(items, totals, tab);

  const quick = [
    { label: 'New curated development', icon: Plus, href: '/admin/publisher/developments/new' },
    { label: 'Review EFT proofs', icon: Receipt, href: '/admin/finance' },
    { label: 'Approvals', icon: CheckCircle, href: '/admin/approvals' },
    { label: 'View pilot users', icon: Users, href: '/admin/users' },
  ];

  const activityText = (a: NonNullable<typeof activity.data>[number]) => {
    const what = a.action.replace(/[._]/g, ' ');
    const target = a.targetType ? ` (${a.targetType}${a.targetId ? ` #${a.targetId}` : ''})` : '';
    return `${a.actorName || 'A user'}: ${what}${target}`;
  };

  return (
    <div className={`${ADMIN_PAGE_CLASS} flex flex-wrap gap-6 items-start`}>
      <section className="flex-[999_1_520px] min-w-0 flex flex-col gap-5">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            {inbox.isLoading
              ? 'Checking what needs you...'
              : inbox.isError
                ? 'Could not check what needs you.'
                : totalWaiting === 0
                  ? 'Nothing is waiting on you right now.'
                  : `${totalWaiting} ${totalWaiting === 1 ? 'thing needs' : 'things need'} you today${
                      overdue ? `, ${overdue} waiting more than a day.` : '.'
                    }`}
          </p>
        </div>

        <div className={`${card} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Needs you today</h2>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Inbox filter">
              {tabs.map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`min-h-[36px] px-3 rounded-md border text-sm ${focus} ${
                    tab === t.id
                      ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  {t.label} <span className="text-xs font-bold opacity-80">{t.count}</span>
                </button>
              ))}
            </div>
          </div>

          {inbox.isLoading ? (
            <div className="p-5 space-y-3">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : inbox.isError ? (
            <ErrorRetry what="the inbox" onRetry={() => inbox.refetch()} />
          ) : visible.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-semibold text-slate-900">Nothing waiting. All clear.</p>
              <p className="text-sm text-slate-600 mt-1">New items appear as they arrive.</p>
            </div>
          ) : (
            <ul>
              {visible.map(item => {
                const age = ageTag(item.waitingSince, now);
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100 hover:bg-slate-50"
                  >
                    <div className="flex-[1_1_260px] min-w-0">
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <div className="text-sm text-slate-600 mt-0.5">{item.subtitle}</div>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded px-2.5 h-6 inline-flex items-center text-xs font-semibold ${AGE_CLASS[age.level]}`}
                    >
                      {age.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLocation(item.href)}
                      className={`min-h-[40px] px-4 rounded-md bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 ${focus}`}
                    >
                      Open
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {capped.map(c => (
            <p
              key={c.kind}
              className="px-5 py-2 text-sm text-amber-900 bg-amber-50 border-t border-amber-100"
            >
              Showing {c.shown} of {c.total} &mdash;{' '}
              <button
                type="button"
                onClick={() => setLocation(INBOX_SOURCE_PAGES[c.kind].href)}
                className={`underline font-semibold ${focus}`}
              >
                open {INBOX_SOURCE_PAGES[c.kind].label} for all
              </button>
            </p>
          ))}
          <p className="px-5 py-3 text-sm text-slate-600 bg-slate-50">
            Buyer enquiries for a development or listing are not here: they sit in that
            development&rsquo;s or publisher&rsquo;s Leads tab. Support requests and applications
            are not listed because there is no queue for them yet.
          </p>
        </div>

        <div className={`${card} px-5 py-4`}>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Recent activity</h2>
          {activity.isLoading ? (
            <Skeleton className="h-20" />
          ) : activity.isError ? (
            <ErrorRetry what="recent activity" onRetry={() => activity.refetch()} />
          ) : !activity.data || activity.data.length === 0 ? (
            <p className="text-sm text-slate-600">No recorded admin activity yet.</p>
          ) : (
            <ul>
              {activity.data.map(a => (
                <li
                  key={a.id}
                  className="flex gap-3 items-start py-2.5 border-b border-slate-100 text-sm"
                >
                  <span className="flex-1">{activityText(a)}</span>
                  <time className="text-xs text-slate-600 whitespace-nowrap" dateTime={a.createdAt}>
                    {ageTag(a.createdAt, now).label}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <aside className="flex-[1_1_360px] max-w-[420px] flex flex-col gap-5">
        <div className={`${card} p-5`}>
          <h2 className="text-sm font-semibold text-slate-900">Pilot pulse</h2>
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            {pulse.map(p => (
              <div key={p.label} className="border border-slate-100 rounded-md p-3 min-w-0">
                <div className="text-[11px] text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">
                  {p.label}
                </div>
                <div className="text-lg font-bold text-slate-900 mt-1.5 whitespace-nowrap">
                  {p.value}
                </div>
              </div>
            ))}
          </div>
          {launch.isError || analytics.isError ? (
            <button
              type="button"
              onClick={() => {
                launch.refetch();
                analytics.refetch();
              }}
              className={`mt-3 min-h-[36px] px-3 rounded-md border border-slate-300 text-sm ${focus}`}
            >
              Retry
            </button>
          ) : null}
        </div>

        <div className={`${card} p-5`}>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {quick.map(q => (
              <button
                key={q.label}
                type="button"
                onClick={() => setLocation(q.href)}
                className={`flex flex-col items-start gap-2 p-3 min-h-[44px] rounded-lg border border-slate-200 bg-white text-left hover:shadow-md transition-shadow ${focus}`}
              >
                <q.icon aria-hidden="true" className="h-5 w-5 text-blue-700" />
                <span className="text-xs font-semibold text-slate-900">{q.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`${card} p-5`}>
          <h2 className="text-sm font-semibold text-slate-900">Are we growing?</h2>
          <p className="text-xs text-slate-600 mt-1 mb-3">
            Per week, last 8 weeks. Verified payments are counted per payment, not per account.
          </p>
          {growth.isLoading ? (
            <Skeleton className="h-48" />
          ) : growth.isError ? (
            <ErrorRetry what="the growth chart" onRetry={() => growth.refetch()} />
          ) : (
            <GrowthChart points={growth.data ?? []} />
          )}
        </div>
      </aside>
    </div>
  );
};

export default OverviewPage;
