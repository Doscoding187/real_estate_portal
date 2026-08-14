import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

import { and, count, eq } from 'drizzle-orm';
import { config } from 'dotenv';

import {
  authorizeDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
} from '../server/_core/databaseAuthority/authorization';
import { createAuthoritySqlConnection } from '../server/_core/databaseAuthority/connectionAuthority';
import { databaseAuthorityChildEnvironment } from '../server/_core/databaseAuthority/context';
import { requireExactAdapterTarget } from '../server/_core/databaseAuthority/dataAdapters/common';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the Slice 1 verification harness.`);
  return value;
}

const EXPECTED_DATABASE = requiredEnvironment('SLICE1_VERIFY_DATABASE');
const EXPECTED_FINGERPRINT = requiredEnvironment('SLICE1_VERIFY_FINGERPRINT');
const CENSUS_ONLY = process.env.SLICE1_VERIFY_CENSUS_ONLY === '1';
const ATTEMPT_DIAGNOSTICS_ONLY = process.env.SLICE1_VERIFY_ATTEMPT_DIAGNOSTICS_ONLY === '1';
const READ_ONLY = CENSUS_ONLY || ATTEMPT_DIAGNOSTICS_ONLY;
const localEnvironment =
  config({
    path:
      process.env.PROPERTY_LISTIFY_LOCAL_ENV_PATH ||
      resolve(homedir(), '.config/property-listify/local.env'),
    override: false,
  }).parsed ?? {};
// Never let the clean-main URL from central local configuration override the
// exact worktree profile resolved by Database Authority below.
delete process.env.DATABASE_URL;
delete process.env.LISTIFY_E2E_DATABASE_URL;
const BROWSER_PASSWORD = READ_ONLY
  ? ''
  : process.env.SLICE1_VERIFY_BROWSER_PASSWORD?.trim() ||
    localEnvironment.LOCAL_DEMO_AGENCY_PASSWORD?.trim() ||
    requiredEnvironment('SLICE1_VERIFY_BROWSER_PASSWORD');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function mysqlNow(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function errorCode(error: unknown): string {
  const value = error as any;
  return String(value?.code ?? value?.data?.code ?? value?.shape?.data?.code ?? 'UNKNOWN');
}

async function expectRejected(label: string, operation: () => Promise<unknown>): Promise<string> {
  try {
    await operation();
  } catch (error) {
    return errorCode(error);
  }
  throw new Error(`${label} unexpectedly succeeded.`);
}

async function main(): Promise<void> {
  const authority = resolveDatabaseAuthority({
    operation: READ_ONLY ? 'read-only-connect' : 'test-fixture',
    credentialClass: 'local-owner',
  });
  assert(
    authority.context.databaseName === EXPECTED_DATABASE,
    `Refusing verification against unexpected database ${authority.context.databaseName}.`,
  );
  assert(
    authority.context.targetFingerprintHash === EXPECTED_FINGERPRINT,
    'Refusing verification because the disposable database fingerprint does not match Slice 1.',
  );

  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority),
  });
  const ownership = requireExactAdapterTarget(authority);
  const connection = await createAuthoritySqlConnection(authority, decision);

  if (ATTEMPT_DIAGNOSTICS_ONLY) {
    const [attemptRows] = (await connection.query(
      `SELECT attempt_id, migration_filename, state, completed_statement_count,
              failure_class, failure_digest, started_at, finished_at
         FROM sql_migration_attempts
        WHERE state IN ('running', 'failed', 'blocked')
        ORDER BY started_at, attempt_id`,
    )) as [unknown[], unknown];
    const [reviewRows] = (await connection.query(
      `SELECT attempt_id, migration_filename, state, completed_statement_count,
              failure_class, failure_digest, application_artifact, started_at, finished_at
         FROM sql_migration_attempts
        WHERE migration_filename = '0019_catalogue_publisher_authority_immutability.sql'
        ORDER BY started_at, attempt_id`,
    )) as [unknown[], unknown];
    console.log(
      JSON.stringify(
        {
          adapter: 'developer-engine-s1-attempt-diagnostics',
          target: {
            database: authority.context.databaseName,
            fingerprint: authority.context.targetFingerprintHash,
            ownershipKey: ownership.ownershipKey,
          },
          incompleteAttempts: attemptRows,
          reviewedReplacementEvidence: reviewRows,
        },
        null,
        2,
      ),
    );
    await connection.end();
    return;
  }

  Object.assign(process.env, {
    ...databaseAuthorityChildEnvironment(authority),
    REDIS_URL: '',
    RESEND_API_KEY: '',
    RESEND_FROM_EMAIL: '',
    EMAIL_FROM: '',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    WHATSAPP_ACCESS_TOKEN: '',
    WHATSAPP_PHONE_NUMBER_ID: '',
  });

  const { resetDb } = await import('../server/db-connection');
  resetDb();

  const [
    { getDb },
    { authService },
    schema,
    { developerIdentityService },
    { cataloguePublisherService },
    { publicSearchService },
    { capturePublicLead },
    { developmentService },
    { developmentSupersessionService },
    { getPlanByName, getPlanAccessProjectionForUserId },
    { developerSubscriptionService },
    { appRouter },
  ] = await Promise.all([
    import('../server/db-connection'),
    import('../server/_core/auth'),
    import('../drizzle/schema'),
    import('../server/services/developerIdentityService'),
    import('../server/services/cataloguePublisherService'),
    import('../server/services/publicSearchService'),
    import('../server/services/publicLeadCaptureService'),
    import('../server/services/developmentService'),
    import('../server/services/developmentSupersessionService'),
    import('../server/services/planAccessService'),
    import('../server/services/developerSubscriptionService'),
    import('../server/routers'),
  ]);

  const database = await getDb();
  assert(database, 'Runtime database connection could not be established.');

  if (CENSUS_ONLY) {
    const tableCounts = Object.fromEntries(
      await Promise.all(
        [
          ['legacyDevelopers', schema.developers],
          ['legacyDeveloperBrandProfiles', schema.developerBrandProfiles],
          ['developerOrganisations', schema.developerOrganisations],
          ['organisationMemberships', schema.developerOrganisationMemberships],
          ['cataloguePublishers', schema.cataloguePublishers],
          ['developments', schema.developments],
          ['developmentDrafts', schema.developmentDrafts],
          ['leads', schema.leads],
          ['developmentSupersessions', schema.developmentSupersessions],
        ].map(async ([label, table]) => {
          const [row] = await database.select({ count: count() }).from(table as any);
          return [label as string, Number(row.count)];
        }),
      ),
    );
    const publisherAuthorityCounts = await database
      .select({ authorityKind: schema.cataloguePublishers.authorityKind, count: count() })
      .from(schema.cataloguePublishers)
      .groupBy(schema.cataloguePublishers.authorityKind);
    console.log(
      JSON.stringify(
        {
          adapter: 'developer-engine-s1-read-only-census',
          target: {
            database: authority.context.databaseName,
            fingerprint: authority.context.targetFingerprintHash,
            ownershipKey: ownership.ownershipKey,
          },
          tableCounts,
          publisherAuthorityCounts: Object.fromEntries(
            publisherAuthorityCounts.map(row => [row.authorityKind, Number(row.count)]),
          ),
        },
        null,
        2,
      ),
    );
    await connection.end();
    resetDb();
    return;
  }

  type UserRole = 'property_developer' | 'super_admin';
  async function insertUser(slug: string, role: UserRole, withPassword = false): Promise<number> {
    const email = `s1-${slug}-${Date.now()}@invalid.example`;
    const passwordHash = withPassword ? await authService.hashPassword(BROWSER_PASSWORD) : null;
    const [result] = await database.insert(schema.users).values({
      email,
      passwordHash,
      name: `Slice 1 ${slug}`,
      firstName: 'Slice',
      lastName: slug,
      loginMethod: 'email',
      emailVerified: 1,
      role,
    } as any);
    return Number(result.insertId);
  }

  async function userRow(userId: number): Promise<any> {
    const [user] = await database.select().from(schema.users).where(eq(schema.users.id, userId));
    assert(user, `Fixture user ${userId} was not persisted.`);
    return user;
  }

  async function approveIdentity(identity: any): Promise<any> {
    const now = mysqlNow();
    await database
      .update(schema.developerOrganisations)
      .set({
        status: 'approved',
        isVerified: 1,
        approvedBy: adminUserId,
        approvedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.developerOrganisations.id, identity.organisationId));
    await database
      .update(schema.cataloguePublishers)
      .set({ isVisible: 1, isContactVerified: 1, updatedAt: now })
      .where(eq(schema.cataloguePublishers.id, identity.publisherId));
    return developerIdentityService.requireDeveloperIdentityByUserId(identity.userId);
  }

  async function insertDevelopment(input: {
    publisherId: number;
    ownerType: 'platform' | 'developer';
    name: string;
    slug: string;
    published: boolean;
  }): Promise<{ id: number; unitId: string; slug: string }> {
    const [result] = await database.insert(schema.developments).values({
      name: input.name,
      description:
        'A deterministic Slice 1 verification development with enough persisted catalogue detail for public publication.',
      developmentType: 'residential',
      address: '1 Slice 1 Verification Street',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Sandton',
      totalUnits: 12,
      availableUnits: 12,
      priceFrom: 1800000,
      priceTo: 2400000,
      images: JSON.stringify([{ url: 'https://example.com/slice-1-verification.jpg' }]),
      highlights: ['Secure access', 'Transit nearby', 'Energy efficient'],
      slug: input.slug,
      isPublished: input.published ? 1 : 0,
      publishedAt: input.published ? mysqlNow() : null,
      approvalStatus: 'approved',
      readinessScore: 100,
      devOwnerType: input.ownerType,
      nature: 'new',
      status: 'selling',
      transactionType: 'for_sale',
      ownershipType: 'sectional-title',
      structuralType: 'apartment',
      propertyTypes: ['apartment'],
      cataloguePublisherId: input.publisherId,
    } as any);
    const id = Number(result.insertId);
    const unitId = randomUUID();
    await database.insert(schema.unitTypes).values({
      id: unitId,
      developmentId: id,
      name: `${input.name} Unit Type`,
      bedrooms: 2,
      bathrooms: '1.5',
      unitSize: 72,
      basePriceFrom: '1800000.00',
      basePriceTo: '2400000.00',
      priceFrom: '1800000.00',
      priceTo: '2400000.00',
      totalUnits: 12,
      availableUnits: 12,
      reservedUnits: 0,
      isActive: 1,
      structuralType: 'apartment',
      displayOrder: 1,
    } as any);
    return { id, unitId, slug: input.slug };
  }

  async function insertApprovedReview(developmentId: number, submittedBy: number): Promise<void> {
    const now = mysqlNow();
    await database.insert(schema.developmentApprovalQueue).values({
      developmentId,
      submittedBy,
      status: 'approved',
      submissionType: 'initial',
      reviewNotes: null,
      rejectionReason: null,
      submittedAt: now,
      reviewedAt: now,
      reviewedBy: adminUserId,
      complianceChecks: { persisted: true, authority: 'slice-1-verification' },
    } as any);
  }

  const adminUserId = await insertUser('platform-admin', 'super_admin');
  const onboardingUserId = await insertUser('onboarding-owner', 'property_developer');
  const developerBUserId = await insertUser('developer-b-owner', 'property_developer');
  const browserUserId = await insertUser('browser-onboarding', 'property_developer', true);

  // Concurrent onboarding requests must converge on one organisation,
  // membership, and first-party publisher for the authenticated principal.
  const [onboardingOne, onboardingTwo] = await Promise.all([
    developerIdentityService.createDeveloperOrganisation({
      name: 'Slice 1 Verification Developer A',
      city: 'Johannesburg',
      province: 'Gauteng',
      email: 'slice-1-a@invalid.example',
      createdByUserId: onboardingUserId,
    }),
    developerIdentityService.createDeveloperOrganisation({
      name: 'Slice 1 Verification Developer A Concurrent',
      city: 'Johannesburg',
      province: 'Gauteng',
      email: 'slice-1-a-concurrent@invalid.example',
      createdByUserId: onboardingUserId,
    }),
  ]);
  assert(
    onboardingOne.organisationId === onboardingTwo.organisationId &&
      onboardingOne.publisherId === onboardingTwo.publisherId,
    'Concurrent onboarding did not converge on one identity tuple.',
  );
  const [onboardingCounts] = await database
    .select({
      organisations: count(schema.developerOrganisations.id),
      memberships: count(schema.developerOrganisationMemberships.id),
      publishers: count(schema.cataloguePublishers.id),
    })
    .from(schema.developerOrganisations)
    .leftJoin(
      schema.developerOrganisationMemberships,
      eq(schema.developerOrganisationMemberships.organisationId, schema.developerOrganisations.id),
    )
    .leftJoin(
      schema.cataloguePublishers,
      eq(schema.cataloguePublishers.developerOrganisationId, schema.developerOrganisations.id),
    )
    .where(eq(schema.developerOrganisationMemberships.userId, onboardingUserId));
  assert(
    Number(onboardingCounts.organisations) === 1,
    'Onboarding created multiple organisations.',
  );
  assert(Number(onboardingCounts.memberships) === 1, 'Onboarding created multiple memberships.');
  assert(Number(onboardingCounts.publishers) === 1, 'Onboarding created multiple publishers.');

  const beforeInvalidOnboarding = await database
    .select({ count: count() })
    .from(schema.developerOrganisations);
  const invalidOnboardingCode = await expectRejected('invalid-user onboarding', () =>
    developerIdentityService.createDeveloperOrganisation({
      name: 'Should Not Persist',
      city: 'Johannesburg',
      province: 'Gauteng',
      email: 'invalid-onboarding@invalid.example',
      createdByUserId: 987654321,
    }),
  );
  const afterInvalidOnboarding = await database
    .select({ count: count() })
    .from(schema.developerOrganisations);
  assert(
    Number(beforeInvalidOnboarding[0].count) === Number(afterInvalidOnboarding[0].count),
    'Failed onboarding changed organisation row count.',
  );

  const identityA = await approveIdentity(onboardingOne);
  const identityB = await approveIdentity(
    await developerIdentityService.createDeveloperOrganisation({
      name: 'Slice 1 Verification Developer B',
      city: 'Pretoria',
      province: 'Gauteng',
      email: 'slice-1-b@invalid.example',
      createdByUserId: developerBUserId,
    }),
  );

  const curatedPublisherName = 'Slice 1 Verification Curated Publisher';
  const platformPublisher = await cataloguePublisherService.createPlatformReferencePublisher({
    brandName: curatedPublisherName,
    slug: `slice-1-curated-publisher-${Date.now()}`,
    sourceAttribution: 'slice-1-local-verification-fixture',
    headOfficeLocation: 'Johannesburg, Gauteng',
    isVisible: true,
    createdBy: adminUserId,
  });
  const platformPublisherId = Number(platformPublisher.id);

  const invalidPlatformShapeCode = await expectRejected(
    'platform publisher attached to organisation',
    () =>
      database.insert(schema.cataloguePublishers).values({
        authorityKind: 'platform_reference',
        publisherType: 'developer',
        developerOrganisationId: identityA.organisationId,
        name: 'Invalid Platform Shape',
        slug: `invalid-platform-shape-${Date.now()}`,
        sourceAttribution: 'slice-1-invalid-shape',
      } as any),
  );
  const invalidFirstPartyShapeCode = await expectRejected(
    'first-party publisher without organisation',
    () =>
      database.insert(schema.cataloguePublishers).values({
        authorityKind: 'developer_first_party',
        publisherType: 'developer',
        developerOrganisationId: null,
        name: 'Invalid First Party Shape',
        slug: `invalid-first-party-shape-${Date.now()}`,
      } as any),
  );
  const duplicatePublisherSlugCode = await expectRejected('duplicate publisher slug', () =>
    cataloguePublisherService.createPlatformReferencePublisher({
      brandName: 'Duplicate Curated Publisher',
      slug: platformPublisher.slug,
      sourceAttribution: 'slice-1-duplicate-slug',
      createdBy: adminUserId,
    }),
  );
  const directIdentityServiceConversionCode = await expectRejected(
    'identity-service publisher authority conversion',
    () =>
      developerIdentityService.updateCataloguePublisher(platformPublisherId, {
        authorityKind: 'developer_first_party',
        developerOrganisationId: identityA.organisationId,
      } as any),
  );
  const platformToFirstPartyConversionCode = await expectRejected(
    'platform-reference to first-party conversion',
    () =>
      cataloguePublisherService.updatePublisher(platformPublisherId, {
        authorityKind: 'developer_first_party',
        developerOrganisationId: identityA.organisationId,
      } as any),
  );
  const firstPartyToPlatformConversionCode = await expectRejected(
    'first-party to platform-reference conversion',
    () =>
      cataloguePublisherService.updatePublisher(identityA.publisherId, {
        authorityKind: 'platform_reference',
        developerOrganisationId: null,
      } as any),
  );
  const firstPartyReassignmentCode = await expectRejected(
    'first-party publisher organisation reassignment',
    () =>
      cataloguePublisherService.updatePublisher(identityA.publisherId, {
        developerOrganisationId: identityB.organisationId,
      } as any),
  );
  const adminCaller = appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: adminUserId, role: 'super_admin' },
  } as any);
  const superAdminConversionCode = await expectRejected(
    'super-admin publisher authority conversion',
    () =>
      adminCaller.superAdminPublisher.updatePublisher({
        cataloguePublisherId: platformPublisherId,
        authorityKind: 'developer_first_party',
        developerOrganisationId: identityA.organisationId,
      } as any),
  );
  const editablePublisherName = `${curatedPublisherName} Updated`;
  const editedPublisher = await cataloguePublisherService.updatePublisher(platformPublisherId, {
    brandName: editablePublisherName,
  });
  assert(
    editedPublisher?.brandName === editablePublisherName &&
      editedPublisher.authorityKind === 'platform_reference' &&
      editedPublisher.developerOrganisationId === null,
    'An ordinary publisher content update failed or changed publisher authority.',
  );
  const platformPublisherAfterRejectedMutations =
    await developerIdentityService.getPublisherById(platformPublisherId);
  const firstPartyPublisherAfterRejectedReassignment =
    await developerIdentityService.getPublisherById(identityA.publisherId);
  assert(
    platformPublisherAfterRejectedMutations?.authorityKind === 'platform_reference' &&
      platformPublisherAfterRejectedMutations.developerOrganisationId === null,
    'A rejected conversion changed the platform-reference publisher authority.',
  );
  assert(
    firstPartyPublisherAfterRejectedReassignment?.authorityKind === 'developer_first_party' &&
      firstPartyPublisherAfterRejectedReassignment.developerOrganisationId ===
        identityA.organisationId,
    'A rejected reassignment changed the first-party publisher organisation.',
  );
  const nameSimilarityUserId = await insertUser('curated-name-match', 'property_developer');
  const nameSimilarityIdentity = await developerIdentityService.createDeveloperOrganisation({
    name: curatedPublisherName,
    city: 'Johannesburg',
    province: 'Gauteng',
    email: `curated-name-match-${Date.now()}@invalid.example`,
    createdByUserId: nameSimilarityUserId,
  });
  const nameSimilarityPublisher = await developerIdentityService.getPublisherById(
    nameSimilarityIdentity.publisherId,
  );
  assert(
    nameSimilarityIdentity.publisherId !== platformPublisherId &&
      nameSimilarityPublisher?.authorityKind === 'developer_first_party' &&
      nameSimilarityPublisher.developerOrganisationId === nameSimilarityIdentity.organisationId,
    'A name-similar first-party registration claimed the curated publisher.',
  );

  const curated = await insertDevelopment({
    publisherId: platformPublisherId,
    ownerType: 'platform',
    name: 'Slice 1 Curated Development',
    slug: `slice-1-curated-development-${Date.now()}`,
    published: true,
  });
  const developmentA = await insertDevelopment({
    publisherId: identityA.publisherId,
    ownerType: 'developer',
    name: 'Slice 1 Developer A Development',
    slug: `slice-1-developer-a-development-${Date.now()}`,
    published: true,
  });
  const developmentB = await insertDevelopment({
    publisherId: identityB.publisherId,
    ownerType: 'developer',
    name: 'Slice 1 Developer B Development',
    slug: `slice-1-developer-b-development-${Date.now()}`,
    published: true,
  });
  await insertApprovedReview(developmentA.id, onboardingUserId);
  await insertApprovedReview(developmentB.id, developerBUserId);

  const aDraft = await database.insert(schema.developmentDrafts).values({
    developerOrganisationId: identityA.organisationId,
    cataloguePublisherId: identityA.publisherId,
    draftName: 'Slice 1 A Draft',
    draftData: { owner: 'A' },
    progress: 20,
    currentStep: 2,
  } as any);
  const bDraft = await database.insert(schema.developmentDrafts).values({
    developerOrganisationId: identityB.organisationId,
    cataloguePublisherId: identityB.publisherId,
    draftName: 'Slice 1 B Draft',
    draftData: { owner: 'B' },
    progress: 20,
    currentStep: 2,
  } as any);
  const aDraftId = Number(aDraft[0].insertId);
  const bDraftId = Number(bDraft[0].insertId);

  const aUser = await userRow(onboardingUserId);
  const bUser = await userRow(developerBUserId);
  const aCaller = appRouter.createCaller({ req: { headers: {} }, res: {}, user: aUser } as any);
  const bCaller = appRouter.createCaller({ req: { headers: {} }, res: {}, user: bUser } as any);

  const aProfile = await aCaller.developer.getProfile();
  assert(
    Number(aProfile.organisationId) === identityA.organisationId,
    'A profile escaped its organisation.',
  );
  const aDevelopments = await aCaller.developer.getDevelopments();
  assert(
    aDevelopments.some((development: any) => Number(development.id) === developmentA.id) &&
      !aDevelopments.some((development: any) => Number(development.id) === developmentB.id),
    'A development list crossed organisation boundaries.',
  );
  const aDrafts = await aCaller.developer.getDrafts();
  assert(
    aDrafts.some((draft: any) => Number(draft.id) === aDraftId) &&
      !aDrafts.some((draft: any) => Number(draft.id) === bDraftId),
    'A draft list crossed organisation boundaries.',
  );
  assert((await aCaller.developer.getDraft({ id: bDraftId })) === null, 'A read B draft.');
  assert(
    (await aCaller.developer.getDevelopment({ id: developmentB.id })) === null,
    'A read B development.',
  );
  const wrongPublisherCode = await expectRejected('cross-organisation publisher assertion', () =>
    developerIdentityService.assertPublisherForOrganisation(
      identityB.publisherId,
      identityA.organisationId,
    ),
  );
  assert(
    wrongPublisherCode === 'FORBIDDEN',
    'Cross-organisation publisher assertion had the wrong failure.',
  );
  const wrongUpdateCode = await expectRejected('cross-organisation development update', () =>
    developmentService.updateDevelopment(developmentB.id, onboardingUserId, {
      name: 'Should Not Update',
    } as any),
  );
  assert(wrongUpdateCode === 'FORBIDDEN', 'Cross-organisation development update was not denied.');
  const wrongPublishCode = await expectRejected('cross-organisation publication mutation', () =>
    aCaller.developer.publishDevelopment({ id: developmentB.id }),
  );
  assert(
    ['FORBIDDEN', 'NOT_FOUND'].includes(wrongPublishCode),
    'Cross-organisation publication was not denied.',
  );

  const browserUser = await userRow(browserUserId);
  const browserOnboardingStatus = await appRouter
    .createCaller({ req: { headers: {} }, res: {}, user: browserUser } as any)
    .developer.getOnboardingStatus();
  assert(
    browserOnboardingStatus.hasProfile === false,
    'Browser onboarding fixture already had a profile.',
  );

  const plan = await getPlanByName('developer_launch_access');
  assert(plan, 'Canonical Developer Launch Access plan is missing.');
  const { setSubscriptionPlanForOwner } = await import('../server/services/planAccessService');
  await setSubscriptionPlanForOwner({
    ownerType: 'developer',
    ownerId: identityA.organisationId,
    planId: plan.id,
    status: 'pending_payment',
    allowPendingPayment: true,
    actorUserId: onboardingUserId,
  });
  const commercialProjection = await getPlanAccessProjectionForUserId(onboardingUserId);
  assert(
    commercialProjection?.ownerType === 'developer',
    'Commercial owner type is not developer.',
  );
  assert(
    Number(commercialProjection?.ownerId) === identityA.organisationId,
    'Commercial Launch Access resolved to the login row instead of the organisation.',
  );
  const commercialCompatibility = await developerSubscriptionService.getSubscription(
    identityA.organisationId,
  );
  assert(
    commercialCompatibility?.commercial.ownerId === identityA.organisationId,
    'Developer commercial compatibility projection lost organisation ownership.',
  );

  const curatedCaller = appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: null,
  } as any);
  const search = await publicSearchService.searchInventory({
    province: 'gauteng',
    city: 'johannesburg',
    suburb: ['sandton'],
    listingType: 'sale',
    listingSource: 'development',
    page: 0,
    pageSize: 100,
  });
  assert(search.locationState === 'resolved', 'Public Search did not resolve canonical geography.');
  assert(
    search.cards.some((card: any) => Number(card.developmentId) === curated.id),
    'Curated development was not searchable.',
  );
  assert(
    search.cards.some((card: any) => Number(card.developmentId) === developmentA.id),
    'Developer A development was not searchable.',
  );

  const curatedDetail = await curatedCaller.developer.getPublicDevelopmentBySlug({
    slugOrId: curated.slug!,
  });
  const curatedById = await developmentService.getPublicDevelopment(curated.id);
  assert(
    curatedById?.id === curated.id,
    'Curated Search → Detail did not resolve the persisted row.',
  );
  assert(
    curatedDetail?.id === curated.id,
    'Curated public detail did not resolve the canonical route.',
  );

  const curatedLead = await curatedCaller.developer.createLead({
    developmentId: curated.id,
    cataloguePublisherId: platformPublisherId,
    unitId: curated.unitId,
    unitName: 'Curated Verification Unit',
    unitPriceFrom: 1800000,
    unitBedrooms: 2,
    unitBathrooms: 1.5,
    name: 'Curated Prospect',
    email: `curated-prospect-${Date.now()}@invalid.example`,
    phone: '+27000000001',
    message: 'Curated Search to Detail enquiry.',
    sourceSurface: 'slice_1_curated_detail',
    leadSource: 'slice_1_curated_detail',
    captureRequestId: `s1-curated-${Date.now()}`,
    consent: { accepted: true, version: 'slice-1-v1', source: 'slice-1-verification' },
  });
  assert(
    curatedLead.leadCustody === 'platform_managed',
    'Curated enquiry did not remain platform-custodied.',
  );
  assert(
    curatedLead.recipientType === 'manual' && curatedLead.recipientId === null,
    'Curated enquiry received a developer recipient.',
  );

  const aDetail = await curatedCaller.developer.getPublicDevelopmentBySlug({
    slugOrId: developmentA.slug!,
  });
  assert(
    aDetail?.id === developmentA.id,
    'First-party Search → Detail did not resolve the A development.',
  );
  const aLead = await curatedCaller.developer.createLead({
    developmentId: developmentA.id,
    cataloguePublisherId: identityA.publisherId,
    unitId: developmentA.unitId,
    unitName: 'Developer A Verification Unit',
    unitPriceFrom: 1800000,
    unitBedrooms: 2,
    unitBathrooms: 1.5,
    name: 'Developer A Prospect',
    email: `developer-a-prospect-${Date.now()}@invalid.example`,
    phone: '+27000000002',
    message: 'First-party Search to Detail enquiry.',
    sourceSurface: 'slice_1_first_party_detail',
    leadSource: 'slice_1_first_party_detail',
    captureRequestId: `s1-first-party-a-${Date.now()}`,
    consent: { accepted: true, version: 'slice-1-v1', source: 'slice-1-verification' },
  });
  assert(
    aLead.leadCustody === 'verified_customer_recipient',
    'First-party enquiry was not verified-customer custody.',
  );
  assert(
    aLead.recipientType === 'developer' && Number(aLead.recipientId) === identityA.organisationId,
    'First-party enquiry routed to the wrong organisation.',
  );

  const bLead = await capturePublicLead({
    developmentId: developmentB.id,
    cataloguePublisherId: identityB.publisherId,
    unitId: developmentB.unitId,
    name: 'Developer B Prospect',
    email: `developer-b-prospect-${Date.now()}@invalid.example`,
    phone: '+27000000003',
    message: 'B-only enquiry for containment verification.',
    source: 'slice_1_b_detail',
    sourceSurface: 'slice_1_b_detail',
    leadSource: 'slice_1_b_detail',
    captureRequestId: `s1-first-party-b-${Date.now()}`,
    consent: { accepted: true, version: 'slice-1-v1', source: 'slice-1-verification' },
  });
  assert(Number(bLead.recipientId) === identityB.organisationId, 'B enquiry did not route to B.');
  const aLeads = await aCaller.developer.getLeads({ developmentId: developmentA.id });
  const aBLeads = await aCaller.developer.getLeads({ developmentId: developmentB.id });
  assert(
    aLeads.items.some((lead: any) => Number(lead.id) === aLead.leadId),
    'A cannot read its own enquiry.',
  );
  assert(aBLeads.total === 0, 'A read B enquiries.');
  const crossLeadCode = await expectRejected('cross-organisation lead transition', () =>
    aCaller.developer.transitionLead({ leadId: bLead.leadId, toStage: 'contacted' }),
  );
  assert(['FORBIDDEN', 'NOT_FOUND'].includes(crossLeadCode), 'A could mutate B enquiry.');
  const aHome = await aCaller.developer.getDevelopmentHome({
    developmentId: developmentA.id,
    range: '30d',
  });
  assert(
    aHome.development.id === developmentA.id,
    'A operating projection did not resolve its development.',
  );
  const crossHomeCode = await expectRejected('cross-organisation operating projection', () =>
    aCaller.developer.getDevelopmentHome({ developmentId: developmentB.id, range: '30d' }),
  );
  assert(crossHomeCode === 'NOT_FOUND', 'A operating projection exposed B.');

  const supersessionSourcePublisher =
    await cataloguePublisherService.createPlatformReferencePublisher({
      brandName: 'Slice 1 Supersession Curated Publisher',
      slug: `slice-1-supersession-publisher-${Date.now()}`,
      sourceAttribution: 'slice-1-local-verification-fixture',
      isVisible: true,
      createdBy: adminUserId,
    });
  const supersessionSource = await insertDevelopment({
    publisherId: Number(supersessionSourcePublisher.id),
    ownerType: 'platform',
    name: 'Slice 1 Supersession Source',
    slug: `slice-1-supersession-source-${Date.now()}`,
    published: true,
  });
  const supersessionReplacement = await insertDevelopment({
    publisherId: identityA.publisherId,
    ownerType: 'developer',
    name: 'Slice 1 Supersession Replacement',
    slug: `slice-1-supersession-replacement-${Date.now()}`,
    published: false,
  });
  const sourceLead = await capturePublicLead({
    developmentId: supersessionSource.id,
    cataloguePublisherId: Number(supersessionSourcePublisher.id),
    unitId: supersessionSource.unitId,
    name: 'Historical Curated Prospect',
    email: `historical-curated-${Date.now()}@invalid.example`,
    message: 'This history must stay on the curated source.',
    source: 'slice_1_supersession_source',
    sourceSurface: 'slice_1_supersession_source',
    leadSource: 'slice_1_supersession_source',
    captureRequestId: `s1-supersession-source-${Date.now()}`,
    consent: { accepted: true, version: 'slice-1-v1', source: 'slice-1-verification' },
  });
  const verifiedSupersession = await developmentSupersessionService.verifyDevelopmentSupersession({
    sourceDevelopmentId: supersessionSource.id,
    replacementDevelopmentId: supersessionReplacement.id,
    actorUserId: adminUserId,
    verificationNote: 'Verified Slice 1 authority continuity fixture.',
  });
  const activatedSupersession =
    await developmentSupersessionService.activateDevelopmentSupersession({
      supersessionId: verifiedSupersession.id,
      actorUserId: adminUserId,
    });
  assert(activatedSupersession.status === 'active', 'Supersession did not activate.');
  const redirect =
    await developmentSupersessionService.resolveActiveDevelopmentSupersessionRedirect(
      `/development/${supersessionSource.slug}`,
    );
  assert(
    redirect?.replacementDevelopmentId === supersessionReplacement.id,
    'Historical route did not redirect to replacement.',
  );
  assert(
    redirect?.targetPath === `/development/${supersessionReplacement.slug}`,
    'Supersession target route was not canonical.',
  );
  const postSupersessionSearch = await publicSearchService.searchInventory({
    province: 'gauteng',
    city: 'johannesburg',
    suburb: ['sandton'],
    listingType: 'sale',
    listingSource: 'development',
    page: 0,
    pageSize: 100,
  });
  assert(
    !postSupersessionSearch.cards.some(
      (card: any) => Number(card.developmentId) === supersessionSource.id,
    ),
    'Superseded source remained in public results.',
  );
  assert(
    postSupersessionSearch.cards.filter(
      (card: any) => Number(card.developmentId) === supersessionReplacement.id,
    ).length === 1,
    'Supersession produced duplicate public replacement results.',
  );
  const [sourceLeadCount] = await database
    .select({ count: count() })
    .from(schema.leads)
    .where(
      and(
        eq(schema.leads.developmentId, supersessionSource.id),
        eq(schema.leads.id, sourceLead.leadId),
      ),
    );
  const [replacementLeadCount] = await database
    .select({ count: count() })
    .from(schema.leads)
    .where(eq(schema.leads.developmentId, supersessionReplacement.id));
  assert(
    Number(sourceLeadCount.count) === 1,
    'Supersession rewrote or removed source enquiry history.',
  );
  assert(
    Number(replacementLeadCount.count) === 0,
    'Supersession copied source enquiry history to replacement.',
  );

  const replacementLead = await capturePublicLead({
    developmentId: supersessionReplacement.id,
    cataloguePublisherId: identityA.publisherId,
    unitId: supersessionReplacement.unitId,
    name: 'Canonical Replacement Prospect',
    email: `canonical-replacement-${Date.now()}@invalid.example`,
    message: 'Canonical replacement enquiry routing verification.',
    source: 'slice_1_supersession_replacement',
    sourceSurface: 'slice_1_supersession_replacement',
    leadSource: 'slice_1_supersession_replacement',
    captureRequestId: `s1-supersession-replacement-${Date.now()}`,
    consent: { accepted: true, version: 'slice-1-v1', source: 'slice-1-verification' },
  });
  assert(
    replacementLead.leadCustody === 'verified_customer_recipient' &&
      replacementLead.recipientType === 'developer' &&
      Number(replacementLead.recipientId) === identityA.organisationId,
    'Canonical replacement enquiry did not route to its first-party organisation.',
  );

  const reversedSource = await insertDevelopment({
    publisherId: Number(supersessionSourcePublisher.id),
    ownerType: 'platform',
    name: 'Slice 1 Reversed Supersession Source',
    slug: `slice-1-reversed-supersession-source-${Date.now()}`,
    published: true,
  });
  const reversedReplacement = await insertDevelopment({
    publisherId: identityA.publisherId,
    ownerType: 'developer',
    name: 'Slice 1 Reversed Supersession Replacement',
    slug: `slice-1-reversed-supersession-replacement-${Date.now()}`,
    published: false,
  });
  const verifiedReversal = await developmentSupersessionService.verifyDevelopmentSupersession({
    sourceDevelopmentId: reversedSource.id,
    replacementDevelopmentId: reversedReplacement.id,
    actorUserId: adminUserId,
    verificationNote: 'Slice 1 reversible routing fixture.',
  });
  await developmentSupersessionService.activateDevelopmentSupersession({
    supersessionId: verifiedReversal.id,
    actorUserId: adminUserId,
  });
  const reversedSupersession = await developmentSupersessionService.reverseDevelopmentSupersession({
    supersessionId: verifiedReversal.id,
    actorUserId: adminUserId,
    reversalReason:
      'Slice 1 verifies that reversible cutover never receives permanent redirect semantics.',
  });
  assert(reversedSupersession.status === 'reversed', 'Supersession reversal did not persist.');
  const redirectAfterReversal =
    await developmentSupersessionService.resolveActiveDevelopmentSupersessionRedirect(
      `/development/${reversedSource.slug}`,
    );
  assert(redirectAfterReversal === null, 'A reversed supersession continued redirecting.');
  const restoredReversalSource = await developmentService.getPublicDevelopmentBySlug(
    reversedSource.slug,
  );
  const withdrawnReversalReplacement = await developmentService.getPublicDevelopmentBySlug(
    reversedReplacement.slug,
  );
  assert(
    Number(restoredReversalSource?.id) === reversedSource.id,
    'Supersession reversal did not restore the historical curated Detail route.',
  );
  assert(
    withdrawnReversalReplacement === null,
    'Supersession reversal left the former replacement publicly active.',
  );
  const postReversalSearch = await publicSearchService.searchInventory({
    province: 'gauteng',
    city: 'johannesburg',
    suburb: ['sandton'],
    listingType: 'sale',
    listingSource: 'development',
    page: 0,
    pageSize: 100,
  });
  assert(
    postReversalSearch.cards.filter((card: any) => Number(card.developmentId) === reversedSource.id)
      .length === 1,
    'Supersession reversal did not restore exactly one historical source result.',
  );
  assert(
    !postReversalSearch.cards.some(
      (card: any) => Number(card.developmentId) === reversedReplacement.id,
    ),
    'Supersession reversal left the former replacement in Search.',
  );

  console.log(
    JSON.stringify(
      {
        adapter: 'developer-engine-s1-verification',
        target: {
          database: authority.context.databaseName,
          fingerprint: authority.context.targetFingerprintHash,
          ownershipKey: ownership.ownershipKey,
        },
        onboarding: {
          concurrentIdentityConverged: true,
          organisationId: identityA.organisationId,
          publisherId: identityA.publisherId,
          invalidUserFailureCode: invalidOnboardingCode,
          noPartialOrganisationCreated: true,
        },
        browserOnboarding: {
          userId: browserUserId,
          email: browserUser.email,
          initialHasProfile: browserOnboardingStatus.hasProfile,
        },
        containment: {
          organisationA: identityA.organisationId,
          organisationB: identityB.organisationId,
          crossPublisherFailureCode: wrongPublisherCode,
          crossDevelopmentRead: true,
          crossDevelopmentUpdateCode: wrongUpdateCode,
          crossPublicationCode: wrongPublishCode,
          crossDraftRead: true,
          crossLeadMutationCode: crossLeadCode,
          crossOperatingProjectionCode: crossHomeCode,
        },
        publisherAuthority: {
          platformReferencePublisherId: platformPublisherId,
          firstPartyPublisherId: identityA.publisherId,
          platformShapeFailureCode: invalidPlatformShapeCode,
          firstPartyShapeFailureCode: invalidFirstPartyShapeCode,
          duplicateSlugFailureCode: duplicatePublisherSlugCode,
          directIdentityServiceConversionFailureCode: directIdentityServiceConversionCode,
          platformToFirstPartyConversionFailureCode: platformToFirstPartyConversionCode,
          firstPartyToPlatformConversionFailureCode: firstPartyToPlatformConversionCode,
          firstPartyReassignmentFailureCode: firstPartyReassignmentCode,
          superAdminConversionFailureCode: superAdminConversionCode,
          runtimeAuthorityFieldsUnchanged: true,
          ordinaryContentUpdateSucceeded: true,
          validAuthorityKindsCreated: true,
          nameSimilarityCreatedSeparateFirstParty: true,
          curatedLeadCustody: curatedLead.leadCustody,
          firstPartyLeadCustody: aLead.leadCustody,
          firstPartyRecipientOrganisationId: aLead.recipientId,
        },
        searchDetailEnquiry: {
          locationState: search.locationState,
          curatedDevelopmentId: curated.id,
          curatedDevelopmentSlug: curated.slug,
          firstPartyDevelopmentId: developmentA.id,
          firstPartyDevelopmentSlug: developmentA.slug,
          otherOrganisationDevelopmentId: developmentB.id,
          curatedLeadId: curatedLead.leadId,
          firstPartyLeadId: aLead.leadId,
        },
        commercial: {
          planName: commercialProjection?.currentPlan?.name ?? null,
          ownerType: commercialProjection?.ownerType ?? null,
          ownerId: commercialProjection?.ownerId ?? null,
          compatibilityOwnerId: commercialCompatibility?.commercial.ownerId ?? null,
        },
        supersession: {
          sourceDevelopmentId: supersessionSource.id,
          sourceDevelopmentSlug: supersessionSource.slug,
          replacementDevelopmentId: supersessionReplacement.id,
          replacementDevelopmentSlug: supersessionReplacement.slug,
          status: activatedSupersession.status,
          redirect: redirect?.targetPath ?? null,
          sourceLeadCount: Number(sourceLeadCount.count),
          replacementLeadCountBeforeNewEnquiry: Number(replacementLeadCount.count),
          replacementLeadId: replacementLead.leadId,
          replacementLeadRecipientOrganisationId: replacementLead.recipientId,
          duplicateActiveResult: false,
          reversedSourceDevelopmentId: reversedSource.id,
          reversedSourceDevelopmentSlug: reversedSource.slug,
          reversedReplacementDevelopmentId: reversedReplacement.id,
          reversedReplacementDevelopmentSlug: reversedReplacement.slug,
          reversedStatus: reversedSupersession.status,
          redirectAfterReversal,
          restoredHistoricalDetail: true,
          restoredHistoricalSearchResult: true,
          withdrawnReplacementAfterReversal: true,
        },
      },
      null,
      2,
    ),
  );

  await connection.end();
  resetDb();
}

main()
  .then(() => {
    // The application pool is deliberately reset inside main; terminate the
    // one-shot verifier after its dedicated SQL connection is closed so an
    // idle pool handle cannot keep the evidence process alive.
    process.exit(0);
  })
  .catch(async error => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
