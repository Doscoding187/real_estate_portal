import { describe, expect, it } from 'vitest';
import { PROSPECT_JOURNEY_E2E_DATABASE, prospectJourneyDatabaseUrl } from '../../scripts/run-prospect-journey-e2e';

const baseEnv = {
  NODE_ENV: 'development',
  APP_ENV: 'development',
  DATABASE_URL: 'mysql://listify_app:secret@127.0.0.1:3307/listify_local',
  LOCAL_DEMO_AGENCY_PASSWORD: 'fixture-only',
};

describe('Prospect Journey disposable database guard', () => {
  it('pins the disposable target instead of falling back to listify_local', () => {
    expect(new URL(prospectJourneyDatabaseUrl(baseEnv)).pathname).toBe(`/${PROSPECT_JOURNEY_E2E_DATABASE}`);
  });

  it('rejects non-local, production, and incomplete targets', () => {
    expect(() => prospectJourneyDatabaseUrl({ ...baseEnv, DATABASE_URL: 'mysql://app:secret@db.example.test/listify_local' })).toThrow('host must be local');
    expect(() => prospectJourneyDatabaseUrl({ ...baseEnv, NODE_ENV: 'production' })).toThrow('production/staging target');
    expect(() => prospectJourneyDatabaseUrl({ ...baseEnv, APP_ENV: 'staging' })).toThrow('runtime must be development or test');
    expect(() => prospectJourneyDatabaseUrl({ ...baseEnv, LOCAL_DEMO_AGENCY_PASSWORD: '' })).toThrow('LOCAL_DEMO_AGENCY_PASSWORD');
  });
});
