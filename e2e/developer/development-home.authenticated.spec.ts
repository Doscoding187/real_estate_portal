import fs from 'node:fs';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import mysql from 'mysql2/promise';

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:3009';
const DEVELOPER_EMAIL = 'developer@listify.local';
const SCREENSHOT_DIR =
  process.env.DOE_S1_BROWSER_AUDIT_DIR ||
  '/home/edwardspc/Desktop/Dev/property-listify-audits/doe-s1-slice-6-browser';

type DevelopmentFixture = {
  id: number;
  slug: string;
  name: string;
  approvalStatus: string;
};

let fixtures: DevelopmentFixture[] = [];

type AxeViewportResult = {
  viewport: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  incomplete: number;
  nonBlocking: Array<{
    ruleId: string;
    impact: string | null;
    help: string;
    nodes: Array<{ target: string[]; html: string; failureSummary: string | undefined }>;
  }>;
  incompleteFindings: Array<{
    ruleId: string;
    help: string;
    nodes: Array<{ target: string[]; html: string; failureSummary: string | undefined }>;
  }>;
};

function localDemoPassword() {
  const password = process.env.LOCAL_DEMO_AGENCY_PASSWORD;
  if (!password) throw new Error('LOCAL_DEMO_AGENCY_PASSWORD is required for authenticated browser acceptance.');
  return password;
}

async function database() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL is required for authenticated browser acceptance.');
  const url = new URL(rawUrl);
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || url.pathname !== '/listify_test') {
    throw new Error('Authenticated browser acceptance requires the disposable listify_test database.');
  }
  return mysql.createConnection(rawUrl);
}

