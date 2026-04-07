import { describe, expect, it } from 'vitest';

import {
  getShowingsSchemaVariant,
  isShowingsSchemaReady,
  mapAgentShowingStatusToStorage,
  mapStorageShowingStatusToAgent,
  type ShowingsSchemaDetails,
} from '../showingsSchemaCompatibility';

function createDetails(overrides: Partial<ShowingsSchemaDetails>): ShowingsSchemaDetails {
  return {
    table: true,
    listingIdColumn: false,
    propertyIdColumn: false,
    leadIdColumn: false,
    agentIdColumn: true,
    scheduledTimeColumn: false,
    scheduledAtColumn: false,
    statusColumn: true,
    notesColumn: true,
    ...overrides,
  };
}

describe('showings schema compatibility', () => {
  it('recognizes the legacy showings table shape as ready', () => {
    const details = createDetails({
      propertyIdColumn: true,
      leadIdColumn: true,
      scheduledAtColumn: true,
    });

    expect(getShowingsSchemaVariant(details)).toBe('legacy');
    expect(isShowingsSchemaReady(details)).toBe(true);
  });

  it('recognizes the current showings table shape as ready', () => {
    const details = createDetails({
      listingIdColumn: true,
      scheduledTimeColumn: true,
    });

    expect(getShowingsSchemaVariant(details)).toBe('current');
    expect(isShowingsSchemaReady(details)).toBe(true);
  });

  it('treats showings without notes support as not ready', () => {
    const details = createDetails({
      propertyIdColumn: true,
      scheduledAtColumn: true,
      notesColumn: false,
    });

    expect(getShowingsSchemaVariant(details)).toBe('missing');
    expect(isShowingsSchemaReady(details)).toBe(false);
  });

  it('maps the external scheduled status into canonical storage values', () => {
    expect(mapAgentShowingStatusToStorage('scheduled', 'legacy')).toBe('confirmed');
    expect(mapAgentShowingStatusToStorage('scheduled', 'current')).toBe('scheduled');
    expect(mapAgentShowingStatusToStorage('no_show', 'legacy')).toBe('no_show');
  });

  it('maps canonical storage values back into the existing UI contract', () => {
    expect(mapStorageShowingStatusToAgent('requested', 'legacy')).toBe('scheduled');
    expect(mapStorageShowingStatusToAgent('confirmed', 'legacy')).toBe('scheduled');
    expect(mapStorageShowingStatusToAgent('scheduled', 'current')).toBe('scheduled');
    expect(mapStorageShowingStatusToAgent('no_show', 'legacy')).toBe('no_show');
  });
});
