import { expect, test } from '@playwright/test';

import { authorizeDatabaseOperation } from '../../server/_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context';

type Row = Record<string, unknown>;

let connection: AuthoritySqlConnection | undefined;
let published:
  | { propertyId: number; title: string; suburbId: number; imageCount: number }
  | undefined;
let privateCandidate: { title: string; suburbId: number } | undefined;

function rowsFrom(result: unknown): Row[] {
  const first = Array.isArray(result) ? result[0] : undefined;
  return Array.isArray(first) ? (first as Row[]) : [];
}

async function query(statement: string, values: readonly unknown[] = []): Promise<Row[]> {
  if (!connection)
    throw new Error('PLE public-browser verification connection is not initialized.');
  return rowsFrom(await connection.execute(statement, values));
}

test.describe('PLE agency public-discovery browser acceptance', () => {
  test.beforeAll(async () => {
    const authority = resolveDatabaseAuthority({ operation: 'browser-verification' });
    const decision = authorizeDatabaseOperation(authority, { root: process.cwd() });
    connection = await createAuthoritySqlConnection(authority, decision);

    const [publishedRow] = await query(
      `SELECT listing.title AS title,
              listing.suburb_id AS suburbId,
              property.id AS propertyId,
              (SELECT COUNT(*) FROM propertyImages image WHERE image.propertyId = property.id) AS imageCount
         FROM listings listing
         INNER JOIN properties property ON property.sourceListingId = listing.id
        WHERE listing.status = 'published'
          AND listing.approvalStatus = 'approved'
          AND property.status = 'available'
          AND listing.title LIKE 'PLE agency browser listing %'
        ORDER BY property.id DESC
        LIMIT 1`,
    );
    expect(Number(publishedRow?.propertyId)).toBeGreaterThan(0);
    expect(Number(publishedRow?.suburbId)).toBeGreaterThan(0);
    expect(Number(publishedRow?.imageCount)).toBe(5);
    published = {
      propertyId: Number(publishedRow.propertyId),
      title: String(publishedRow.title),
      suburbId: Number(publishedRow.suburbId),
      imageCount: Number(publishedRow.imageCount),
    };

    const [privateRow] = await query(
      `SELECT listing.title AS title, listing.suburb_id AS suburbId
         FROM listings listing
         LEFT JOIN properties property ON property.sourceListingId = listing.id
        WHERE listing.status IN ('pending_review', 'rejected')
          AND property.id IS NULL
          AND listing.title LIKE 'PLE agency browser listing %'
        ORDER BY listing.id DESC
        LIMIT 1`,
    );
    expect(privateRow).toBeDefined();
    privateCandidate = {
      title: String(privateRow.title),
      suburbId: Number(privateRow.suburbId),
    };
  });

  test.afterAll(async () => {
    await connection?.end();
  });

  test('discovers only the approved agency inventory through canonical suburb search and detail', async ({
    page,
  }) => {
    expect(published).toBeDefined();
    expect(privateCandidate).toBeDefined();
    const publicListing = published!;
    const privateListing = privateCandidate!;

    // The public journey starts without an authenticated session and carries
    // the canonical suburb identity rather than display-text geography.
    await page.context().clearCookies();
    await page.goto(
      `/property-for-sale?locationId=${encodeURIComponent(`suburb:${publicListing.suburbId}`)}`,
    );

    const approvedCard = page.getByRole('link', { name: `View ${publicListing.title}` });
    await expect(approvedCard).toBeVisible();
    await expect(page.getByRole('link', { name: `View ${privateListing.title}` })).toHaveCount(0);
    await approvedCard.click();

    await expect(page).toHaveURL(new RegExp(`/property/${publicListing.propertyId}(?:-|$)`));
    await expect(
      page.getByRole('heading', { name: publicListing.title, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Sandton/).first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: `Open photo gallery for ${publicListing.title}` }),
    ).toBeVisible();
    await expect(page.getByText(`1 / ${publicListing.imageCount}`, { exact: true })).toBeVisible();
  });
});
