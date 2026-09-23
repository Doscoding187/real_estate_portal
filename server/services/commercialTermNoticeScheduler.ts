import { sql } from 'drizzle-orm';

import { notifications } from '../../drizzle/schema';
import { getDb } from '../db';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

type NoticeWindow = {
  key: string;
  daysRemaining: number;
  label: string;
  expired?: boolean;
};

const NOTICE_WINDOWS: NoticeWindow[] = [
  { key: 'launch_expiry_7d', daysRemaining: 7, label: '7 days' },
  { key: 'launch_expiry_1d', daysRemaining: 1, label: '1 day' },
  { key: 'launch_expired', daysRemaining: 0, label: 'ended', expired: true },
];

function intervalFromEnv(): number {
  const raw = Number(process.env.COMMERCIAL_TERM_NOTICE_INTERVAL_MS || '');
  return Number.isFinite(raw) && raw >= 60_000 ? raw : DEFAULT_INTERVAL_MS;
}

type NoticeRow = {
  subscriptionId: number;
  ownerId: number;
  ownerType: 'agent' | 'agency' | 'developer';
  periodEnd: string | null;
  userId: number;
  email: string | null;
  firstName: string | null;
};

function rowsFromExecute(result: unknown): NoticeRow[] {
  if (Array.isArray(result)) {
    const candidate = Array.isArray(result[0]) ? result[0] : result;
    return candidate as NoticeRow[];
  }
  return ((result as any)?.rows ?? []) as NoticeRow[];
}

/**
 * Select the canonical recipient for each commercial owner. Agency and
 * Developer subscriptions are organisation-owned; joining their numeric owner
 * id directly to users could address an unrelated account or omit the actual
 * operator entirely.
 */
async function selectDueRows(window: NoticeWindow): Promise<NoticeRow[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const exactLaunchPlan = (ownerType: 'agent' | 'agency' | 'developer', planName: string) => sql`
    s.owner_type = ${ownerType}
    AND p.segment = ${ownerType}
    AND p.name = ${planName}
    AND p.isActive = 1
    AND json_unquote(json_extract(p.metadata, '$.commercial_term_kind')) = 'paid_launch_access'
    AND json_unquote(json_extract(p.metadata, '$.commercial_product_key')) = ${planName}
    AND CAST(json_unquote(json_extract(p.metadata, '$.commercial_term_duration_days')) AS UNSIGNED) = 90
    AND json_unquote(json_extract(p.metadata, '$.commercial_requires_verified_payment')) = 'true'
    AND json_unquote(json_extract(p.metadata, '$.commercial_auto_renews')) = 'false'
  `;

  const duePredicate = window.expired
    ? sql`s.status IN ('active', 'expired') AND s.current_period_end <= UTC_TIMESTAMP()`
    : sql`s.status = 'active'
       AND s.current_period_end > UTC_TIMESTAMP()
       AND s.current_period_end <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${window.daysRemaining} DAY)`;

  const result = await db.execute(sql`
    SELECT s.id AS subscriptionId,
           s.owner_id AS ownerId,
           s.owner_type AS ownerType,
           s.current_period_end AS periodEnd,
           u.id AS userId,
           u.email AS email,
           u.firstName as firstName
    FROM subscriptions s
    INNER JOIN plans p ON p.id = s.plan_id
    INNER JOIN users u ON u.id = s.owner_id
    WHERE ${exactLaunchPlan('agent', 'agent_launch_access')}
      AND ${duePredicate}
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.userId = u.id
          AND n.type = 'system_alert'
          AND json_unquote(json_extract(n.data, '$.notice')) = ${window.key}
          AND json_unquote(json_extract(n.data, '$.subscriptionId')) = CAST(s.id AS CHAR)
      )

    UNION ALL

    SELECT s.id AS subscriptionId,
           s.owner_id AS ownerId,
           s.owner_type AS ownerType,
           s.current_period_end AS periodEnd,
           u.id AS userId,
           u.email AS email,
           u.firstName as firstName
    FROM subscriptions s
    INNER JOIN plans p ON p.id = s.plan_id
    INNER JOIN users u ON u.agencyId = s.owner_id
      AND u.role = 'agency_admin'
    WHERE ${exactLaunchPlan('agency', 'agency_launch_access')}
      AND ${duePredicate}
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.userId = u.id
          AND n.type = 'system_alert'
          AND json_unquote(json_extract(n.data, '$.notice')) = ${window.key}
          AND json_unquote(json_extract(n.data, '$.subscriptionId')) = CAST(s.id AS CHAR)
      )

    UNION ALL

    SELECT s.id AS subscriptionId,
           s.owner_id AS ownerId,
           s.owner_type AS ownerType,
           s.current_period_end AS periodEnd,
           u.id AS userId,
           u.email AS email,
           u.firstName as firstName
    FROM subscriptions s
    INNER JOIN plans p ON p.id = s.plan_id
    INNER JOIN developer_organisation_memberships m
      ON m.organisation_id = s.owner_id
      AND m.role = 'owner'
      AND m.status = 'active'
    INNER JOIN users u ON u.id = m.user_id
    WHERE ${exactLaunchPlan('developer', 'developer_launch_access')}
      AND ${duePredicate}
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.userId = u.id
          AND n.type = 'system_alert'
          AND json_unquote(json_extract(n.data, '$.notice')) = ${window.key}
          AND json_unquote(json_extract(n.data, '$.subscriptionId')) = CAST(s.id AS CHAR)
      )
  `);

  return rowsFromExecute(result);
}

