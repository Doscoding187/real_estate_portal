import { eq, or, sql } from 'drizzle-orm';
import { users } from '../../drizzle/schema';
import { getDb } from '../db-connection';
import { FounderGoogleIdentityError } from '../_core/founderGoogleIdentity';
import {
  GOOGLE_FOUNDER_LOGIN_METHOD,
  GOOGLE_FOUNDER_PRINCIPAL_PATTERN,
  type FounderGoogleLoginConfig,
} from '../_core/founderGoogleLoginConfig';

export type FounderGoogleAccount = {
  id: number;
  openId: string;
  founderAuthority: 'platform_founder';
  email: string;
  name: string | null;
  passwordHash: null;
  role: 'super_admin';
  loginMethod: typeof GOOGLE_FOUNDER_LOGIN_METHOD;
  emailVerified: number;
  sessionVersion: number;
};
const accountColumns = {
  id: users.id,
  openId: users.openId,
  founderAuthority: users.founderAuthority,
  email: users.email,
  name: users.name,
  passwordHash: users.passwordHash,
  role: users.role,
  loginMethod: users.loginMethod,
  emailVerified: users.emailVerified,
  sessionVersion: users.sessionVersion,
};
const AUTHORITY = 'platform_founder';
const positiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
function conflict(): FounderGoogleIdentityError {
  return new FounderGoogleIdentityError(
    'FOUNDER_GOOGLE_IDENTITY_CONFLICT',
    409,
    'Founder identity conflicts with the configured account authority. Operator review is required.',
  );
}
function unavailable(): FounderGoogleIdentityError {
  return new FounderGoogleIdentityError(
    'FOUNDER_GOOGLE_ACCOUNT_UNAVAILABLE',
    503,
    'Founder sign-in could not complete. Start again later.',
  );
}

export function validateFounderGoogleAccount(
  user: unknown,
  config: FounderGoogleLoginConfig,
): FounderGoogleAccount {
  const row = user as FounderGoogleAccount | null;
  if (
    !row ||
    !positiveInteger(row.id) ||
    !positiveInteger(row.sessionVersion) ||
    row.founderAuthority !== AUTHORITY ||
    row.openId !== config.ownerPrincipal ||
    row.email !== config.founderEmail ||
    row.role !== 'super_admin' ||
    row.loginMethod !== GOOGLE_FOUNDER_LOGIN_METHOD ||
    row.emailVerified !== 1 ||
    row.passwordHash !== null
  )
    throw conflict();
  return row;
}

/** Uses only the canonical runtime pool; no alternate connections, linking or role repair. */
export class FounderGoogleAccountService {
  constructor(
    readonly config: FounderGoogleLoginConfig,
    private readonly database: typeof getDb = getDb,
  ) {
    if (!GOOGLE_FOUNDER_PRINCIPAL_PATTERN.test(config.ownerPrincipal)) throw conflict();
  }

  async authenticate(verifiedPrincipal: string): Promise<FounderGoogleAccount> {
    // This input comes only from completed provider proof, never a request parameter.
    if (verifiedPrincipal !== this.config.ownerPrincipal) {
      throw new FounderGoogleIdentityError(
        'FOUNDER_GOOGLE_OWNER_MISMATCH',
        403,
        'This Google identity is not the approved founder.',
      );
    }
    try {
      const database = await this.database();
      return await database.transaction(async (tx: any) => {
        const bindings = await tx
          .select(accountColumns)
          .from(users)
          .where(eq(users.founderAuthority, AUTHORITY))
          .limit(2)
          .for('update');
        if (bindings.length > 1) throw conflict();
        const binding = bindings[0];
        if (binding) validateFounderGoogleAccount(binding, this.config);
        const identityConditions = [
          eq(users.openId, this.config.ownerPrincipal),
          sql`LOWER(TRIM(${users.email})) = ${this.config.founderEmail}`,
        ];
        if (binding) identityConditions.push(eq(users.id, binding.id));
        else identityConditions.push(eq(users.role, 'super_admin'));
        const existing = await tx
          .select(accountColumns)
          .from(users)
          .where(or(...identityConditions))
          .limit(2);
        if (binding) {
          if (existing.length !== 1 || existing[0].id !== binding.id) throw conflict();
          return validateFounderGoogleAccount(existing[0], this.config);
        }
        if (existing.length !== 0) throw conflict();

        const [result] = await tx.insert(users).values({
          openId: this.config.ownerPrincipal,
          email: this.config.founderEmail,
          founderAuthority: AUTHORITY,
          name: 'Founder',
          passwordHash: null,
          emailVerified: 1,
          role: 'super_admin',
          loginMethod: GOOGLE_FOUNDER_LOGIN_METHOD,
          sessionVersion: 1,
          onboardingComplete: 1,
          onboardingStep: 0,
        });
        const id = Number(result.insertId);
        if (!positiveInteger(id)) throw unavailable();
        // The unique nullable authority, not a gap lock or Redis lease, serializes first creation.
        // A competing insert/deadlock rolls back the same transaction; there is no second binding write.
        const created = await tx
          .select(accountColumns)
          .from(users)
          .where(eq(users.id, id))
          .limit(2);
        if (created.length !== 1) throw conflict();
        return validateFounderGoogleAccount(created[0], this.config);
      });
    } catch (error) {
      if (error instanceof FounderGoogleIdentityError) throw error;
      // No catch-and-retry SQL, partial success or error details containing query values.
      throw unavailable();
    }
  }

  async assertSessionBinding(user: unknown, principal: string): Promise<void> {
    if (principal !== this.config.ownerPrincipal) throw conflict();
    const account = validateFounderGoogleAccount(user, this.config);
    try {
      const database = await this.database();
      const bindings = await database
        .select(accountColumns)
        .from(users)
        .where(eq(users.founderAuthority, AUTHORITY))
        .limit(2);
      if (bindings.length !== 1) throw conflict();
      const current = validateFounderGoogleAccount(bindings[0], this.config);
      if (current.id !== account.id || current.sessionVersion !== account.sessionVersion)
        throw conflict();
    } catch (error) {
      if (error instanceof FounderGoogleIdentityError) throw error;
      throw unavailable();
    }
  }
}
