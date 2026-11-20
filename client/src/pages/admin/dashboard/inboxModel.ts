export type InboxKind = 'payment' | 'listing' | 'development' | 'agent';

export type InboxItem = {
  id: string;
  kind: InboxKind;
  title: string;
  subtitle: string;
  waitingSince: string;
  href: string;
};

export type InboxTabId = 'all' | 'payments' | 'approvals';

export type InboxTab = { id: InboxTabId; label: string; count: number };

export type AgeLevel = 'ok' | 'warn' | 'late';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Tabs that have a real source today. "Support" and "Applications" are deliberately absent:
 * there is no support-ticket or application queue to read from yet.
 */
export const INBOX_TAB_SOURCES: Record<Exclude<InboxTabId, 'all'>, InboxKind[]> = {
  payments: ['payment'],
  approvals: ['listing', 'development', 'agent'],
};

export function ageHours(waitingSince: string, now: Date): number {
  const ms = now.getTime() - new Date(waitingSince).getTime();
  return Number.isFinite(ms) ? Math.max(0, ms / HOUR_MS) : 0;
}

/** Amber after 24 hours, red after 48 hours. */
export function ageTag(waitingSince: string, now: Date): { label: string; level: AgeLevel } {
  const hours = ageHours(waitingSince, now);
  const level: AgeLevel = hours > 48 ? 'late' : hours > 24 ? 'warn' : 'ok';
  if (hours < 1) return { label: 'Just now', level };
  const whole = Math.floor(hours);
  if (whole < 24) return { label: `${whole} h ago`, level };
  const days = Math.floor(whole / 24);
  return { label: `${days} d ${whole % 24} h`, level };
}

/** Oldest waiting first, so the most overdue work is at the top. */
export function sortInboxItems(items: InboxItem[]): InboxItem[] {
  return [...items].sort(
    (a, b) => new Date(a.waitingSince).getTime() - new Date(b.waitingSince).getTime(),
  );
}

export function buildInboxTabs(items: InboxItem[]): InboxTab[] {
  const countFor = (id: Exclude<InboxTabId, 'all'>) =>
    items.filter(item => INBOX_TAB_SOURCES[id].includes(item.kind)).length;
  return [
    { id: 'all', label: 'All', count: items.length },
    { id: 'payments', label: 'Payments', count: countFor('payments') },
    { id: 'approvals', label: 'Approvals', count: countFor('approvals') },
  ];
}

export function filterInbox(items: InboxItem[], tab: InboxTabId): InboxItem[] {
  if (tab === 'all') return items;
  return items.filter(item => INBOX_TAB_SOURCES[tab].includes(item.kind));
}

export function overdueCount(items: InboxItem[], now: Date): number {
  return items.filter(item => ageHours(item.waitingSince, now) > 24).length;
}

export type WeeklyPoint = {
  weekStart: string;
  signups: number;
  paidAccounts: number;
  enquiries: number;
};

export type GrowthMetric = 'signups' | 'paidAccounts' | 'enquiries';

export const GROWTH_METRICS: { id: GrowthMetric; label: string; noun: string; color: string }[] = [
  { id: 'signups', label: 'Sign-ups', noun: 'sign-ups', color: '#1D4ED8' },
  { id: 'paidAccounts', label: 'Paid accounts', noun: 'paid accounts', color: '#047857' },
  { id: 'enquiries', label: 'Enquiries', noun: 'enquiries', color: '#C2410C' },
];

/** Change versus last week, only when last week has real data to compare with. */
export function weekOverWeek(values: number[]): string | null {
  if (values.length < 2) return null;
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  if (prev <= 0) return null;
  const diff = last - prev;
  return `${diff > 0 ? '+' : ''}${diff} vs last week`;
}

export function formatWeekLabel(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    date,
  );
}
