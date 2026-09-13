import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('server/services/commercialOfficeService.ts', 'utf8');

describe('Commercial marketing media authority', () => {
  it('replays an already attached upload without creating a duplicate row', () => {
    const start = source.indexOf('export async function attachCommercialMarketingMedia');
    const end = source.indexOf('export type CommercialAvailabilityReconfirmationInput', start);
    const attach = source.slice(start, end);
    expect(attach).toContain('const existingUpload = existingMedia.find');
    expect(attach).toContain('item.originalUrl === media.key || item.processedUrl === media.key');
    expect(attach).toContain('return { mediaId: Number(existingUpload.id) }');
  });
});
