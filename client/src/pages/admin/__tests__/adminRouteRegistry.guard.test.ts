import { describe, expect, it } from 'vitest';
import {
  ADMIN_DASHBOARD_ROUTES,
  ADMIN_NAV_GROUPS,
  ADMIN_VISIBLE_NAV_GROUPS,
  getAdminNavItemForPath,
} from '../adminRouteRegistry';

describe('adminRouteRegistry', () => {
  it('mounts the development wizard inside the admin shell, keeping Publisher active', () => {
    const route = ADMIN_DASHBOARD_ROUTES.find(r => r.path === '/admin/publisher/developments/new');
    expect(route).toBeDefined();
    expect(getAdminNavItemForPath('/admin/publisher/developments/new?draftId=3')).toBe(
      '/admin/publisher',
    );
  });
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
      'Finance',
      'Publisher',
      'Developments',
      'Listings',
      'Users',
      'Agents',
      'Agencies',
      'Developers',
      'Leads',
      'Settings & Integrations',
      'System & Security',
    ]);
  });
  it('groups the sidebar as Today, Catalogue, People, System', () => {
    expect(ADMIN_VISIBLE_NAV_GROUPS.map(g => g.title)).toEqual([
      'TODAY',
      'CATALOGUE',
      'PEOPLE',
      'SYSTEM',
    ]);
  });
  it('puts count badges only on items that have a real queue', () => {
    const badged = ADMIN_VISIBLE_NAV_GROUPS.flatMap(g => g.items)
      .filter(i => i.badge)
      .map(i => [i.label, i.badge]);
    expect(badged).toEqual([
      ['Approvals', 'approvals'],
      ['Finance', 'payments'],
    ]);
  });
  it('keeps Dashboard active on the admin root and Publisher active on nested routes', () => {
    expect(getAdminNavItemForPath('/admin')).toBe('/admin/overview');
    expect(getAdminNavItemForPath('/admin/overview')).toBe('/admin/overview');
    expect(getAdminNavItemForPath('/admin/publisher/developments/new')).toBe('/admin/publisher');
    expect(getAdminNavItemForPath('/admin/publisher/anything/deep')).toBe('/admin/publisher');
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
