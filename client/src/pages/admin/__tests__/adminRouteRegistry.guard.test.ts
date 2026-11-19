import { describe, expect, it } from 'vitest';
import {
  ADMIN_DASHBOARD_ROUTES,
  ADMIN_NAV_GROUPS,
  ADMIN_VISIBLE_NAV_GROUPS,
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
  it('shows exactly the launch set in the sidebar', () => {
    const labels = ADMIN_VISIBLE_NAV_GROUPS.flatMap(g => g.items.map(i => i.label));
    expect(labels).toEqual([
      'Dashboard',
      'Approvals',
      'Listings',
      'Developments',
      'Publisher',
      'Leads',
      'Agencies',
      'Agents',
      'Developers',
      'Users',
      'Finance',
      'Settings & Integrations',
      'System & Security',
    ]);
  });
  it('has no duplicate paths in the visible sidebar', () => {
    const paths = ADMIN_VISIBLE_NAV_GROUPS.flatMap(g => g.items.map(i => i.path));
    expect(new Set(paths).size).toBe(paths.length);
  });
  it('flags every other item launchHidden and keeps its route reachable', () => {
    const routePaths = new Set(ADMIN_DASHBOARD_ROUTES.map(r => r.path));
    const hidden = ADMIN_NAV_GROUPS.flatMap(g => g.items).filter(i => i.launchHidden);
    expect(hidden.map(i => i.label).sort()).toEqual(
      [
        'Revenue Center',
        'Subscriptions',
        'Featured Placements',
        'Partner Network',
        'Distribution Network',
        'Platform Analytics',
        'Discovery Ops',
        'Agent OS Readiness',
        'Inventory Boundary',
        'Content Manager',
        'Communications',
      ].sort(),
    );
    for (const item of hidden) expect(routePaths.has(item.path)).toBe(true);
  });
  it('opens Finance on the verification tab and keeps Subscriptions under it', () => {
    expect(getAdminNavItemForPath('/admin/subscriptions')).toBe('/admin/finance');
  });
  it('includes a route for every sidebar path', () => {
    const routePaths = new Set(ADMIN_DASHBOARD_ROUTES.map(r => r.path));
    const sidebarPaths = new Set(ADMIN_NAV_GROUPS.flatMap(g => g.items.map(i => i.path)));

    for (const path of sidebarPaths) {
      expect(routePaths.has(path)).toBe(true);
    }
  });
});
