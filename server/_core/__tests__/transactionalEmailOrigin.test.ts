import { describe, expect, it } from 'vitest';
import { transactionalEmailOrigin } from '../transactionalEmailConfig';

const local = {
  NODE_ENV: 'development',
  APP_ENV: 'development',
  APP_URL: 'http://127.0.0.1:3020',
  FRONTEND_URL: 'http://127.0.0.1:3020',
} as NodeJS.ProcessEnv;

describe('transactionalEmailOrigin', () => {
  it('uses the configured web origin for links on the local preview, never localhost:3000', () => {
    expect(transactionalEmailOrigin('app', local)).toBe('http://127.0.0.1:3020');
    expect(transactionalEmailOrigin('api', local)).toBe('http://127.0.0.1:3020');
  });

  it('accepts FRONTEND_URL when APP_URL is absent', () => {
    const env = { ...local, APP_URL: '' } as NodeJS.ProcessEnv;
    expect(transactionalEmailOrigin('app', env)).toBe('http://127.0.0.1:3020');
  });

  it('prefers an explicitly configured API origin', () => {
    const env = { ...local, API_URL: 'http://127.0.0.1:5070' } as NodeJS.ProcessEnv;
    expect(transactionalEmailOrigin('api', env)).toBe('http://127.0.0.1:5070');
  });

  it('still requires a public API origin in a deployed runtime', () => {
    const env = {
      NODE_ENV: 'production',
      APP_ENV: 'production',
      APP_URL: 'https://www.example.test',
    } as NodeJS.ProcessEnv;
    expect(() => transactionalEmailOrigin('api', env)).toThrow(/public api origin/);
    expect(transactionalEmailOrigin('app', env)).toBe('https://www.example.test');
  });
});
