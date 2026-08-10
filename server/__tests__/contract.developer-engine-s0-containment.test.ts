import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { throwAuctionPublicationDisabled } from '../services/developerEngineContainment';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('Developer Engine S0 containment contracts', () => {
  it('returns an explicit precondition failure for unsupported auction publication', () => {
    expect(() => throwAuctionPublicationDisabled()).toThrow(
      /Auction developments are not part of the supported public MVP contract/,
    );
  });

  it('removes blanket publisher mutation and routes publication through the service gate', () => {
    const publisherRouter = source('server/superAdminPublisherRouter.ts');
    const developmentService = source('server/services/developmentService.ts');

    expect(publisherRouter).not.toContain('publishAllBrandDevelopments');
    expect(publisherRouter).toContain('publishPlatformCuratedDevelopment');
    expect(publisherRouter).toContain('requireActivePublisherContext');
    expect(developmentService).toContain('validatePersistedSubmissionReadiness');
    expect(developmentService).toContain('const reviewUnitTypes = await tx');
    expect(developmentService).toContain('reviewedBy: actor.id');
    expect(developmentService).toContain("status: 'approved'");
    expect(developmentService).not.toContain('approvedAt: now');
    expect(developmentService).not.toContain('approvedBy: userId');
    expect(developmentService).not.toContain('approvedBy: reviewerId');
  });

  it('retires the arbitrary cross-brand development linking authority', () => {
    const brandProfileRouter = source('server/brandProfileRouter.ts');
    const brandProfileService = source('server/services/developerBrandProfileService.ts');
    const distributionPage = source('client/src/pages/admin/DistributionNetworkPage.tsx');

    expect(brandProfileRouter).not.toContain('adminAttachDevelopment');
    expect(brandProfileRouter).not.toContain('adminDetachDevelopment');
    expect(brandProfileService).not.toContain('attachDevelopmentToBrand');
    expect(brandProfileService).not.toContain('detachDevelopmentFromBrand');
    expect(distributionPage).not.toContain('adminAttachDevelopment');
    expect(distributionPage).not.toContain('attachDevelopmentToBrandMutation');
  });

  it('enforces publication actor authority and locks brand state', () => {
    const developmentService = source('server/services/developmentService.ts');
    const brandStart = developmentService.indexOf('const [brand] = await tx');
    const brandEnd = developmentService.indexOf('if (!brand)', brandStart);

    expect(developmentService).toContain('eq(users.id, userId)');
    expect(developmentService).toContain("eq(users.role, 'super_admin')");
    expect(developmentService).toContain('Only an authenticated super-admin can publish');
    expect(brandStart).toBeGreaterThan(-1);
    expect(developmentService.slice(brandStart, brandEnd)).toContain(".for('update')");
  });

  it('requires an explicit unclaimed platform curator context', () => {
    const contextService = source('server/services/brandContextService.ts');
    const middleware = source('server/_core/brandContext.ts');
    const trpc = source('server/_core/trpc.ts');
    const developmentService = source('server/services/developmentService.ts');

    expect(
      (contextService.match(/isNull\(developerBrandProfiles\.linkedDeveloperAccountId\)/g) || [])
        .length,
    ).toBeGreaterThanOrEqual(2);
    expect(middleware).toContain('brandContextService.verifyBrandContext');
    expect(trpc).toContain(
      'export const superAdminProcedure = protectedProcedure.use(requireSuperAdmin)',
    );
    expect(developmentService).toContain('A valid platform curator brand context is required');
    expect(developmentService).not.toContain('operatingContext?.brandProfileId || brandProfileId');
    expect(developmentService).not.toContain(
      'insertPayload.developerBrandProfileId = brandProfileId',
    );
  });

  it('retires the registered emulator/direct-write surface', () => {
    expect(existsSync(resolve(repoRoot, 'server/brandEmulatorRouter.ts'))).toBe(false);
    expect(existsSync(resolve(repoRoot, 'server/services/brandEmulatorService.ts'))).toBe(false);
    expect(existsSync(resolve(repoRoot, 'server/_core/brandEmulation.ts'))).toBe(false);
    expect(existsSync(resolve(repoRoot, 'client/src/services/identityResolutionService.ts'))).toBe(
      false,
    );
    expect(source('server/routers.ts')).not.toContain('brandEmulator');
  });

  it('retires the independent developmentUnits writer and moves KPI reads to unitTypes', () => {
    expect(existsSync(resolve(repoRoot, 'server/services/unitService.ts'))).toBe(false);
    expect(existsSync(resolve(repoRoot, 'server/services/__tests__/unitService.test.ts'))).toBe(
      false,
    );

    const kpiService = source('server/services/kpiService.ts');
    expect(kpiService).toContain('from(unitTypes)');
    expect(kpiService).not.toContain('developmentUnits');
  });

  it('blocks auction publication while retaining private authoring support', () => {
    const developmentService = source('server/services/developmentService.ts');
    const derivedListingService = source('server/services/developmentDerivedListingService.ts');
    const locationPagesService = source('server/services/locationPagesService.ts');
    const publicLeadCaptureService = source('server/services/publicLeadCaptureService.ts');
    const distributionPolicy = source('server/services/distributionAccessPolicy.ts');
    const sitemap = source('server/routes/sitemap.ts');
    const guard = source('server/services/developerEngineContainment.ts');

    expect(developmentService).toContain("existingDev.transactionType === 'auction'");
    expect(developmentService).toContain("ownedDevelopment.transactionType === 'auction'");
    expect(developmentService).toContain(
      "decision === 'approved' && development.transactionType === 'auction'",
    );
    expect(developmentService).toContain("ne(developments.transactionType, 'auction')");
    expect(derivedListingService).toContain("ne(developments.transactionType, 'auction')");
    expect(developmentService).not.toContain("neq(developments.transactionType, 'auction')");
    expect(derivedListingService).not.toContain("neq(developments.transactionType, 'auction')");
    expect(source('server/db.ts')).toContain("ne(developments.transactionType, 'auction')");
    expect(locationPagesService).toContain("ne(developments.transactionType, 'auction')");
    expect(publicLeadCaptureService).toContain("development.transactionType !== 'auction'");
    expect(distributionPolicy).toContain("development.transactionType !== 'auction'");
    expect(sitemap).toContain("ne(developments.transactionType, 'auction')");
    expect(guard).toContain(
      'Auction developments are not part of the supported public MVP contract',
    );
  });

  it('retires direct-seed modules and the strict publication path', () => {
    const localDemoSeed = source('server/scripts/localDemoSeed.ts');
    expect(localDemoSeed).toContain('LOCAL_SEED_ALLOWED=true is required');
    expect(localDemoSeed).toContain('production runtime detected');
    expect(localDemoSeed).toContain('production database name detected');
    expect(existsSync(resolve(repoRoot, 'server/emulatorRouter.ts'))).toBe(false);
    expect(existsSync(resolve(repoRoot, 'server/services/platformBrandSeedingService.ts'))).toBe(
      false,
    );
    expect(existsSync(resolve(repoRoot, 'scripts/brandEmulatorDemo.ts'))).toBe(false);
    expect(
      existsSync(resolve(repoRoot, 'client/src/components/developer/DevelopmentWizard.tsx')),
    ).toBe(false);
    expect(source('server/services/developmentService.ts')).not.toContain(
      'publishDevelopmentStrict',
    );
    const publishFlowTest = source('tests/integration/publish-flow.test.ts');
    expect(publishFlowTest).not.toContain('publishDevelopmentStrict');
    expect(publishFlowTest).toContain('saveDraft');
  });

  it('keeps the historical publication-flow test outside the authoritative server project', () => {
    const serverConfig = source('vitest.server.config.ts');
    expect(serverConfig).not.toContain("'tests/integration/publish-flow.test.ts'");
  });
});
