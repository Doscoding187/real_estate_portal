import { afterEach, describe, expect, it } from 'vitest';
import { getSessionCookieOptions } from './cookies';

const originalNodeEnv = process.env.NODE_ENV;
const originalAppEnv = process.env.APP_ENV;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalAppEnv === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = originalAppEnv;
});

describe('session cookie policy', () => {
  it('uses a secure host-only cookie in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'production';

    const options = getSessionCookieOptions({} as any);

    expect(options).toEqual({
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
    expect(options).not.toHaveProperty('domain');
  });

  it('keeps local development compatible without weakening SameSite', () => {
    process.env.NODE_ENV = 'development';
    process.env.APP_ENV = 'development';

    expect(getSessionCookieOptions({} as any)).toMatchObject({
      sameSite: 'lax',
      secure: false,
    });
  });
});
