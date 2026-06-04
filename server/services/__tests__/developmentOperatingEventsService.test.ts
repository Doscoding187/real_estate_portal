import { describe, expect, it } from 'vitest';

import {
  getDevelopmentOperatingEventNote,
  normalizeOperatingSourceSurface,
  parseDevelopmentOperatingEventJson,
} from '../developmentOperatingEventsService';

describe('development operating events service helpers', () => {
  it('normalizes operating source surfaces to a safe dashboard default', () => {
    expect(normalizeOperatingSourceSurface('developer_dashboard')).toBe('developer_dashboard');
    expect(normalizeOperatingSourceSurface('admin_review')).toBe('admin_review');
    expect(normalizeOperatingSourceSurface('wizard')).toBe('developer_dashboard');
    expect(normalizeOperatingSourceSurface(null)).toBe('developer_dashboard');
  });

  it('parses operating event JSON from database and object values', () => {
    expect(parseDevelopmentOperatingEventJson({ note: 'Ready for reservation call' })).toEqual({
      note: 'Ready for reservation call',
    });
    expect(parseDevelopmentOperatingEventJson('{"note":"Auction pack uploaded"}')).toEqual({
      note: 'Auction pack uploaded',
    });
    expect(parseDevelopmentOperatingEventJson('[1,2,3]')).toEqual({});
    expect(parseDevelopmentOperatingEventJson('not-json')).toEqual({});
  });

  it('reads note text from metadata before afterData', () => {
    expect(
      getDevelopmentOperatingEventNote({
        metadata: { note: 'Lead handoff checked' },
        afterData: { note: 'Fallback note' },
      }),
    ).toBe('Lead handoff checked');

    expect(
      getDevelopmentOperatingEventNote({
        metadata: null,
        afterData: '{"note":"Fallback from afterData"}',
      }),
    ).toBe('Fallback from afterData');
  });
});
