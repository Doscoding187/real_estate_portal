import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function extractFunction(source: string, signature: string): string {
  const start = source.indexOf(signature);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = source.indexOf('\nexport ', start + 1);
  return next > start ? source.slice(start, next) : source.slice(start);
}

/**
 * Agency commercial access must have one authoritative answer: the canonical
 * subscriptions table. These structural contracts lock the convergence work
 * so competing reads and shadow-blind writes cannot silently return.
 */
describe('agency commercial access authority', () => {
  const billingSource = read('server/services/billingFoundationService.ts');
  const invitationSource = read('server/services/agencyInvitationDeliveryService.ts');
  const planAccessSource = read('server/services/planAccessService.ts');
  const agencyRouterSource = read('server/agencyRouter.ts');

  it('activates paid Launch Access through the same shadow-sync as recurring plans', () => {
    const activation = extractFunction(
      billingSource,
      'async function activateSubscriptionForPaidInvoice(',
    );

    // The Launch Access branch must delegate, then converge on the shared
    // post-activation block; it must not early-return past the shadow sync.
    expect(activation).toContain('activatePaidLaunchAccessForOwner({');
    expect(activation).not.toContain('return activatePaidLaunchAccessForOwner(');

    const syncCount = activation.split('await syncAgencyBillingShadow(').length - 1;
    expect(syncCount).toBe(1);

    const syncIndex = activation.indexOf('await syncAgencyBillingShadow(');
    const launchBranchIndex = activation.indexOf('activatePaidLaunchAccessForOwner({');
    expect(syncIndex).toBeGreaterThan(launchBranchIndex);
  });

  it('gates agency invitation delivery on canonical subscriptions, not the legacy shadow column', () => {
    expect(invitationSource).toContain("eq(subscriptions.ownerType, 'agency')");
    expect(invitationSource).toContain('ACTIVE_AGENCY_SUBSCRIPTION_STATUSES.has');
    // The retired agencies column must no longer decide delivery.
    expect(invitationSource).not.toContain('agencies.subscriptionStatus');
  });

  it('flushes queued invitations when a lifecycle override activates an agency', () => {
    const lifecycle = extractFunction(billingSource, 'export async function updateSubscriptionLifecycle(');

    expect(lifecycle).toContain("'active' || input.status === 'grace_period'");
    expect(lifecycle).toContain('deliverPendingAgencyInvitations(subscriptionLookup.ownerId)');
  });

  it('never mints entitlement from a read: default subscription resolution is lookup-only', () => {
    const ensureDefault = extractFunction(
      planAccessSource,
      'async function ensureDefaultSubscriptionForUser(',
    );

    expect(ensureDefault).not.toContain('.insert(subscriptions)');
    expect(ensureDefault).not.toContain("status: SubscriptionStatus = 'trial'");
    expect(ensureDefault).not.toContain('plan_access_service_default');

    // The projection still calls the resolver (structural governance
    // contract), but nothing else in planAccessService may insert rows.
    const projectionCallsite = planAccessSource.includes(
      'subscriptionRow = await ensureDefaultSubscriptionForUser(user);',
    );
    expect(projectionCallsite).toBe(true);
    const insertSites = planAccessSource.split('.insert(subscriptions)').length - 1;
    expect(insertSites).toBe(1); // setSubscriptionPlanForOwner only.
  });

  it('does not seed retired trial state when a super-admin creates an agency', () => {
    const createStart = agencyRouterSource.indexOf('create: superAdminProcedure.input(createAgencySchema)');
    expect(createStart).toBeGreaterThanOrEqual(0);
    const createBody = agencyRouterSource.slice(createStart, createStart + 2500);

    expect(createBody).not.toContain("subscriptionStatus: 'trial'");
    expect(createBody).toContain("subscriptionStatus: 'pending_payment'");
  });
});
