import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '../..');

function source(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('Developer Engine S3 curated catalogue contracts', () => {
  it('exposes one server-owned platform curator operating layer', () => {
    const router = source('server/superAdminPublisherRouter.ts');
    const operatingHome = source('server/services/developerOperatingHome.ts');
    const developmentService = source('server/services/developmentService.ts');

    expect(router).toContain('getOperatingHome: superAdminProcedure');
    expect(router).toContain('submitDevelopment: superAdminProcedure');
    expect(router).toContain('reviewDevelopment: superAdminProcedure');
    expect(router).toContain('unpublishDevelopment: superAdminProcedure');
    expect(router).toContain('requireActivePublisherContext');
    expect(operatingHome).toContain("mode: 'platform_curator'");
    expect(operatingHome).toContain('includePlatformCustody');
    expect(developmentService).toContain('submitPlatformCuratedDevelopment');
    expect(developmentService).toContain('reviewPlatformCuratedDevelopment');
    expect(developmentService).toContain('unpublishPlatformCuratedDevelopment');
    expect(developmentService).toContain('validatePersistedSubmissionReadiness');
  });

  it('keeps curated authority separate from organisation-owned publication', () => {
    const router = source('server/superAdminPublisherRouter.ts');
    const developmentService = source('server/services/developmentService.ts');
    const eligibility = source('server/services/publicDevelopmentEligibility.ts');

    expect(router).toContain("emulatorOnly ? 'platform_reference' : undefined");
    expect(router).toContain("eq(cataloguePublishers.authorityKind, 'platform_reference')");
    expect(router).toContain('isNull(cataloguePublishers.developerOrganisationId)');
    expect(developmentService).toContain("eq(users.role, 'super_admin')");
    expect(developmentService).toContain("eq(cataloguePublishers.isVisible, 1)");
    expect(developmentService).toContain('sourceAttribution');
    expect(eligibility).toContain("publisher?.authorityKind === 'platform_reference'");
    const platformBranchStart = eligibility.indexOf(
      "if (publisher?.authorityKind === 'platform_reference')",
    );
    const developerBranchStart = eligibility.indexOf(
      "} else if (publisher?.authorityKind === 'developer_first_party')",
      platformBranchStart,
    );
    expect(platformBranchStart).toBeGreaterThan(-1);
    expect(eligibility.slice(platformBranchStart, developerBranchStart)).not.toContain(
      'commercialAccess',
    );
  });

  it('keeps readiness, review state, and curated lead custody server-derived', () => {
    const router = source('server/superAdminPublisherRouter.ts');
    const leads = source('client/src/pages/admin/publisher/PublisherLeads.tsx');
    const developments = source('client/src/pages/admin/publisher/PublisherDevelopments.tsx');

    expect(router).toContain('getPublisherLeads: superAdminProcedure');
    expect(router).toContain('.max(200).default(50)');
    expect(router).toContain('development: row.development');
    expect(router).not.toContain('Returning empty list due to error');
    expect(leads).toContain('getPublisherLeads.useQuery');
    expect(leads).toContain('lead.development?.name');
    expect(leads).toContain("lead.deliveryStatus === 'attention_required'");
    expect(developments).toContain('getOperatingHome.useQuery');
    expect(developments).toContain('getDrafts.useQuery');
    expect(developments).toContain('unpublishDevelopment.useMutation');
    expect(developments).not.toContain('developer.deleteDevelopment');
  });

  it('routes the existing wizard through curated drafts and review submission', () => {
    const wizard = source('client/src/components/development-wizard/DevelopmentWizard.tsx');
    const finalisation = source('client/src/components/development-wizard/phases/FinalisationPhase.tsx');

    expect(wizard).toContain('superAdminPublisher.saveDraft');
    expect(wizard).toContain('superAdminPublisher.getDraft');
    expect(wizard).toContain('shouldUsePublisherApi');
    expect(finalisation).toContain('superAdminPublisher.submitDevelopment');
    expect(finalisation).toContain('remain private until an authorised reviewer approves it');
    expect(finalisation).not.toContain('publishPublisherDevelopment');
  });
});
