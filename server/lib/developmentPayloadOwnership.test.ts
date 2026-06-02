import { describe, expect, it } from 'vitest';

import {
  CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP,
  DEVELOPMENT_INVENTORY_OWNED_PAYLOAD_FIELDS,
  DEVELOPMENT_INVENTORY_OWNING_STEPS,
  isDevelopmentInventoryOwningStepId,
  PARTIAL_UPDATE_ALWAYS_ALLOWED_PAYLOAD_FIELDS,
  PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS,
} from '../../shared/developmentPayloadOwnership';

describe('development payload ownership metadata', () => {
  it('keeps partial update ownership aligned with canonical flattened field groups', () => {
    expect(PARTIAL_UPDATE_ALWAYS_ALLOWED_PAYLOAD_FIELDS).toEqual([
      ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.workflowState,
      ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.canonicalMirrors,
    ]);

    expect(PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS).toMatchObject({
      configuration: CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.configuration,
      identity_market: CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.identityMarket,
      location: CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.location,
      amenities_features: CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.amenitiesFeatures,
      marketing_summary: CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.marketingSummary,
    });
    expect(PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS.development_media).toEqual(
      CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.developmentMedia,
    );
    expect(PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS.governance_finances).toEqual([
      ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.governanceFinances,
      'estateSpecs',
    ]);
    expect(PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS.unit_types).toEqual([
      ...CANONICAL_FLATTENED_PAYLOAD_FIELD_OWNERSHIP.configuration,
      ...DEVELOPMENT_INVENTORY_OWNED_PAYLOAD_FIELDS,
    ]);
  });

  it('marks only unit inventory and final review as inventory-owning update steps', () => {
    expect(DEVELOPMENT_INVENTORY_OWNING_STEPS).toEqual(['unit_types', 'review_publish']);
    expect(isDevelopmentInventoryOwningStepId('unit_types')).toBe(true);
    expect(isDevelopmentInventoryOwningStepId('review_publish')).toBe(true);
    expect(isDevelopmentInventoryOwningStepId('development_media')).toBe(false);
    expect(isDevelopmentInventoryOwningStepId(undefined)).toBe(false);
  });

  it('keeps user-editable fields owned by a single partial update step', () => {
    const ownersByField = new Map<string, string[]>();

    for (const [stepId, fields] of Object.entries(PARTIAL_UPDATE_STEP_OWNED_PAYLOAD_FIELDS)) {
      for (const field of fields) {
        ownersByField.set(field, [...(ownersByField.get(field) ?? []), stepId]);
      }
    }

    const duplicateOwners = [...ownersByField.entries()].filter(([, owners]) => owners.length > 1);
    expect(duplicateOwners).toEqual([
      ['developmentType', ['configuration', 'unit_types']],
      ['transactionType', ['configuration', 'unit_types']],
    ]);
    expect(ownersByField.get('tagline')).toEqual(['marketing_summary']);
    expect(ownersByField.get('subtitle')).toEqual(['identity_market']);
  });
});
