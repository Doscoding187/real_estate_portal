import type { Page } from '@playwright/test';
import { expect, test } from '../helpers/audit-network';

const DESKTOP_NAVIGATION_BREAKPOINT = 1280;

function hasDesktopNavigation(page: Page) {
  return (page.viewportSize()?.width ?? 0) >= DESKTOP_NAVIGATION_BREAKPOINT;
}

async function expectNavLinkHref(page: Page, href: string) {
  await expect(page.locator(`nav a[href="${href}"]`).first()).toHaveCount(1);
}

test.describe('Homepage nav architecture', () => {
  test('primary navigation does not expose placeholder links', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('nav a[href="#"]')).toHaveCount(0);
  });

  test('Locations navigation stays on canonical neutral geography', async ({ page }) => {
    test.skip(!hasDesktopNavigation(page), 'Locations mega-menu is intentionally desktop-only.');
    await page.goto('/');

    await page.getByRole('button', { name: 'Locations', exact: true }).click();

    await expect(page.locator('nav a[href^="/property-for-sale/gauteng"]')).toHaveCount(0);
    await expect(page.locator('nav a[href^="/property-to-rent/gauteng"]')).toHaveCount(0);

    const cityLinks = page.locator('nav a[href^="/gauteng/"]');
    if ((await cityLinks.count()) > 0) {
      await expect(page.locator('nav a[href="/gauteng/johannesburg"]').first()).toHaveCount(1);
    }
  });

  test('For Renters navigation keeps rental journeys on engine routes', async ({ page }) => {
    test.skip(!hasDesktopNavigation(page), 'Renters mega-menu is intentionally desktop-only.');
    await page.goto('/');

    await page.getByRole('button', { name: 'For Renters', exact: true }).click();

    for (const href of [
      '/property-to-rent',
      '/guides/renting-property',
      '/shared-living',
      '/commercial',
    ]) {
      await expectNavLinkHref(page, href);
    }
  });

  test('Services navigation keeps users inside the services engine', async ({ page }) => {
    test.skip(!hasDesktopNavigation(page), 'Services mega-menu is intentionally desktop-only.');
    await page.goto('/');
    await page.getByRole('button', { name: 'Services', exact: true }).click();

    for (const href of [
      '/services',
      '/services/home-improvement',
      '/services/moving',
      '/services/inspection-compliance',
      '/services/finance-legal',
      '/services/insurance',
      '/services/media-marketing',
    ]) {
      await expectNavLinkHref(page, href);
    }
  });

  test('Professionals navigation keeps launch-visible professional journeys operational', async ({
    page,
  }) => {
    test.skip(
      !hasDesktopNavigation(page),
      'Professionals mega-menu is intentionally desktop-only.',
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'Professionals', exact: true }).click();

    for (const href of [
      '/agents',
      '/developers',
      '/services',
      '/advertise/sell/agents',
      '/advertise/sell/agencies',
      '/advertise/sell/developers',
      '/advertise/services',
    ]) {
      await expectNavLinkHref(page, href);
    }
  });

  test('insight and guide navigation keeps users inside content engines', async ({ page }) => {
    test.skip(!hasDesktopNavigation(page), 'Insights mega-menu is intentionally desktop-only.');
    await page.goto('/');
    await page.getByRole('button', { name: 'Insights', exact: true }).click();

    for (const href of [
      '/insights/property-insights',
      '/insights/market-trends',
      '/guides/buying-property',
      '/guides/selling-property',
      '/insights/blog',
    ]) {
      await expectNavLinkHref(page, href);
    }
  });

  test('Explore stays a direct engine link on desktop navigation', async ({ page }) => {
    test.skip(!hasDesktopNavigation(page), 'Desktop navigation only.');
    await page.goto('/');

    await expect(page.locator('nav a[href="/explore"]').first()).toHaveCount(1);
    await expect(page.locator('nav a[href="/new-developments"]').first()).toHaveCount(1);
    await expect(page.locator('nav a[href="/distribution-network"]').first()).toHaveCount(1);
  });

  test('narrow navigation exposes canonical platform destinations', async ({ page }) => {
    test.skip(
      hasDesktopNavigation(page),
      'Mobile drawer is intentionally replaced by desktop navigation at lg.',
    );
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Open navigation menu' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    for (const href of [
      '/property-for-sale',
      '/property-to-rent',
      '/new-developments',
      '/services',
      '/distribution-network',
      '/advertise',
      '/explore',
    ]) {
      await expect(page.locator(`a[href="${href}"]:visible`).first()).toBeVisible();
    }

    await page.getByRole('link', { name: 'Browse properties for sale', exact: true }).click();
    await expect(page).toHaveURL(/\/property-for-sale/);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Browse properties for sale', exact: true }),
    ).toHaveCount(0);
  });
});

test.describe('Canonical discovery landing pages', () => {
  test('neutral province page canonicalises to itself', async ({ page }) => {
    await page.goto('/gauteng');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/gauteng$/);
    await expect(page.getByRole('heading', { level: 1, name: /Explore Gauteng/i })).toBeVisible();
  });

  test('neutral city page canonicalises to itself', async ({ page }) => {
    await page.goto('/gauteng/johannesburg');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/gauteng\/johannesburg$/,
    );
    await expect(
      page.getByRole('heading', { level: 1, name: /Explore Johannesburg/i }),
    ).toBeVisible();
  });

  test('service topic page has canonical services URL and useful page heading', async ({
    page,
  }) => {
    await page.goto('/services/home-improvement');

    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(
      /home improvement/i,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/services\/home-improvement$/,
    );
  });

  test('thin insight page has canonical insight URL and useful page heading', async ({ page }) => {
    await page.goto('/insights/market-trends');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Market Trends/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/insights\/market-trends$/,
    );
  });

  test('static sitemap includes engine-aligned landing pages', async ({ request }) => {
    const response = await request.get('/sitemap-static.xml');
    expect(response.ok()).toBeTruthy();

    const sitemap = await response.text();
    expect(sitemap).toContain('/services/home-loans');
    expect(sitemap).toContain('/insights/market-trends');
    expect(sitemap).toContain('/guides/buying-property');
    expect(sitemap).toContain('/tools/property-valuation');
    expect(sitemap).toContain('/company/about');
  });
});
