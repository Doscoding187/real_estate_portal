import { expect, test } from '@playwright/test';

test.describe('Homepage nav SEO architecture', () => {
  test('primary navigation does not expose placeholder links', async ({ page }) => {
    await page.goto('/');

    const placeholderLinks = page.locator('nav a[href="#"]');
    await expect(placeholderLinks).toHaveCount(0);
  });

  test('city navigation uses canonical location SEO pages', async ({ page }) => {
    await page.goto('/');

    const johannesburgLink = page.locator('nav a[href="/property-for-sale/gauteng/johannesburg"]');
    await expect(johannesburgLink.first()).toHaveCount(1);

    const rentLinks = [
      '/property-to-rent/gauteng/johannesburg',
      '/property-to-rent/western-cape/cape-town',
      '/property-to-rent/kwazulu-natal/durban',
    ];

    for (const href of rentLinks) {
      await expect(page.locator(`nav a[href="${href}"]`).first()).toHaveCount(1);
    }
  });

  test('service nav keeps users inside the services engine', async ({ page }) => {
    await page.goto('/');

    const serviceTopicLinks = [
      '/services/home-loans',
      '/services/property-valuation',
      '/services/legal-services',
      '/services/home-insurance',
      '/services/interior-design',
    ];

    for (const href of serviceTopicLinks) {
      await expect(page.locator(`nav a[href="${href}"]`).first()).toHaveCount(1);
    }
  });

  test('insight and guide nav keeps users inside content engines', async ({ page }) => {
    await page.goto('/');

    const contentLinks = [
      '/insights/market-trends',
      '/insights/property-insights',
      '/guides/buying-property',
      '/guides/selling-property',
      '/insights/blog',
    ];

    for (const href of contentLinks) {
      await expect(page.locator(`nav a[href="${href}"]`).first()).toHaveCount(1);
    }
  });
});

test.describe('Canonical SEO landing pages', () => {
  test('city sale page has canonical path matching the property engine URL', async ({ page }) => {
    await page.goto('/property-for-sale/gauteng/johannesburg');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/property-for-sale\/gauteng\/johannesburg$/,
    );
  });

  test('city rent page has canonical path matching the rental engine URL', async ({ page }) => {
    await page.goto('/property-to-rent/gauteng/johannesburg');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/property-to-rent\/gauteng\/johannesburg$/,
    );
  });

  test('service topic page has canonical services URL and useful page heading', async ({
    page,
  }) => {
    await page.goto('/services/home-loans');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Home Loan Services/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/services\/home-loans$/,
    );
  });

  test('thin insight page has canonical insight URL and useful page heading', async ({ page }) => {
    await page.goto('/insights/market-trends');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Property Market Trends/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/insights\/market-trends$/,
    );
  });

  test('static sitemap includes new engine-aligned landing pages', async ({ request }) => {
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
