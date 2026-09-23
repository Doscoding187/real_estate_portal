import { describe, expect, it } from 'vitest';

import {
  confirmDeveloperMediaUploadReceipt,
  createDeveloperMediaUploadReceipt,
  verifyDeveloperMediaUploadReceipt,
} from '../developerMediaAuthority';

const secret = 'developer-media-authority-test-secret';

function reservation(overrides: Record<string, unknown> = {}) {
  return createDeveloperMediaUploadReceipt(
    {
      key: 'properties/41/receipt-test.jpg',
      mediaType: 'image',
      contentType: 'image/jpeg',
      fileName: 'receipt-test.jpg',
      userId: 17,
      organisationId: 23,
      publisherId: 29,
      developmentId: 41,
      unitId: null,
      category: 'development_image',
      fileSize: null,
      confirmed: false,
      ...overrides,
    } as any,
    { secret, now: 1_000 },
  );
}

describe('Developer media upload receipt authority', () => {
  it('binds a confirmed receipt to uploader, organisation, publisher, development, and category', () => {
    const confirmed = confirmDeveloperMediaUploadReceipt(reservation(), 2_048, {
      secret,
      now: 1_010,
    });

    expect(
      verifyDeveloperMediaUploadReceipt(confirmed, {
        secret,
        now: 1_020,
        userId: 17,
        organisationId: 23,
        publisherId: 29,
        developmentId: 41,
        category: 'development_image',
        requireConfirmed: true,
      }),
    ).toMatchObject({ key: 'properties/41/receipt-test.jpg', fileSize: 2_048, confirmed: true });
  });

  it('rejects an unconfirmed, foreign, expired, or wrong-scope receipt', () => {
    const pending = reservation();
    expect(() =>
      verifyDeveloperMediaUploadReceipt(pending, {
        secret,
        now: 1_020,
        requireConfirmed: true,
      }),
    ).toThrow(/confirmed/i);

    const confirmed = confirmDeveloperMediaUploadReceipt(pending, 2_048, {
      secret,
      now: 1_010,
    });
    expect(() =>
      verifyDeveloperMediaUploadReceipt(confirmed, {
        secret,
        now: 1_020,
        organisationId: 24,
      }),
    ).toThrow(/another organisation/i);
    expect(() =>
      verifyDeveloperMediaUploadReceipt(confirmed, {
        secret,
        now: 1_020,
        developmentId: 42,
      }),
    ).toThrow(/different development/i);
    expect(() =>
      verifyDeveloperMediaUploadReceipt(confirmed, { secret, now: 5_000_000 }),
    ).toThrow(/expired/i);
  });

  it('rejects a receipt whose storage key or MIME type does not match its governed category', () => {
    expect(() =>
      reservation({ key: 'properties/42/receipt-test.jpg' }),
    ).toThrow(/governed scope/i);
    expect(() =>
      reservation({ contentType: 'application/pdf' }),
    ).toThrow(/image media/i);
    expect(() =>
      reservation({ category: 'unit_floorplan', mediaType: 'image' }),
    ).toThrow(/category does not match/i);
  });
});
