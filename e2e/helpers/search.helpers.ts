// e2e/helpers/search.helpers.ts
import { Page, expect } from '@playwright/test';

export async function searchAndSubmit(page: Page, value: string) {
  const searchInput = page.getByPlaceholder(/search/i);

  await searchInput.click();
  await searchInput.fill(value);
  await searchInput.press('Enter');
}

export async function expectPathOnly(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(`^.*${path}$`));
}

export async function expectQueryParam(page: Page, param: string, value: string) {
  const url = new URL(page.url());
  expect(url.searchParams.get(param)).toBe(value);
}
