import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const authoring = readFileSync(resolve(process.cwd(), 'client/src/pages/agent/LandAuthoringWorkspace.tsx'), 'utf8');
const detail = readFileSync(resolve(process.cwd(), 'client/src/pages/LandDetail.tsx'), 'utf8');

describe('Land UI boundary contracts', () => {
  it('authors Land through canonical province and city selections, not free-text geography alone', () => {
    expect(authoring).toContain('trpc.location.getLocationHierarchy.useQuery');
    expect(authoring).toContain('provinceId: Number(form.provinceId)');
    expect(authoring).toContain('cityId: Number(form.cityId)');
    expect(authoring).toContain('disabled={create.isPending || !form.provinceId || !form.cityId}');
  });

  it('submits a Land enquiry with the established consent and stable request identity contract', () => {
    expect(detail).toContain("createLeadCaptureRequestId");
    expect(detail).toContain("publicLeadConsent('land_detail_enquiry')");
    expect(detail).toContain('captureRequestId');
    expect(detail).toContain('listingId: land.listingId');
    expect(detail).toContain('consentAccepted');
  });
});
