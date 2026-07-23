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
    const agencyRouterSource = read('server/agencyRouter.ts');

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

    expect(agencyRouterSource).not.toContain('function isProductionRuntime()');
    expect(agencyRouterSource).not.toContain('isPricingGovernanceSchemaError');
    expect(agencyRouterSource).not.toContain(
      'Pricing governance unavailable; returning blocked dev fallback',
    );

    const agencyAccessStart = agencyRouterSource.indexOf(
      'async function getAgencyAccessStateForUser',
    );
    const agencyRouterStart = agencyRouterSource.indexOf(
      'export const agencyRouter = router({',
      agencyAccessStart,
    );

    expect(agencyAccessStart).toBeGreaterThanOrEqual(0);
    expect(agencyRouterStart).toBeGreaterThan(agencyAccessStart);

    const agencyAccessRegion = agencyRouterSource.slice(
      agencyAccessStart,
      agencyRouterStart,
    );
    const agencyAccessReturn = agencyAccessRegion.lastIndexOf(
      '\n  return base;\n}',
    );

    expect(agencyAccessReturn).toBeGreaterThan(0);

    const agencyAccessEnd =
      agencyAccessStart +
      agencyAccessReturn +
      '\n  return base;\n}'.length;

    const agencyAccess = agencyRouterSource.slice(
      agencyAccessStart,
      agencyAccessEnd,
    );

    expect(agencyAccess).toContain('.from(subscriptions)');
    expect(agencyAccess).toContain(
      "base.planAccessSource = 'subscriptions'",
    );
    expect(agencyAccess).not.toContain('.from(agencySubscriptions)');
    expect(agencyAccess).not.toContain(
      "base.planAccessSource = 'agency_subscriptions'",
    );
    expect(agencyAccess).not.toContain(
      "base.planAccessSource = 'schema_unavailable'",
    );
    expect(agencyAccess).not.toContain('catch (error)');
  });
  it('requires agent showings request paths to use canonical database authority', () => {
    const source = read('server/agentRouter.ts');

    expect(source).not.toContain(
      "from './services/showingsSchemaCompatibility'",
    );
    expect(source).not.toContain(
      'getRuntimeSchemaCapabilities',
    );
    expect(source).not.toContain(
      'warnSchemaCapabilityOnce',
    );
    expect(source).not.toContain(
      'getShowingsSchemaVariant',
    );
    expect(source).not.toContain(
      'ShowingsSchemaDetails',
    );
    expect(source).not.toContain(
      'ShowingsSchemaVariant',
    );
    expect(source).not.toContain(
      'mapAgentShowingStatusToStorage',
    );
    expect(source).not.toContain(
      'mapStorageShowingStatusToAgent',
    );
    expect(source).not.toContain(
      'scheduledTime',
    );
    expect(source).not.toContain(
      'capabilities.showingsReady',
    );
    expect(source).not.toContain(
      'capabilities.showingsDetails',
    );
    expect(source).not.toContain(
      'Showings schema not ready',
    );
    expect(source).not.toContain(
      'Returning empty showings due to error',
    );
    expect(source).not.toContain(
      'Returning safe defaults due to error',
    );

    expect(source).toContain(
      "sql.identifier('scheduledAt')",
    );
    expect(source).toContain(
      "sql.identifier('listingId')",
    );
    expect(source).toContain(
      "sql.identifier('propertyId')",
    );
    expect(source).toContain(
      "sql.identifier('notes')",
    );
    expect(source).toContain(
      "sql.identifier('feedback')",
    );
    expect(source).toContain(
      "status: 'confirmed'",
    );
    expect(source).toContain(
      "return status === 'scheduled' ? 'confirmed' : status",
    );

    expect(() =>
      read('server/services/showingsSchemaCompatibility.ts'),
    ).toThrow();
    expect(() =>
      read('server/services/__tests__/showingsSchemaCompatibility.test.ts'),
    ).toThrow();

    const runtimeCapabilities = read(
      'server/services/runtimeSchemaCapabilities.ts',
    );

    expect(runtimeCapabilities).not.toContain(
      'showingsSchemaCompatibility',
    );
    expect(runtimeCapabilities).not.toContain(
      'showingsReady',
    );
    expect(runtimeCapabilities).not.toContain(
      'showingsDetails',
    );
    expect(runtimeCapabilities).not.toContain(
      "tableExists('showings')",
    );
    expect(runtimeCapabilities).not.toContain(
      "columnExists('showings'",
    );
    expect(runtimeCapabilities).not.toContain(
      "target === 'showings'",
    );

    const dashboardOverview = read('client/src/components/agent/AgentDashboardOverview.tsx');
    const showingsCalendar = read('client/src/components/agent/ShowingsCalendar.tsx');
    const agentProductivity = read('client/src/pages/agent/AgentProductivity.tsx');

    expect(dashboardOverview).not.toContain('scheduledTime');
    expect(source).not.toContain('agent_os_allow_legacy_scheduling_inventory');
    expect(source).not.toContain('allowLegacyFallback');
    expect(source).not.toContain('getInventoryBridgeSchemaCapabilities');
    expect(source).toContain('const canonicalPropertyId = resolvedInventory.propertyId');
    expect(source).toContain('not linked to canonical property inventory');

    const inventoryResolver = read('server/services/inventoryLinkResolver.ts');

    expect(inventoryResolver).not.toContain('information_schema');
    expect(inventoryResolver).not.toContain('getInventoryBridgeSchemaCapabilities');
    expect(inventoryResolver).not.toContain('InventoryBridgeSchemaCapabilities');
    expect(inventoryResolver).not.toContain('allowLegacyFallback');
    expect(inventoryResolver).not.toContain('legacy_listing');
    expect(inventoryResolver).not.toContain('owner_title_address');
    expect(inventoryResolver).toContain('.where(eq(properties.sourceListingId, listing.id))');
    expect(inventoryResolver).toContain("inArray(listings.status, ['approved', 'published'])");
    expect(inventoryResolver).toContain('duplicate_source_listing_id');

    const databaseSource = read('server/db.ts');

    expect(databaseSource).not.toContain('getInventoryBridgeSchemaCapabilities');
    expect(databaseSource).not.toContain('bridgeHasSourceListingId');
    expect(databaseSource).not.toContain('legacyPropertyMatch');
    expect(databaseSource).toContain('sourceListingId: listingId');

    const platformSettings = read('client/src/pages/admin/PlatformSettings.tsx');
    const inventoryBoundaryPage = read('client/src/pages/admin/AgentInventoryBoundaryPage.tsx');
    const leadPipeline = read('client/src/components/agent/LeadPipeline.tsx');

    expect(platformSettings).not.toContain('agent_os_allow_legacy_scheduling_inventory');
    expect(inventoryBoundaryPage).not.toContain('agent_os_allow_legacy_scheduling_inventory');
    expect(inventoryBoundaryPage).not.toContain('updatePlatformSetting');
    expect(inventoryBoundaryPage).toContain('Canonical Scheduling Authority');
    expect(leadPipeline).not.toContain('legacyListings');
    expect(leadPipeline).not.toContain('Legacy fallback');

    expect(() => read('scripts/preflight-agent-os-inventory-cutover.ts')).toThrow();
    expect(() => read('scripts/backfill-agent-os-inventory-bridge.ts')).toThrow();

    const packageJson = read('package.json');
    expect(packageJson).not.toContain('agent-os:inventory:preflight');

    expect(showingsCalendar).not.toContain('scheduledTime');
    expect(showingsCalendar).not.toContain('legacy_listing');
    expect(showingsCalendar).not.toContain('legacyListings');
    expect(showingsCalendar).not.toContain('Legacy fallback');
    expect(agentProductivity).not.toContain('scheduledAt || showing.scheduledAt');
    expect(agentProductivity).not.toContain('left.scheduledAt || left.scheduledAt');
    expect(agentProductivity).not.toContain('right.scheduledAt || right.scheduledAt');
  });

});
