import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const authoring = readFileSync(resolve(process.cwd(), 'client/src/pages/agent/LandAuthoringWorkspace.tsx'), 'utf8');
const detail = readFileSync(resolve(process.cwd(), 'client/src/pages/LandDetail.tsx'), 'utf8');
const review = readFileSync(resolve(process.cwd(), 'client/src/pages/admin/LandReviewWorkspace.tsx'), 'utf8');

describe('Land UI boundary contracts', () => {
  it('authors Land through canonical province and city selections, not free-text geography alone', () => {
    expect(authoring).toContain('trpc.location.getLocationHierarchy.useQuery');
    expect(authoring).toContain('provinceId: Number(form.provinceId)');
    expect(authoring).toContain('cityId: Number(form.cityId)');
    expect(authoring).toContain('disabled={create.isPending || !form.provinceId || !form.cityId}');
    expect(authoring).not.toContain('identifierHash');
  });

  it('keeps public marketing media separate from private mandate evidence', () => {
    expect(authoring).toContain('trpc.listing.uploadMedia.useMutation');
    expect(authoring).toContain('trpc.land.attachMarketingMedia.useMutation');
    expect(authoring).toContain('supportingEvidenceId: mandateEvidenceId');
    expect(authoring).toContain('Private mandates, title documents and surveys never appear here.');
  });

  it('keeps seller disclosures and verification assertions inside the private review workspace', () => {
    expect(review).toContain('data.claims?.length');
    expect(review).toContain('claim.claimedValue');
    expect(authoring).toContain('replaces the current seller declaration');
    expect(review).toContain('data.assertions?.length');
    expect(detail).not.toContain('claim.claimedValue');
  });

  it('submits a Land enquiry with the established consent and stable request identity contract', () => {
    expect(detail).toContain("createLeadCaptureRequestId");
    expect(detail).toContain("publicLeadConsent('land_detail_enquiry')");
    expect(detail).toContain('captureRequestId');
    expect(detail).toContain('listingId: land.listingId');
    expect(detail).toContain('consentAccepted');
    expect(detail).toContain('land.media?.length > 0');
    expect(detail).toContain('assertion.publicConclusion');
    expect(detail).toContain('publicLeadCaptureAcknowledgement');
    expect(detail).toContain('remains verified and deliverable');
  });
});