/**
 * Queue durable in-app notification intents only. B10 owns provider delivery;
 * no scheduler tick may send email directly or make mailbox availability a
 * prerequisite for expiry enforcement.
 */
async function queueDueNotices(window: NoticeWindow): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const rows = await selectDueRows(window);
  let queued = 0;

  for (const row of rows) {
    if (!row.userId || !row.subscriptionId) continue;
    const periodEnd = row.periodEnd ? String(row.periodEnd).slice(0, 19) : null;
    const expired = Boolean(window.expired);
    const ownerLabel =
      row.ownerType === 'agency'
        ? 'Agency'
        : row.ownerType === 'developer'
          ? 'Developer organisation'
          : 'Agent';

    await db.insert(notifications).values({
      userId: row.userId,
      type: 'system_alert',
      title: expired
        ? `${ownerLabel} Launch Access term ended`
        : `Launch Access expires in ${window.label}`,
      content: expired
        ? `${ownerLabel} Launch Access has ended. Existing inventory, identity and legitimate leads remain preserved; renew to publish and receive new paid enquiries.`
        : `${ownerLabel} Launch Access is ending in ${window.label}. Renew before expiry to keep new paid publication and enquiry intake available.`,
      data: JSON.stringify({
        notificationType: expired ? 'launch_access_expired' : 'launch_access_expiry_notice',
        notice: window.key,
        subscriptionId: row.subscriptionId,
        ownerType: row.ownerType,
        ownerId: row.ownerId,
        recipientUserId: row.userId,
        currentPeriodEnd: periodEnd,
        actionUrl:
          row.ownerType === 'agency'
            ? '/agency/billing'
            : row.ownerType === 'developer'
              ? '/developer/plans'
              : '/agent/select-package',
        providerDelivery: 'b10_notification_consumer',
      }),
      isRead: 0,
    });
    queued += 1;
  }
  return queued;
}

class CommercialTermNoticeScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private lastSucceededAt: string | null = null;
  private lastFailedAt: string | null = null;

  status() {
    return {
      timerActive: this.timer !== null,
      running: this.running,
      lastSucceededAt: this.lastSucceededAt,
      lastFailedAt: this.lastFailedAt,
      intervalMs: intervalFromEnv(),
    };
  }

  async start(): Promise<void> {
    if (this.timer) return;
    await this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalFromEnv());
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<{ sent: number }> {
    if (this.running) return { sent: 0 };
    this.running = true;
    let sent = 0;
    try {
      for (const window of NOTICE_WINDOWS) {
        sent += await queueDueNotices(window);
      }
      this.lastSucceededAt = new Date().toISOString();
      console.info('[commercialTermNoticeScheduler] tick completed', { sent, at: this.lastSucceededAt });
    } catch (error) {
      this.lastFailedAt = new Date().toISOString();
      console.error('[commercialTermNoticeScheduler] tick failed', error);
    } finally {
      this.running = false;
    }
    return { sent };
  }
}

export const commercialTermNoticeScheduler = new CommercialTermNoticeScheduler();