async function loadFixtures() {
  const connection = await database();
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT d.id, d.slug, d.name, d.approval_status AS approvalStatus
       FROM developments d
       INNER JOIN developers developer_profile ON developer_profile.id = d.developer_id
       INNER JOIN users u ON u.id = developer_profile.userId
       WHERE u.email = ? AND u.role = 'property_developer'
         AND d.slug IN (?, ?, ?)
       ORDER BY d.id ASC`,
      [
        DEVELOPER_EMAIL,
        'local-demo-hillside-gardens',
        'local-demo-river-quarter',
        'local-demo-mandate-locked-estate',
      ],
    );
    fixtures = rows.map(row => ({
      id: Number(row.id),
      slug: String(row.slug),
      name: String(row.name),
      approvalStatus: String(row.approvalStatus),
    }));
  } finally {
    await connection.end();
  }

  expect(fixtures).toHaveLength(3);
  expect(fixtures.every(fixture => fixture.id > 0)).toBe(true);
}

async function signIn(page: Page, developmentId: number) {
  await page.goto(
    `/login?mode=signin&next=${encodeURIComponent(`/developer/developments/${developmentId}`)}`,
  );
  await page.getByLabel('Email address').fill(DEVELOPER_EMAIL);
  const password = page.locator('input[name="password"]');
  await password.fill(localDemoPassword());
  const loginResponse = page.waitForResponse(
    response => response.url().includes('/api/auth/login') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /^Sign in$/ }).last().click();
  await expect((await loginResponse).ok()).toBe(true);
  await password.fill('');
  await expect(page).toHaveURL(new RegExp(`/developer/developments/${developmentId}$`));
  const cookies = await page.context().cookies(FRONTEND_URL);
  expect(cookies.length, 'real login must establish a browser session').toBeGreaterThan(0);
}

async function waitForHome(page: Page, fixture: DevelopmentFixture) {
  await expect(page.getByRole('heading', { level: 1, name: fixture.name })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Requires Attention' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Market Readiness' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Aggregate Inventory' })).toBeVisible();
}

async function overflow(page: Page) {
  return page.evaluate(() => {
    const innerWidth = window.innerWidth;
    return {
      documentElementScrollWidth: document.documentElement.scrollWidth,
      documentElementClientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      innerWidth,
      offenders: [...document.querySelectorAll<HTMLElement>('body *')]
        .map(element => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName,
            text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 100) || '',
            className: typeof element.className === 'string' ? element.className : '',
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        })
        .filter(item => item.right > innerWidth + 1 || item.left < -1)
        .slice(0, 12),
    };
  });
}

async function screenshot(page: Page, name: string) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, name), fullPage: true });
}

async function visibleHeadingSequence(page: Page) {
  return page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(headings =>
    headings
      .filter(heading => {
        const style = getComputedStyle(heading);
        return style.display !== 'none' && style.visibility !== 'hidden' && heading.getClientRects().length > 0;
      })
      .map(heading => ({ level: heading.tagName.toLowerCase(), text: heading.textContent?.trim() || '' })),
  );
}

async function scanAuthenticatedHome(page: Page, viewport: number): Promise<AxeViewportResult> {
  const result = await new AxeBuilder({ page }).analyze();
  const count = (impact: 'critical' | 'serious' | 'moderate' | 'minor') =>
    result.violations
      .filter(violation => violation.impact === impact)
      .reduce((total, violation) => total + violation.nodes.length, 0);
  const summary = {
    viewport,
    critical: count('critical'),
    serious: count('serious'),
    moderate: count('moderate'),
    minor: count('minor'),
    incomplete: result.incomplete.length,
    nonBlocking: result.violations
      .filter(violation => violation.impact === 'moderate' || violation.impact === 'minor' || !violation.impact)
      .map(violation => ({
        ruleId: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.map(node => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
        })),
      })),
    incompleteFindings: result.incomplete.map(incomplete => ({
      ruleId: incomplete.id,
      help: incomplete.help,
      nodes: incomplete.nodes.map(node => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary,
      })),
    })),
  };
  expect(summary.critical, `axe critical violations at ${viewport}px: ${JSON.stringify(result.violations)}`).toBe(0);
  expect(summary.serious, `axe serious violations at ${viewport}px: ${JSON.stringify(result.violations)}`).toBe(0);
  return summary;
}

test.describe.serial('DOE-S1 authenticated Development Home acceptance', () => {
  test.beforeAll(async () => {
    expect(new URL(FRONTEND_URL).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
    await loadFixtures();
  });

  test('uses the real developer session and accepts the owned Development Home across required viewports', async ({ browser }) => {
    const attentionFixture = fixtures.find(fixture => fixture.slug === 'local-demo-hillside-gardens');
    expect(attentionFixture).toBeDefined();

    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await signIn(page, attentionFixture!.id);
    await waitForHome(page, attentionFixture!);

    const initialRangeRequests: string[] = [];
    const axeResults: AxeViewportResult[] = [];
    const headingSequences: Array<{ viewport: number; headings: Awaited<ReturnType<typeof visibleHeadingSequence>> }> = [];
    page.on('request', request => {
      if (request.url().includes('developer.getDevelopmentHome')) initialRangeRequests.push(decodeURIComponent(request.url()));
    });

    // A truthful page-level loading state: delay the existing query, then release it unchanged.
    let releaseLoading: (() => void) | undefined;
    const loadingRelease = new Promise<void>(resolve => {
      releaseLoading = resolve;
    });
    let delayed = false;
    const loadingRoute = async (route: Route) => {
      if (!delayed && route.request().url().includes('developer.getDevelopmentHome')) {
        delayed = true;
        await loadingRelease;
      }
      await route.continue();
    };
    await page.route('**/api/trpc/**', loadingRoute);
    await page.goto(`/developer/developments/${attentionFixture!.id}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('status', { name: 'Loading Development Home' })).toBeVisible();
    releaseLoading?.();
    await waitForHome(page, attentionFixture!);
    await page.unroute('**/api/trpc/**', loadingRoute);

    await page.setViewportSize({ width: 375, height: 800 });
    await waitForHome(page, attentionFixture!);
    const mobileOrder = await page.evaluate(() => {
      const top = (text: string) => {
        const element = [...document.querySelectorAll<HTMLElement>('h1,h2,h3')].find(node => node.textContent?.trim() === text);
        return element?.getBoundingClientRect().top ?? Number.NaN;
      };
      return {
        attention: top('Requires Attention'),
        readiness: top('Market Readiness'),
        demand: top('Captured demand and sales funnel'),
        inventory: top('Aggregate Inventory'),
      };
    });
    expect(mobileOrder.attention).toBeLessThan(mobileOrder.readiness);
    expect(mobileOrder.readiness).toBeLessThan(mobileOrder.demand);
    expect(mobileOrder.demand).toBeLessThan(mobileOrder.inventory);
    const mobileOverflow = await overflow(page);
    expect(
      mobileOverflow.documentElementScrollWidth,
      `mobile overflow diagnostics: ${JSON.stringify(mobileOverflow.offenders)}`,
    ).toBeLessThanOrEqual(mobileOverflow.documentElementClientWidth + 1);
    expect(mobileOverflow.bodyScrollWidth).toBeLessThanOrEqual(mobileOverflow.innerWidth + 1);
    await screenshot(page, 'authenticated-attention-375.png');
    axeResults.push(await scanAuthenticatedHome(page, 375));
    headingSequences.push({ viewport: 375, headings: await visibleHeadingSequence(page) });

    const attentionRows = page.getByLabel('Requires Attention items').locator(':scope > li');
    if ((await attentionRows.count()) > 0) {
      expect(
        await attentionRows.evaluateAll(rows =>
          rows.filter(row => getComputedStyle(row).display !== 'none').length,
        ),
      ).toBeLessThanOrEqual(3);
    }
    const recentLeadRows = page
      .getByText('Recent captured leads')
      .locator('..')
      .locator('ol > li');
    if ((await recentLeadRows.count()) > 0) {
      expect(
        await recentLeadRows.evaluateAll(rows =>
          rows.filter(row => getComputedStyle(row).display !== 'none').length,
        ),
      ).toBeLessThanOrEqual(3);
    }

    await page.setViewportSize({ width: 768, height: 1000 });
    await waitForHome(page, attentionFixture!);
    const tabletOverflow = await overflow(page);
    expect(tabletOverflow.documentElementScrollWidth).toBeLessThanOrEqual(tabletOverflow.documentElementClientWidth + 1);
    await screenshot(page, 'authenticated-attention-768.png');
    axeResults.push(await scanAuthenticatedHome(page, 768));
    headingSequences.push({ viewport: 768, headings: await visibleHeadingSequence(page) });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await waitForHome(page, attentionFixture!);
    await expect(page.getByText('Captured demand and sales funnel')).toBeVisible();
    await expect(page.getByText(/Referral distribution/)).toBeVisible();
    await screenshot(page, 'authenticated-attention-1440.png');
    axeResults.push(await scanAuthenticatedHome(page, 1440));
    headingSequences.push({ viewport: 1440, headings: await visibleHeadingSequence(page) });
    for (const sequence of headingSequences) {
      expect(sequence.headings.filter(heading => heading.level === 'h1')).toHaveLength(1);
    }

    const period7d = page.getByRole('button', { name: 'Show captured leads for the last 7 days' });
    await period7d.focus();
    await screenshot(page, 'authenticated-period-control-focus.png');
    const rangeResponse = page.waitForResponse(response => response.url().includes('developer.getDevelopmentHome'));
    await period7d.press('Space');
    await expect(period7d).toHaveAttribute('aria-pressed', 'true');
    await rangeResponse;
    await expect.poll(() => initialRangeRequests.some(url => url.includes('"range":"7d"'))).toBe(true);
    await page.getByRole('button', { name: 'Open leads' }).first().click();
    await expect(page).toHaveURL(new RegExp(`developmentId=${attentionFixture!.id}.*range=7d`));

    // Browser keyboard traversal reaches the header actions and period group without exposing hidden mobile rows.
    await page.goBack();
    await waitForHome(page, attentionFixture!);
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
    await skipLink.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    await page.keyboard.press('Home');
    const tabStops: string[] = [];
    for (let index = 0; index < 40; index += 1) {
      await page.keyboard.press('Tab');
      tabStops.push(
        await page.evaluate(() => {
          const element = document.activeElement as HTMLElement | null;
          return `${element?.tagName || ''}:${element?.getAttribute('aria-label') || element?.textContent?.trim() || ''}`;
        }),
      );
    }
    expect(tabStops.some(stop => stop.includes('Edit development'))).toBe(true);
    expect(tabStops.some(stop => stop.includes('Open leads'))).toBe(true);
    expect(tabStops.some(stop => stop.includes('Show captured leads for the last 7 days'))).toBe(true);
    await page.setViewportSize({ width: 375, height: 800 });
    for (let index = 0; index < 30; index += 1) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(() => {
          for (let ancestor: Element | null = document.activeElement; ancestor; ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
          }
          return true;
        }),
      ).toBe(true);
    }

    // Playwright is the installed browser tooling. It validates concrete accessibility failure modes without adding a package.
    const accessibility = await page.evaluate(() => {
      const duplicateIds = [...document.querySelectorAll<HTMLElement>('[id]')]
        .map(element => element.id)
        .filter((id, index, ids) => ids.indexOf(id) !== index);
      const unnamed = [...document.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea')]
        .filter(element => {
          const label = element.getAttribute('aria-label') || element.textContent?.trim();
          return !label && !element.getAttribute('aria-labelledby') && !element.getAttribute('title');
        })
        .map(element => element.tagName);
      return { duplicateIds, unnamed };
    });
    expect(accessibility.duplicateIds).toEqual([]);
    expect(accessibility.unnamed).toEqual([]);

    // Owner-scoped not-found remains private and does not redirect to a public route.
    await page.goto('/developer/developments/999999999');
    await expect(page.getByRole('heading', { name: 'Development not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to developments' })).toBeVisible();
    await expect(page).not.toHaveURL(/\/development\//);
    await screenshot(page, 'authenticated-not-found.png');

    // A single intercepted existing query proves the operational error and retry path without altering server behaviour.
    let failedRequest = false;
    const errorRoute = async (route: Route) => {
      if (!failedRequest && route.request().url().includes('developer.getDevelopmentHome')) {
        failedRequest = true;
        await route.abort('failed');
        return;
      }
      await route.continue();
    };
    await page.route('**/api/trpc/**', errorRoute);
    await page.goto(`/developer/developments/${attentionFixture!.id}`);
    await expect(page.getByRole('heading', { name: 'Unable to load Development Home' })).toBeVisible();
    await screenshot(page, 'authenticated-error-or-retry.png');
    await page.unroute('**/api/trpc/**', errorRoute);
    await page.getByRole('button', { name: 'Retry' }).click();
    await waitForHome(page, attentionFixture!);

    // Capture a clean fixture only when the canonical seed genuinely provides one.
    for (const fixture of fixtures) {
      await page.goto(`/developer/developments/${fixture.id}`);
      await waitForHome(page, fixture);
      if (await page.getByText('Nothing requires attention right now.').count()) {
        await page.setViewportSize({ width: 375, height: 800 });
        await screenshot(page, 'authenticated-clean-375.png');
        await page.setViewportSize({ width: 1440, height: 1000 });
        await screenshot(page, 'authenticated-clean-1440.png');
        break;
      }
    }

    console.log(
      `[DOE-S1 browser evidence] ${JSON.stringify({
        fixtureIds: fixtures.map(fixture => fixture.id),
        mobileOverflow,
        tabletOverflow,
        homeQueryRequestsObserved: initialRangeRequests.length,
        accessibility,
        axeResults,
        headingSequences,
      })}`,
    );
    await context.close();
  });
});
