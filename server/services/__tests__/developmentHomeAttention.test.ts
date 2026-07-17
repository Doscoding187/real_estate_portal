import { describe, expect, it } from 'vitest';
import { buildDevelopmentHomeAttention } from '../developmentHomeAttention';
import { deriveDevelopmentHomeDistribution } from '../developmentHomeDistribution';

function inventory(overrides: Record<string, unknown> = {}) {
  return {
    totalUnits: 10,
    availableUnits: 4,
    warnings: [],
    ...overrides,
  } as Parameters<typeof buildDevelopmentHomeAttention>[0]['inventory'];
}

function attention(overrides: Partial<Parameters<typeof buildDevelopmentHomeAttention>[0]> = {}) {
  return buildDevelopmentHomeAttention({
    developmentId: 42,
    range: '30d',
    lifecycleState: 'live',
    latestReviewFeedback: null,
    blockers: [],
    inventory: inventory(),
    funnel: { slaWarningCount: 0, slaBreachCount: 0 },
    ...overrides,
  });
}

describe('Development Home attention composition', () => {
  it('returns the exact clean empty projection without informational filler', () => {
    expect(attention()).toEqual({ totalCount: 0, items: [] });
  });

  it('composes current review states and supported specialist editor destinations', () => {
    const rejected = attention({
      lifecycleState: 'rejected',
      latestReviewFeedback: 'Correct the sale pricing.',
    });
    expect(rejected.items[0]).toMatchObject({
      type: 'review_rejected',
      severity: 'critical',
      actionLabel: 'Open editor',
      href: '/developer/create-development?id=42',
    });
    expect(rejected.items[0].explanation).toContain('Correct the sale pricing.');

    expect(attention({ lifecycleState: 'changes_required' }).items[0]).toMatchObject({
      type: 'review_changes_requested',
      severity: 'critical',
    });
  });

  it('deduplicates catalogue blockers while retaining non-catalogue readiness blockers', () => {
    const result = attention({
      blockers: [
        { field: 'unitTypes.Studio.inventory', message: 'Studio has invalid aggregate inventory.' },
        { field: 'description', message: 'Description must contain at least 50 characters.' },
      ],
      inventory: inventory({
        warnings: [
          {
            code: 'invalid_aggregate_inventory',
            message: 'One or more active unit types have invalid aggregate inventory.',
          },
          {
            code: 'legacy_sale_price_compatibility',
            message: 'Sale pricing uses an older catalogue field.',
          },
        ],
      }),
    });

    expect(result.items.map(item => item.type)).toEqual([
      'readiness_blockers',
      'catalogue_invalid',
    ]);
    expect(result.items[0].explanation).toContain('Description must contain');
    expect(result.items).toHaveLength(2);
  });

  it('uses canonical selected-period SLA counts and CRM filters without lead details', () => {
    const result = attention({ funnel: { slaWarningCount: 2, slaBreachCount: 1 } });
    expect(result.items.map(item => item.type)).toEqual(['lead_sla_breach', 'lead_sla_warning']);
    expect(result.items[0]).toMatchObject({
      severity: 'critical',
      href: '/developer/leads?developmentId=42&range=30d&view=attention&sla=breach',
    });
    expect(result.items[1]).toMatchObject({
      severity: 'warning',
      href: '/developer/leads?developmentId=42&range=30d&view=attention&sla=warning',
    });
    expect(JSON.stringify(result)).not.toContain('leadName');
  });

  it('keeps zero aggregate availability separate with its exact truthful copy', () => {
    const result = attention({ inventory: inventory({ availableUnits: 0 }) });
    expect(result.items[0]).toMatchObject({
      type: 'zero_aggregate_availability',
      severity: 'warning',
      explanation: '0 aggregate units are marked available.',
    });
  });

  it('sorts deterministically and preserves critical items when more than five categories exist', () => {
    const result = attention({
      lifecycleState: 'rejected',
      blockers: [
        { field: 'description', message: 'Description must contain at least 50 characters.' },
        { field: 'unitTypes.Studio.inventory', message: 'Studio has invalid aggregate inventory.' },
      ],
      inventory: inventory({
        availableUnits: 0,
        warnings: [
          {
            code: 'invalid_aggregate_inventory',
            message: 'One or more active unit types have invalid aggregate inventory.',
          },
        ],
      }),
      funnel: { slaWarningCount: 1, slaBreachCount: 1 },
    });

    expect(result.totalCount).toBe(6);
    expect(result.items.map(item => item.type)).toEqual([
      'review_rejected',
      'lead_sla_breach',
      'readiness_blockers',
      'catalogue_invalid',
      'zero_aggregate_availability',
    ]);
  });
});

describe('Development Home distribution projection', () => {
  it('keeps not configured, disabled, and enabled states distinct', () => {
    expect(deriveDevelopmentHomeDistribution(null)).toEqual({
      status: 'not_configured',
      eligiblePartnerCount: null,
      manageHref: null,
    });
    expect(deriveDevelopmentHomeDistribution({ id: 7, isActive: 1, isReferralEnabled: 0 })).toEqual(
      { status: 'disabled', eligiblePartnerCount: null, manageHref: null },
    );
    expect(
      deriveDevelopmentHomeDistribution({ id: 7, isActive: 1, isReferralEnabled: 1 }, 3),
    ).toEqual({ status: 'enabled', eligiblePartnerCount: 3, manageHref: null });
  });

  it('does not fabricate an eligible-partner count or management destination when unavailable', () => {
    expect(deriveDevelopmentHomeDistribution({ id: 7, isActive: 1, isReferralEnabled: 1 })).toEqual(
      { status: 'enabled', eligiblePartnerCount: null, manageHref: null },
    );
  });
});
