import { sql } from 'drizzle-orm';

import { notifications } from '../../drizzle/schema';
import { getDb } from '../db';
import { EmailService } from '../_core/emailService';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

type NoticeWindow = {
  key: string;
  daysRemaining: number;
  label: string;
};

const NOTICE_WINDOWS: NoticeWindow[] = [
  { key: 'launch_expiry_7d', daysRemaining: 7, label: '7 days' },
  { key: 'launch_expiry_1d', daysRemaining: 1, label: '1 day' },
];

function intervalFromEnv(): number {
  const raw = Number(process.env.COMMERCIAL_TERM_NOTICE_INTERVAL_MS || '');
  return Number.isFinite(raw) && raw >= 60_000 ? raw : DEFAULT_INTERVAL_MS;
}

async function sendDueNotices(window: NoticeWindow): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  const horizon = new Date(now.getTime() + window.daysRemaining * 24 * 60 * 60 * 1000);

  void now;
  void horizon;
  const result = await db.execute(sql`
    select s.owner_id as ownerId,
           s.current_period_end as periodEnd,
           u.email as email,
           u.first_name as firstName
    from subscriptions s
    inner join users u on u.id = s.owner_id
    where s.owner_type = 'agent'
      and s.status = 'active'
      and s.current_period_end > now()
      and s.current_period_end <= date_add(now(), interval ${window.daysRemaining} day)
      and not exists (
        select 1 from notifications n
        where n.userId = s.owner_id
          and n.type = 'system_alert'
          and json_unquote(json_extract(n.data, '$.notice')) = ${window.key}
      )
  `);
  const rows = (
    Array.isArray(result) ? result : ((result as any)?.rows ?? [])
  ) as Array<{
    ownerId: number;
    periodEnd: string | null;
    email: string | null;
    firstName: string | null;
  }>;

  let sent = 0;
  for (const row of rows) {
    if (!row.ownerId) continue;
    const firstName = row.firstName || 'there';
    const periodEnd = row.periodEnd ? String(row.periodEnd).slice(0, 10) : '';

    await db.insert(notifications).values({
      userId: row.ownerId,
      type: 'system_alert',
      title: `Launch Access expires in ${window.label}`,
      content:
        'Your 90-day Launch Access term is ending. Renew before expiry to keep your listings in discovery and your enquiry pipeline open.',
      data: JSON.stringify({
        notice: window.key,
        currentPeriodEnd: periodEnd,
        actionUrl: '/agent/select-package',
      }),
      isRead: 0,
    });

    await EmailService.sendLaunchAccessExpiringEmail(
      row.email || '',
      firstName,
      window.label,
      periodEnd,
    );
    sent += 1;
  }
  return sent;
}

class CommercialTermNoticeScheduler {
  private timer: NodeJS.Timeout | null = null;

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
    let sent = 0;
    try {
      for (const window of NOTICE_WINDOWS) {
        sent += await sendDueNotices(window);
      }
    } catch (error) {
      console.error('[commercialTermNoticeScheduler] tick failed', error);
    }
    return { sent };
  }
}

export const commercialTermNoticeScheduler = new CommercialTermNoticeScheduler();
