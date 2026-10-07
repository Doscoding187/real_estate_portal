import { describe, expect, it, vi } from 'vitest';
import {
  FounderGoogleAccountService,
  validateFounderGoogleAccount,
} from '../founderGoogleAccountService';

const config = {
  ownerPrincipal: 'google:' + 'P'.repeat(43),
  founderEmail: 'founder@example.test',
  appOrigin: 'https://www.example.test',
};
const account = {
  id: 42,
  founderAuthority: 'platform_founder',
  openId: config.ownerPrincipal,
  email: config.founderEmail,
  name: 'Founder',
  passwordHash: null,
  role: 'super_admin',
  loginMethod: 'google-founder',
  emailVerified: 1,
  sessionVersion: 7,
};
describe('canonical founder account admission failures', () => {
  it.each([
    { founderAuthority: null },
    { id: 0 },
    { sessionVersion: 0 },
    { openId: 'google:' + 'Q'.repeat(43) },
    { email: 'other@example.test' },
    { role: 'agency_admin' },
    { loginMethod: 'email' },
    { emailVerified: 0 },
    { passwordHash: 'password-hash' },
    { passwordHash: undefined },
  ])('rejects a conflicting account without repair: %j', delta => {
    expect(() => validateFounderGoogleAccount({ ...account, ...delta }, config)).toThrow(
      'conflicts',
    );
  });
  it('accepts only the exact canonical founder account', () => {
    expect(validateFounderGoogleAccount(account, config)).toBe(account);
  });
  it('refuses a wrong provider principal before touching the database', async () => {
    const database = vi.fn();
    const service = new FounderGoogleAccountService(config, database);
    await expect(service.authenticate('google:' + 'Q'.repeat(43))).rejects.toMatchObject({
      status: 403,
    });
    expect(database).not.toHaveBeenCalled();
  });
  it('returns a sanitized unavailable result when the transaction cannot begin', async () => {
    const service = new FounderGoogleAccountService(
      config,
      vi.fn(async () => {
        throw new Error('private-query-credential-values');
      }),
    );
    await expect(service.authenticate(config.ownerPrincipal)).rejects.toMatchObject({
      status: 503,
      code: 'FOUNDER_GOOGLE_ACCOUNT_UNAVAILABLE',
    });
  });
  it('requires the durable binding for every founder session', async () => {
    const database = vi.fn(async () => ({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    }));
    await expect(
      new FounderGoogleAccountService(config, database).assertSessionBinding(
        account,
        config.ownerPrincipal,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it.each([
    { ...account, founderAuthority: null },
    { ...account, id: 43 },
    { ...account, openId: 'google:' + 'Q'.repeat(43) },
  ])('rejects a mismatched durable binding: %j', binding => {
    const database = vi.fn(async () => ({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [binding] }) }) }),
    }));
    return expect(
      new FounderGoogleAccountService(config, database).assertSessionBinding(
        account,
        config.ownerPrincipal,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});
