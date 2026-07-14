import { describe, expect, it } from 'vitest';
import { dedicatedDatabaseUrl } from '../../scripts/run-listing-performance-e2e';

const valid = {
  NODE_ENV: 'development', APP_ENV: 'development', LOCAL_DEMO_AGENCY_PASSWORD: 'local-demo-password', DATABASE_URL: 'mysql://app:password@127.0.0.1:3307/listify_local',
};

describe('Listing Performance E2E database safety', () => {
  it('uses only the exact dedicated database name', () => {
    expect(new URL(dedicatedDatabaseUrl(valid)).pathname).toBe('/listify_listing_performance_e2e');
  });
  it('rejects non-local hosts and unknown or production environments', () => {
    expect(() => dedicatedDatabaseUrl({ ...valid, DATABASE_URL: 'mysql://app:password@db.example.com:3307/listify_local' })).toThrow(/localhost/);
    expect(() => dedicatedDatabaseUrl({ ...valid, NODE_ENV: '', APP_ENV: '' })).toThrow(/explicitly/);
    expect(() => dedicatedDatabaseUrl({ ...valid, NODE_ENV: 'production', APP_ENV: 'production' })).toThrow(/explicitly/);
  });
});
