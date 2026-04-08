import { describe, expect, it } from 'vitest';
import { ADMIN_DASHBOARD_ROUTES, ADMIN_NAV_GROUPS } from '../adminRouteRegistry';

describe('adminRouteRegistry', () => {
  it('contains unique route paths', () => {
    const paths = ADMIN_DASHBOARD_ROUTES.map(r => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('includes a route for every sidebar path', () => {
    const routePaths = new Set(ADMIN_DASHBOARD_ROUTES.map(r => r.path));
    const sidebarPaths = new Set(ADMIN_NAV_GROUPS.flatMap(g => g.items.map(i => i.path)));

    for (const path of sidebarPaths) {
      expect(routePaths.has(path)).toBe(true);
    }
  });
});

