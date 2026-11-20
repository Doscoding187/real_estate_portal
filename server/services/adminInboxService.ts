/**
 * Super Admin daily inbox: read-only queries over existing tables.
 * No writes, no schema change. Every row returned is a real pending work item.
 */
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import {
  agents,
  auditLogs,
  billingPayments,
  developments,
  leads,
  listings,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db';

export type AdminInboxKind = 'payment' | 'listing' | 'development' | 'agent';

export type AdminInboxItem = {
  id: string;
  kind: AdminInboxKind;
  title: string;
  subtitle: string;
  /** ISO timestamp the item started waiting (UTC). */
  waitingSince: string;
  /** Existing admin page that handles the item. */
  href: string;
};

export type AdminActivityItem = {
  id: number;
  action: string;
  targetType: string | null;
  targetId: number | null;
  actorName: string | null;
  createdAt: string;
};

export type AdminWeeklyPoint = {
  /** ISO date (UTC) of the first day of the 7-day window. */
  weekStart: string;
  signups: number;
  paidAccounts: number;
  enquiries: number;
};

export const WEEKS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;
const PER_SOURCE_LIMIT = 50;

/** Database timestamps are stored as UTC 'YYYY-MM-DD HH:MM:SS' strings. */
export function toIsoUtc(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date =
    value instanceof Date ? value : new Date(/Z|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function dbTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/** Merge items from every source, oldest waiting first. */
export function sortInbox(items: AdminInboxItem[]): AdminInboxItem[] {
  return [...items].sort(
    (a, b) => new Date(a.waitingSince).getTime() - new Date(b.waitingSince).getTime(),
  );
}

type WeekCounts = Array<{ weeksAgo: number; count: number }>;

/**
 * Build exactly `weeks` points, oldest first. Week index 0 in the SQL buckets is the most
 * recent 7 days. Weeks with no rows are real zeros.
 */
export function fillWeeklySeries(
  now: Date,
  source: { signups: WeekCounts; paidAccounts: WeekCounts; enquiries: WeekCounts },
  weeks = WEEKS,
): AdminWeeklyPoint[] {
  const pick = (rows: WeekCounts, weeksAgo: number) =>
    rows.filter(r => Number(r.weeksAgo) === weeksAgo).reduce((sum, r) => sum + Number(r.count), 0);
  const points: AdminWeeklyPoint[] = [];
  for (let weeksAgo = weeks - 1; weeksAgo >= 0; weeksAgo -= 1) {
    const start = new Date(now.getTime() - (weeksAgo + 1) * 7 * DAY_MS);
    points.push({
      weekStart: start.toISOString().slice(0, 10),
      signups: pick(source.signups, weeksAgo),
      paidAccounts: pick(source.paidAccounts, weeksAgo),
      enquiries: pick(source.enquiries, weeksAgo),
    });
  }
  return points;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db;
}

export async function loadAdminInbox(): Promise<AdminInboxItem[]> {
  const db = await requireDb();
  const [payments, pendingListings, pendingDevelopments, pendingAgents] = await Promise.all([
    db
      .select({
        id: billingPayments.id,
        amount: billingPayments.amount,
        currency: billingPayments.currency,
        reference: billingPayments.paymentReference,
        payer: billingPayments.payerName,
        ownerType: billingPayments.ownerType,
        createdAt: billingPayments.createdAt,
      })
      .from(billingPayments)
      .where(inArray(billingPayments.state, ['submitted', 'under_review']))
      .orderBy(billingPayments.createdAt)
      .limit(PER_SOURCE_LIMIT),
    db
      .select({ id: listings.id, title: listings.title, updatedAt: listings.updatedAt })
      .from(listings)
      .where(eq(listings.status, 'pending_review'))
      .orderBy(listings.updatedAt)
      .limit(PER_SOURCE_LIMIT),
    db
      .select({ id: developments.id, name: developments.name, updatedAt: developments.updatedAt })
      .from(developments)
      .where(eq(developments.approvalStatus, 'pending'))
      .orderBy(developments.updatedAt)
      .limit(PER_SOURCE_LIMIT),
    db
      .select({
        id: agents.id,
        firstName: agents.firstName,
        lastName: agents.lastName,
        displayName: agents.displayName,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(eq(agents.status, 'pending'))
      .orderBy(agents.createdAt)
      .limit(PER_SOURCE_LIMIT),
  ]);

  const items: AdminInboxItem[] = [];
  const push = (item: Omit<AdminInboxItem, 'waitingSince'> & { at: string | null }) => {
    const waitingSince = toIsoUtc(item.at);
    if (!waitingSince) return;
    const { at: _at, ...rest } = item;
    items.push({ ...rest, waitingSince });
  };

  for (const p of payments) {
    const amount = Number(p.amount) / 100;
    push({
      id: `payment-${p.id}`,
      kind: 'payment',
      title: `EFT proof, ${p.currency} ${amount.toLocaleString('en-ZA')}`,
      subtitle: [p.payer, `Reference ${p.reference}`, p.ownerType].filter(Boolean).join(' · '),
      at: p.createdAt,
      href: '/admin/finance',
    });
  }
  for (const l of pendingListings) {
    push({
      id: `listing-${l.id}`,
      kind: 'listing',
      title: `Listing to approve: ${l.title}`,
      subtitle: 'Waiting since last change',
      at: l.updatedAt,
      href: '/admin/approvals?tab=listings',
    });
  }
  for (const d of pendingDevelopments) {
    push({
      id: `development-${d.id}`,
      kind: 'development',
      title: `Development to review: ${d.name}`,
      subtitle: 'Waiting since last change',
      at: d.updatedAt,
      href: '/admin/approvals?tab=developments',
    });
  }
  for (const a of pendingAgents) {
    const name = a.displayName || `${a.firstName} ${a.lastName}`.trim();
    push({
      id: `agent-${a.id}`,
      kind: 'agent',
      title: `Agent to approve: ${name}`,
      subtitle: 'Applied for an agent profile',
      at: a.createdAt,
      href: '/admin/approvals?tab=agents',
    });
  }
  return sortInbox(items);
}

export async function loadRecentAdminActivity(limit = 8): Promise<AdminActivityItem[]> {
  const db = await requireDb();
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      actorName: users.name,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(Math.min(Math.max(limit, 1), 20));
  return rows.flatMap(row => {
    const createdAt = toIsoUtc(row.createdAt);
    return createdAt ? [{ ...row, createdAt }] : [];
  });
}

export async function loadWeeklyGrowth(): Promise<AdminWeeklyPoint[]> {
  const db = await requireDb();
  const now = new Date();
  const since = dbTimestamp(new Date(now.getTime() - WEEKS * 7 * DAY_MS));
  const bucket = (column: unknown) =>
    sql<number>`FLOOR(TIMESTAMPDIFF(DAY, ${column}, UTC_TIMESTAMP()) / 7)`;

  const signupBucket = bucket(users.createdAt);
  const paidBucket = bucket(billingPayments.reviewedAt);
  const leadBucket = bucket(leads.createdAt);

  const [signups, paidAccounts, enquiries] = await Promise.all([
    db
      .select({ weeksAgo: signupBucket, count: sql<number>`COUNT(*)` })
      .from(users)
      .where(gte(users.createdAt, since))
      .groupBy(signupBucket),
    db
      .select({ weeksAgo: paidBucket, count: sql<number>`COUNT(*)` })
      .from(billingPayments)
      .where(
        and(
          eq(billingPayments.state, 'verified'),
          eq(billingPayments.currency, 'ZAR'),
          gte(billingPayments.reviewedAt, since),
        ),
      )
      .groupBy(paidBucket),
    db
      .select({ weeksAgo: leadBucket, count: sql<number>`COUNT(*)` })
      .from(leads)
      .where(gte(leads.createdAt, since))
      .groupBy(leadBucket),
  ]);
  return fillWeeklySeries(now, { signups, paidAccounts, enquiries });
}
