import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('/admin/login route', () => {
  const app = readFileSync(path.resolve(process.cwd(), 'client/src/App.tsx'), 'utf8');

  it('renders the unguarded founder sign-in page', () => {
    expect(app).toContain('<Route path="/admin/login" component={FounderLogin} />');
    expect(app).toContain('<Route path="/founder/login" component={FounderLogin} />');
  });

  it('is matched before any guarded /admin route or the admin registry map', () => {
    const login = app.indexOf('<Route path="/admin/login"');
    expect(login).toBeGreaterThan(-1);
    expect(login).toBeLessThan(app.indexOf('<Route path="/admin/review/:id">'));
    expect(login).toBeLessThan(app.indexOf('ADMIN_DASHBOARD_ROUTES.map'));
  });
});
