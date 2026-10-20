import { expect, test as base } from '@playwright/test';

const API_SOURCE = process.env.AUDIT_API_SOURCE || 'http://localhost:5000';
const API_TARGET = process.env.AUDIT_API_TARGET;

export const test = base.extend({
  page: async ({ page, context }, use) => {
    if (API_TARGET) {
      await page.route(`${API_SOURCE}/**`, async route => {
        const request = route.request();
        try {
          const response = await context.request.fetch(
            request.url().replace(API_SOURCE, API_TARGET),
            {
              method: request.method(),
              headers: request.headers(),
              data: request.postData() ?? undefined,
              failOnStatusCode: false,
            },
          );
          await route.fulfill({
            status: response.status(),
            headers: response.headers(),
            body: await response.body(),
          });
        } catch {
          await route.abort();
        }
      });
    }
    await use(page);
  },
});

export { expect };
