import { describe, expect, it } from 'vitest';

import {
  classifyCommercialLocationScope,
} from '../services/commercialOfficeService';

/**
 * Commercial geography is canonical: exact slug identity or explicit
 * canonical location ids. Anything ambiguous, mixed-level, or malformed must
 * be classified invalid so the search fails closed to zero results instead of
 * widening through display-text matching.
 */
describe('commercial location scope classification', () => {
  it('treats an absent location as unscoped', () => {
    expect(classifyCommercialLocationScope({})).toEqual({ status: 'none' });
    expect(classifyCommercialLocationScope({ location: '   ' })).toEqual({ status: 'none' });
  });

  it('classifies a display-name token for exact slug resolution', () => {
    expect(classifyCommercialLocationScope({ location: ' Sandton ' })).toEqual({
      status: 'slug',
      token: 'sandton',
    });
  });

  it('accepts a set of same-level canonical location ids', () => {
    expect(
      classifyCommercialLocationScope({ locationIds: ['suburb:34', 'suburb:35'] }),
    ).toEqual({ status: 'ids', level: 'suburb', ids: [34, 35] });
  });

  it('rejects mixed-level id sets instead of silently unioning levels', () => {
    expect(
      classifyCommercialLocationScope({ locationIds: ['city:12', 'suburb:34'] }),
    ).toEqual({ status: 'invalid' });
  });

  it('rejects values that are not canonical location ids', () => {
    expect(classifyCommercialLocationScope({ locationIds: ['Sandton'] })).toEqual({
      status: 'invalid',
    });
  });

  it('rejects simultaneous canonical ids and a text token instead of choosing a precedence', () => {
    const classified = classifyCommercialLocationScope({
      location: 'Sandton',
      locationIds: ['city:12'],
    });
    expect(classified).toEqual({ status: 'invalid' });
  });
});
