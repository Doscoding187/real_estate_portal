import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

describe('database governance authority', () => {
  const agentInstructions = read('AGENTS.md');
  const policy = read('docs/architecture/database-authority-policy.md');
  const exceptions = read('docs/architecture/database-compatibility-exceptions.md');

  it('requires every repository agent to use canonical database authority', () => {
    expect(agentInstructions).toContain('docs/architecture/database-authority-policy.md');
    expect(agentInstructions).toContain('docs/architecture/database-compatibility-exceptions.md');
    expect(agentInstructions).toContain('Property Listify is pre-launch');
    expect(agentInstructions).toContain('runtime schema guessing');
    expect(agentInstructions).toContain('catch-and-retry SQL');
    expect(agentInstructions).toContain('Edward has not explicitly approved');
  });

  it('defines canonical-first database engineering rules', () => {
    const requiredPolicyStatements = [
      '## Canonical authority chain',
      '## Canonical-first rule',
      '## Prohibited database patterns',
      '## Compatibility exceptions',
      '## Migration rules',
      '## Runtime and fixture rules',
      '## Stop condition',
      'Unregistered compatibility code has no architectural authority',
      'Do not make a failing test green by recreating a retired schema',
    ];

    for (const statement of requiredPolicyStatements) {
      expect(policy).toContain(statement);
    }
  });

  it('starts with no approved compatibility exceptions', () => {
    expect(exceptions).toContain('## Current approved exceptions');
    expect(exceptions).toContain('\nNone.\n');
    expect(exceptions.replace(/\s+/g, ' ')).toContain(
      'does not gain approval from historical presence',
    );
    expect(exceptions).toContain('Approved by Edward on:');
    expect(exceptions).toContain('Expiry or objective removal condition:');
    expect(exceptions).toContain(
      'An incomplete or unregistered exception has no architectural authority.',
    );
  });
  it('uses only canonical listing-owned offer counting for agent stats', () => {
    const agentRouter = read('server/agentRouter.ts');
    const start = agentRouter.indexOf('async function countAgentPendingOffers');
    const end = agentRouter.indexOf('async function listAgentShowings', start);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const offerCounter = agentRouter.slice(start, end);

    expect(offerCounter).toContain('INNER JOIN listings ON offers.listingId = listings.id');
    expect(offerCounter).toContain('WHERE listings.agentId = ${params.agentId}');
    expect(offerCounter).toContain("offers.status = ${'pending'}");

    expect(offerCounter).not.toContain('const strategies');
    expect(offerCounter).not.toContain('assigned_agent_id');
    expect(offerCounter).not.toMatch(/FROM offers\s+WHERE agentId/);
    expect(offerCounter).not.toContain('catch (error)');
  });
  it('requires the dashboard smoke fixture to use canonical offer identities', () => {
    const fixture = read('server/__tests__/agent.dashboard-showings.smoke.test.ts');
    const normalized = fixture.replace(/\s+/g, ' ');

    expect(normalized).toContain(
      "import { leads, listings, offers, showings } from '../../drizzle/schema';",
    );
    expect(fixture).toContain('createdBuyerUserId');
    expect(fixture).toContain('createdListingId');
    expect(fixture).toContain('createdOfferId');
    expect(fixture).toContain('insert(listings).values');
    expect(fixture).toContain('insert(offers).values');
    expect(fixture).toContain('listingId: createdListingId');
    expect(fixture).toContain('buyerId: createdBuyerUserId');
    expect(fixture).toContain("amount: '2150000.00'");
    expect(fixture).toContain('db.delete(offers).where(eq(offers.id, createdOfferId))');

    expect(fixture).not.toContain('createdOfferBuyerName');
    expect(fixture).not.toContain('INSERT INTO offers');
    expect(fixture).not.toContain('offerAmount,');
    expect(fixture).not.toContain('WHERE propertyId = ${createdPropertyId}');
  });
  it('fails closed on canonical platform settings, auth, and plan schemas', () => {
    const dbSource = read('server/db.ts');
    const planAccessSource = read('server/services/planAccessService.ts');

    expect(dbSource).not.toContain('PlatformSettingsColumnMode');
    expect(dbSource).not.toContain('cachedPlatformSettingsColumnMode');
    expect(dbSource).not.toContain('getPlatformSettingsColumnMode');
    expect(dbSource).not.toContain('${keyColumn}');
    expect(dbSource).not.toContain('${valueColumn}');
    expect(dbSource).toContain('\\`setting_key\\` AS settingKey');
    expect(dbSource).toContain('\\`setting_value\\` AS settingValue');
    expect(dbSource).toContain('WHERE \\`setting_key\\` = ${db.$client.escape(key)}');

    const userByIdStart = dbSource.indexOf('export async function getUserById');
    const userByIdEnd = dbSource.indexOf('/**\n * Get user by email', userByIdStart);

    expect(userByIdStart).toBeGreaterThanOrEqual(0);
    expect(userByIdEnd).toBeGreaterThan(userByIdStart);

    const userById = dbSource.slice(userByIdStart, userByIdEnd);

    expect(userById).toContain('.select(AUTH_SESSION_USER_COLUMNS)');
    expect(userById).not.toContain('AUTH_LOGIN_USER_COLUMNS');
    expect(userById).not.toContain('catch (error)');
    expect(userById).not.toContain('falling back');

    expect(planAccessSource).not.toContain('isPricingGovernanceSchemaError');
    expect(planAccessSource).not.toContain('buildBlockedProjectionForUser');
    expect(planAccessSource).not.toContain('pricing-governance mismatches');
    expect(planAccessSource).not.toContain('legacy fallback');

    const projectionStart = planAccessSource.indexOf(
      'export async function getPlanAccessProjectionForUserId',
    );
    const projectionEnd = planAccessSource.indexOf(
      'export async function setSubscriptionPlanForOwner',
      projectionStart,
    );

    expect(projectionStart).toBeGreaterThanOrEqual(0);
    expect(projectionEnd).toBeGreaterThan(projectionStart);

    const projection = planAccessSource.slice(projectionStart, projectionEnd);

    expect(projection).toContain('await ensureDefaultSubscriptionForUser(user)');
    expect(projection).toContain('await getStarterPlan(db, ownerType)');
    expect(projection).not.toContain('catch (error)');
    expect(projection).not.toContain('return buildBlockedProjectionForUser');
  });
});
