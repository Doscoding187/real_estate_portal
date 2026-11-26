import { eq, like, lt, or, type SQL } from 'drizzle-orm';
import { auditLogs, users } from '../../drizzle/schema';

/**
 * Allow-list of user columns that may leave the server in admin responses.
 * Never spread a users row: columns such as passwordHash, password reset and email
 * verification tokens, openId, sessionVersion and founderAuthority must not reach a browser.
 */
export const SAFE_ADMIN_USER_FIELDS = [
  'id',
  'email',
  'name',
  'firstName',
  'lastName',
  'phone',
  'loginMethod',
  'emailVerified',
  'role',
  'plan',
  'trialStatus',
  'trialStartedAt',
  'trialEndsAt',
  'onboardingComplete',
  'subscriptionTier',
  'subscriptionStatus',
  'agencyId',
  'isSubaccount',
  'createdAt',
  'updatedAt',
  'lastSignedIn',
] as const;

export type SafeAdminUser = Record<(typeof SAFE_ADMIN_USER_FIELDS)[number], any>;

export function toSafeAdminUser(row: Record<string, any>): SafeAdminUser {
  const safe: Record<string, any> = {};
  for (const field of SAFE_ADMIN_USER_FIELDS) safe[field] = row[field] ?? null;
  return safe as SafeAdminUser;
}

/** WHERE conditions for admin.listUsers (kept separate so they can be tested as SQL). */
export function buildUserListConditions(input: {
  role?: string;
  agencyId?: number;
  search?: string;
}): SQL[] {
  const conditions: SQL[] = [];
  if (input.role) conditions.push(eq(users.role, input.role as (typeof users.role.enumValues)[number]));
  if (input.agencyId) conditions.push(eq(users.agencyId, input.agencyId));
  const search = input.search?.trim();
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    conditions.push(
      or(like(users.email, pattern), like(users.firstName, pattern), like(users.lastName, pattern))!,
    );
  }
  return conditions;
}

/** WHERE conditions for admin.getAuditLogs: action filter plus the primary-key cursor. */
export function buildAuditLogConditions(input: { action?: string; beforeId?: number }): SQL[] {
  const conditions: SQL[] = [];
  if (input.action) conditions.push(eq(auditLogs.action, input.action));
  if (input.beforeId) conditions.push(lt(auditLogs.id, input.beforeId));
  return conditions;
}

/** Escape LIKE wildcards so a search for "100%" or "a_b" matches literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, ch => `\\${ch}`);
}
