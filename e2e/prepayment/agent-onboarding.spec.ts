import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { authorizeDatabaseOperation } from '../../server/_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context';

const runtimeLog = '/tmp/property-listify-mvp-prepayment-browser-runtime.log';
const apiOrigin = 'http://localhost:5000';

type Row = Record<string, unknown>;

let connection: AuthoritySqlConnection | undefined;

function rowsFrom(result: unknown): Row[] {
  const first = Array.isArray(result) ? result[0] : undefined;
  return Array.isArray(first) ? (first as Row[]) : [];
}

async function query(statement: string, values: readonly unknown[] = []): Promise<Row[]> {
  if (!connection) throw new Error('Pre-payment browser verification connection is not initialized.');
  return rowsFrom(await connection.execute(statement, values));
}

function latestVerificationToken(): string | null {
  try {
    const log = readFileSync(runtimeLog, 'utf8');
    const matches = [
      ...log.matchAll(/\[Email Local Dev\] Verification URL: .*?[?&]token=([a-f0-9]{64})/g),
    ];
    return matches.at(-1)?.[1] || null;
  } catch {
    return null;
  }
}

async function waitForVerificationToken(): Promise<string> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const token = latestVerificationToken();
    if (token) return token;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Timed out waiting for the local development verification link.');
}

test.describe('pre-payment agent onboarding browser acceptance', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
    const decision = authorizeDatabaseOperation(authority, { root: process.cwd() });
    connection = await createAuthoritySqlConnection(authority, decision);
  });

  test.afterAll(async () => {
    await connection?.end();
  });

  test('registers, verifies, establishes a professional presence, and enters private listing preparation', async ({
    page,
  }) => {
    const email = `browser-preparation-${randomUUID()}@invalid.example`;
    const password = `Browser!${randomUUID()}9a`;
    const displayName = 'Browser Preparation Agent';
    const bio = 'A prospective Property Listify professional preparing a private inventory workspace.';

    await page.goto('/login?mode=register');
    await page.getByRole('button', { name: 'Real Estate Agent' }).click();

    const registration = page.getByRole('dialog');
    await expect(registration.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await registration.locator('input[name="name"]').fill(displayName);
    await registration.locator('input[name="email"]').fill(email);
    await registration.locator('input[name="phoneNumber"]').fill('+27820000000');
    await registration.locator('input[name="password"]').fill(password);
    await registration.locator('input[name="confirmPassword"]').fill(password);

    const registrationResponse = page.waitForResponse(
      response =>
        response.url().includes('/api/auth/register') && response.request().method() === 'POST',
    );
    await registration.getByRole('button', { name: 'Set up Agent OS' }).click();
    expect((await registrationResponse).status()).toBe(201);
    await expect(page.getByRole('dialog', { name: 'Welcome back' })).toBeVisible();

    // The token comes from the normal local development email transport. The
    // browser follows the actual verification endpoint and receives its real
    // session cookie from that endpoint.
    const verificationToken = await waitForVerificationToken();
    await page.goto(
      `${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`,
    );
    await expect(page).toHaveURL(/\/agent\/setup\?verified=true/);
    await expect(page.getByRole('heading', { name: 'Finish your agent setup' })).toBeVisible();

    await page.locator('input[placeholder="Jane Doe"]').fill(displayName);
    await page.locator('input[placeholder="+27 82 000 0000"]').first().fill('+27820000000');
    await page.getByRole('button', { name: 'Save & Continue' }).click();

    const coverageSearch = page.getByPlaceholder('Search suburb, city, or province');
    await coverageSearch.fill('Sandton');
    const coverageChoice = page.locator('[cmdk-item]').filter({ hasText: 'Sandton' }).first();
    await expect(coverageChoice).toBeVisible();
    await coverageChoice.click();
    await expect(page.locator('button[aria-label^="Remove "]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Save & Continue' }).click();

    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await page
      .getByPlaceholder('Tell clients about your experience and what you specialize in.')
      .fill(bio);
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await page.getByRole('button', { name: 'Complete Setup' }).click();
    await expect(page).toHaveURL(/\/agent\/dashboard/);

    // This is the intentional pre-payment state: profile and private-draft
    // preparation work are available, while submission and marketplace
    // publishing remain behind commercial activation.
    await page.goto('/listings/create');
    await expect(page.getByRole('status')).toContainText('Prepare your listing before activation');
    await expect(page.getByRole('status')).toContainText(
      'Submission and marketplace publishing require completed onboarding, approval and commercial activation.',
    );
    await page.reload();
    await expect(page.getByRole('status')).toContainText('Prepare your listing before activation');

    const [persisted] = await query(
      `SELECT u.emailVerified, u.role, a.displayName, a.phone, a.bio, a.areasServed, a.agencyId
         FROM users u
         INNER JOIN agents a ON a.userId = u.id
         WHERE u.email = ?
         LIMIT 1`,
      [email],
    );
    expect(persisted).toMatchObject({
      emailVerified: 1,
      role: 'agent',
      displayName,
      phone: '+27820000000',
      bio,
      agencyId: null,
    });
    const coverage = JSON.parse(String(persisted.areasServed || '[]')) as Array<{
      canonicalLocationId?: unknown;
      label?: unknown;
    }>;
    expect(coverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalLocationId: expect.stringMatching(/^suburb:\d+$/),
          label: 'Sandton, Johannesburg, Gauteng',
        }),
      ]),
    );
  });
});
