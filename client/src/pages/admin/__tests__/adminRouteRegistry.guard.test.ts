import { describe, expect, it } from 'vitest';
import {
  ADMIN_DASHBOARD_ROUTES,
  ADMIN_NAV_GROUPS,
  getAdminNavItemForPath,
} from '../adminRouteRegistry';

describe('adminRouteRegistry', () => {
  it('contains unique route paths', () => {
    const paths = ADMIN_DASHBOARD_ROUTES.map(r => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it.each([
    '/admin/approvals?tab=listings',
    '/admin/listing-approvals',
    '/admin/agent-approvals',
    '/admin/review/996112',
  ])('keeps the Approvals item active for %s', path => {
    expect(getAdminNavItemForPath(path)).toBe('/admin/approvals');
  });
  it('keeps the dedicated Developments item active', () => {
    expect(getAdminNavItemForPath('/admin/development-approvals')).toBe(
      '/admin/development-approvals',
    );
  });
  it('keeps inventory under Listings', () => {
    expect(getAdminNavItemForPath('/admin/properties')).toBe('/admin/properties');
  });
  it('includes a route for every sidebar path', () => {
    const routePaths = new Set(ADMIN_DASHBOARD_ROUTES.map(r => r.path));
    const sidebarPaths = new Set(ADMIN_NAV_GROUPS.flatMap(g => g.items.map(i => i.path)));

    for (const path of sidebarPaths) {
      expect(routePaths.has(path)).toBe(true);
    }
  });
});
