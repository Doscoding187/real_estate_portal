import { and, eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import {
  DEVELOPMENT_OPERATING_EVENT_TYPES,
  developers,
  developments,
  developmentOperatingEvents,
  dleEvidenceArtifactAccessGrants,
  dleEvidenceArtifacts,
  distributionDeals,
  distributionPrograms,
  leads,
  users,
} from '../../../drizzle/schema';
import { getDb } from '../../db-connection';
import {
  assertEvidenceArtifactReviewTransition,
  assertEvidenceRoleForTransaction,
  buildDevelopmentEvidenceCoverageSummary,
  buildDleEvidenceAccessGrantInput,
  buildDleEvidenceLinkageDecision,
  buildEvidenceDownloadAuditMetadata,
  buildEvidenceUploadToken,
  buildLeadEvidenceCoverageSummary,
  buildPrivateEvidenceStorageKey,
  completeLeadEvidenceFileUpload,
  createLeadEvidenceFileUploadIntent,
  evaluateDleEvidenceAccess,
  getDefaultReviewOwnerForEvidence,
  getEvidenceArtifactEventType,
  getEvidenceArtifactReviewEventType,
  getLeadEvidenceFileDownloadUrl,
  listLeadEvidenceArtifacts,
  parseEvidenceUploadToken,
  validateEvidenceUploadFile,
} from '../dleEvidenceArtifactService';

function getInsertId(result: unknown): number {
  return Number((result as Array<{ insertId: number }>)[0]?.insertId);
}

describe('dleEvidenceArtifactService helpers', () => {
  const cleanup: {
    userIds: number[];
    developerIds: number[];
    developmentIds: number[];
    distributionDealIds: number[];
    distributionProgramIds: number[];
    leadIds: number[];
    artifactIds: number[];
    accessGrantIds: number[];
  } = {
    userIds: [],
    developerIds: [],
    developmentIds: [],
    distributionDealIds: [],
    distributionProgramIds: [],
    leadIds: [],
    artifactIds: [],
    accessGrantIds: [],
  };

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    for (const accessGrantId of cleanup.accessGrantIds.reverse()) {
      await db
        .delete(dleEvidenceArtifactAccessGrants)
        .where(eq(dleEvidenceArtifactAccessGrants.id, accessGrantId));
    }
    for (const artifactId of cleanup.artifactIds.reverse()) {
      await db.delete(dleEvidenceArtifacts).where(eq(dleEvidenceArtifacts.id, artifactId));
    }
    for (const leadId of cleanup.leadIds.reverse()) {
      await db.delete(leads).where(eq(leads.id, leadId));
    }
    for (const distributionDealId of cleanup.distributionDealIds.reverse()) {
      await db.delete(distributionDeals).where(eq(distributionDeals.id, distributionDealId));
    }
    for (const distributionProgramId of cleanup.distributionProgramIds.reverse()) {
      await db
        .delete(distributionPrograms)
        .where(eq(distributionPrograms.id, distributionProgramId));
    }
    for (const developmentId of cleanup.developmentIds.reverse()) {
      await db.delete(developments).where(eq(developments.id, developmentId));
    }
    for (const developerId of cleanup.developerIds.reverse()) {
      await db.delete(developers).where(eq(developers.id, developerId));
    }
    for (const userId of cleanup.userIds.reverse()) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it('accepts Rental evidence roles only for Rental leads', () => {
    expect(assertEvidenceRoleForTransaction('for_rent', 'proof_of_income')).toBe(
      'proof_of_income',
    );
    expect(assertEvidenceRoleForTransaction('for_rent', 'signed_lease')).toBe('signed_lease');

    expect(() => assertEvidenceRoleForTransaction('for_rent', 'proof_of_funds')).toThrow(
      'Selected evidence role is not valid for Rental leads.',
    );
  });

  it('accepts Auction evidence roles only for Auction leads', () => {
    expect(assertEvidenceRoleForTransaction('auction', 'proof_of_funds')).toBe('proof_of_funds');
    expect(assertEvidenceRoleForTransaction('auction', 'bidder_registration')).toBe(
      'bidder_registration',
    );

    expect(() => assertEvidenceRoleForTransaction('auction', 'signed_lease')).toThrow(
      'Selected evidence role is not valid for Auction leads.',
    );
  });

  it('keeps review ownership transaction-native', () => {
    expect(getDefaultReviewOwnerForEvidence('for_rent')).toBe('leasing_team');
    expect(getDefaultReviewOwnerForEvidence('auction')).toBe('auction_team');
  });

  it('maps first-slice evidence statuses to operating-event types', () => {
    expect(getEvidenceArtifactEventType('requested')).toBe('evidence_artifact_requested');
    expect(getEvidenceArtifactEventType('submitted')).toBe('evidence_artifact_submitted');
  });

  it('maps review statuses to operating-event types', () => {
    expect(getEvidenceArtifactReviewEventType('under_review')).toBe(
      'evidence_artifact_review_started',
    );
    expect(getEvidenceArtifactReviewEventType('accepted')).toBe('evidence_artifact_accepted');
    expect(getEvidenceArtifactReviewEventType('rejected')).toBe('evidence_artifact_rejected');
  });

  it('includes evidence file download in the operating-event schema contract', () => {
    expect(DEVELOPMENT_OPERATING_EVENT_TYPES).toContain('evidence_artifact_downloaded');
  });

  it('allows review transitions without allowing requested evidence to be accepted directly', () => {
    expect(() =>
      assertEvidenceArtifactReviewTransition({
        fromStatus: 'submitted',
        toStatus: 'under_review',
      }),
    ).not.toThrow();
    expect(() =>
      assertEvidenceArtifactReviewTransition({
        fromStatus: 'under_review',
        toStatus: 'accepted',
      }),
    ).not.toThrow();
    expect(() =>
      assertEvidenceArtifactReviewTransition({
        fromStatus: 'submitted',
        toStatus: 'rejected',
      }),
    ).not.toThrow();

    expect(() =>
      assertEvidenceArtifactReviewTransition({
        fromStatus: 'requested',
        toStatus: 'accepted',
      }),
    ).toThrow('Evidence can only be accepted or rejected after submission or review start.');
  });

  it('summarizes Rental accepted coverage across active leads without readiness automation', () => {
    expect(
      buildDevelopmentEvidenceCoverageSummary({
        transactionType: 'for_rent',
        leads: [
          {
            leadId: 1,
            acceptedRoles: ['proof_of_income'],
          },
          {
            leadId: 2,
            acceptedRoles: ['proof_of_income', 'deposit_readiness', 'signed_lease'],
          },
          {
            leadId: 3,
            acceptedRoles: [],
          },
        ],
      }),
    ).toMatchObject({
      title: 'Rental evidence coverage',
      statusLabel: '1 lead with complete accepted coverage',
      totalActiveLeadCount: 3,
      completeLeadCount: 1,
      partialLeadCount: 1,
      noAcceptedLeadCount: 1,
      acceptedRoleCounts: [
        { role: 'proof_of_income', label: 'Proof of income', count: 2 },
        { role: 'deposit_readiness', label: 'Deposit readiness', count: 1 },
        { role: 'signed_lease', label: 'Lease review', count: 1 },
      ],
      missingRoleCounts: [
        { role: 'proof_of_income', label: 'Proof of income', count: 1 },
        { role: 'deposit_readiness', label: 'Deposit readiness', count: 2 },
        { role: 'signed_lease', label: 'Lease review', count: 2 },
      ],
      guardrail:
        'Coverage is not verified lease readiness, inventory let status, or distribution payout readiness.',
    });
  });

  it('summarizes Auction accepted coverage without bidder-readiness claims', () => {
    expect(
      buildDevelopmentEvidenceCoverageSummary({
        transactionType: 'auction',
        leads: [
          {
            leadId: 10,
            acceptedRoles: [
              'legal_pack_acknowledgement',
              'proof_of_funds',
              'bidder_registration',
            ],
          },
        ],
      }),
    ).toMatchObject({
      title: 'Auction evidence coverage',
      statusLabel: '1 lead with complete accepted coverage',
      totalActiveLeadCount: 1,
      completeLeadCount: 1,
      partialLeadCount: 0,
      noAcceptedLeadCount: 0,
      missingRoleCounts: [
        { role: 'legal_pack_acknowledgement', label: 'Legal-pack access', count: 0 },
        { role: 'proof_of_funds', label: 'Proof of funds', count: 0 },
        { role: 'bidder_registration', label: 'Registration review', count: 0 },
      ],
      guardrail:
        'Coverage is not verified bidder registration, proof-of-funds readiness, winning-bid status, or distribution payout readiness.',
    });
  });

  it('builds Rental lead-row coverage labels without lease-readiness claims', () => {
    expect(
      buildLeadEvidenceCoverageSummary({
        leadId: 42,
        transactionType: 'for_rent',
        acceptedRoles: ['proof_of_income'],
      }),
    ).toMatchObject({
      leadId: 42,
      title: 'Rental evidence coverage',
      statusLabel: 'Evidence partially accepted',
      acceptedCount: 1,
      requiredCount: 3,
      acceptedRoles: [{ role: 'proof_of_income', label: 'Proof of income' }],
      missingRoles: [
        { role: 'deposit_readiness', label: 'Deposit readiness' },
        { role: 'signed_lease', label: 'Lease review' },
      ],
      guardrail:
        'Accepted evidence coverage is not lease readiness, inventory let status, or distribution payout readiness.',
    });
  });

  it('builds Auction lead-row coverage labels without bidder-readiness claims', () => {
    expect(
      buildLeadEvidenceCoverageSummary({
        leadId: 77,
        transactionType: 'auction',
        acceptedRoles: [
          'legal_pack_acknowledgement',
          'proof_of_funds',
          'bidder_registration',
        ],
      }),
    ).toMatchObject({
      leadId: 77,
      title: 'Auction evidence coverage',
      statusLabel: 'Auction evidence roles accepted',
      acceptedCount: 3,
      requiredCount: 3,
      missingRoles: [],
      guardrail:
        'Accepted evidence coverage is not bidder registration, proof-of-funds readiness, winning-bid status, or distribution payout readiness.',
    });
  });

  it('validates evidence upload files conservatively', () => {
    expect(
      validateEvidenceUploadFile({
        filename: 'June payslip.pdf',
        contentType: 'application/pdf',
        fileSizeBytes: 512_000,
      }),
    ).toMatchObject({
      sanitizedFilename: 'June-payslip.pdf',
      extension: 'pdf',
      contentType: 'application/pdf',
      fileSizeBytes: 512_000,
    });

    expect(() =>
      validateEvidenceUploadFile({
        filename: 'funds.exe',
        contentType: 'application/octet-stream',
        fileSizeBytes: 512_000,
      }),
    ).toThrow('Unsupported evidence file type.');

    expect(() =>
      validateEvidenceUploadFile({
        filename: 'funds.pdf',
        contentType: 'image/png',
        fileSizeBytes: 512_000,
      }),
    ).toThrow('Evidence file extension does not match the selected file type.');

    expect(() =>
      validateEvidenceUploadFile({
        filename: 'large.pdf',
        contentType: 'application/pdf',
        fileSizeBytes: 11 * 1024 * 1024,
      }),
    ).toThrow('Evidence file must be 10 MB or smaller.');
  });

  it('builds private evidence storage keys outside public media namespaces', () => {
    const key = buildPrivateEvidenceStorageKey({
      environment: 'test',
      developmentId: 12,
      leadId: 34,
      artifactId: 56,
      extension: 'pdf',
      uuid: 'fixed-upload-id',
    });

    expect(key).toBe(
      'dle/evidence/test/development-12/lead-34/artifact-56/fixed-upload-id.pdf',
    );
    expect(key).not.toContain('properties/');
    expect(key).not.toContain('local-uploads');
  });

  it('signs evidence upload tokens and rejects tampering', () => {
    const token = buildEvidenceUploadToken({
      artifactId: 56,
      leadId: 34,
      developmentId: 12,
      storageKey: 'dle/evidence/test/development-12/lead-34/artifact-56/fixed-upload-id.pdf',
    });

    expect(parseEvidenceUploadToken(token)).toMatchObject({
      artifactId: 56,
      leadId: 34,
      developmentId: 12,
      storageKey: 'dle/evidence/test/development-12/lead-34/artifact-56/fixed-upload-id.pdf',
    });

    const [payload, signature] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        artifactId: 999,
        leadId: 34,
        developmentId: 12,
        storageKey: 'dle/evidence/test/development-12/lead-34/artifact-999/fixed-upload-id.pdf',
        nonce: 'tampered',
      }),
    ).toString('base64url');

    expect(() => parseEvidenceUploadToken(`${tamperedPayload}.${signature}`)).toThrow(
      'Invalid evidence upload token.',
    );
    expect(() => parseEvidenceUploadToken(`${payload}.bad-signature`)).toThrow(
      'Invalid evidence upload token.',
    );
  });

  it('allows owning developers to access evidence while denying unrelated developers', () => {
    const artifact = {
      id: 10,
      developmentId: 20,
      developerId: 30,
      leadId: 40,
      transactionType: 'for_rent',
      artifactRole: 'proof_of_income',
      artifactType: 'uploaded_file',
      status: 'submitted',
      storageKey: 'dle/evidence/test/development-20/lead-40/artifact-10/proof.pdf',
      externalUrl: null,
      metadata: { uploadStatus: 'uploaded' },
    };

    expect(
      evaluateDleEvidenceAccess({
        actor: { actorType: 'developer_operator', developerId: 30, userId: 50 },
        artifact,
        context: {
          accessLevel: 'metadata',
          sourceSurface: 'developer_leads_manager',
        },
      }),
    ).toMatchObject({ allowed: true, accessLevel: 'metadata' });

    expect(
      evaluateDleEvidenceAccess({
        actor: { actorType: 'developer_operator', developerId: 30, userId: 50 },
        artifact,
        context: {
          accessLevel: 'download',
          sourceSurface: 'developer_leads_manager',
          privateStorageConfigured: true,
          canWriteDownloadAudit: true,
        },
      }),
    ).toMatchObject({ allowed: true, accessLevel: 'download' });

    expect(
      evaluateDleEvidenceAccess({
        actor: { actorType: 'developer_operator', developerId: 30, userId: 50 },
        artifact: {
          ...artifact,
          status: 'accepted',
        },
        context: {
          accessLevel: 'download',
          sourceSurface: 'developer_leads_manager',
          privateStorageConfigured: true,
          canWriteDownloadAudit: true,
          allowedDownloadStatuses: ['submitted'],
        },
      }),
    ).toMatchObject({
      allowed: false,
      denialReason: 'Evidence file is not available for download until upload completion is verified.',
    });

    expect(
      evaluateDleEvidenceAccess({
        actor: { actorType: 'developer_operator', developerId: 31, userId: 51 },
        artifact,
        context: {
          accessLevel: 'metadata',
          sourceSurface: 'developer_leads_manager',
        },
      }),
    ).toMatchObject({
      allowed: false,
      denialReason: 'Developer does not own this evidence artifact.',
    });
  });

  it('keeps admin evidence access policy-scoped instead of global-by-default', () => {
    const artifact = {
      id: 11,
      developmentId: 21,
      developerId: 31,
      leadId: 41,
      transactionType: 'auction',
      artifactRole: 'proof_of_funds',
      artifactType: 'uploaded_file',
      status: 'submitted',
      storageKey: 'dle/evidence/test/development-21/lead-41/artifact-11/funds.pdf',
      externalUrl: null,
      metadata: { uploadStatus: 'uploaded' },
    };
    const linkedDecision = buildDleEvidenceLinkageDecision({
      artifact: {
        artifactId: artifact.id,
        artifactDevelopmentId: artifact.developmentId,
        artifactLeadId: artifact.leadId,
        artifactDistributionDealId: null,
        artifactRole: artifact.artifactRole,
      },
      requestedAccessLevel: 'download',
      accessGrants: [
        {
          grantId: 611,
          artifactId: artifact.id,
          developmentId: artifact.developmentId,
          leadId: artifact.leadId,
          adminReviewItemId: 711,
          grantedToSurface: 'admin_review',
          accessLevel: 'download',
          status: 'active',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      ],
    });

    expect(
      evaluateDleEvidenceAccess({
        actor: { actorType: 'admin_reviewer', userId: 60, isAdmin: true },
        artifact,
        context: {
          accessLevel: 'metadata',
          sourceSurface: 'admin_review',
          adminReviewLinked: false,
        },
      }),
    ).toMatchObject({
      allowed: false,
      denialReason: 'Admin evidence access requires a linked review item.',
    });

    expect(
      evaluateDleEvidenceAccess({
        actor: { actorType: 'admin_reviewer', userId: 60, isAdmin: true },
        artifact,
        context: {
          accessLevel: 'download',
          sourceSurface: 'admin_review',
          adminReviewLinked: linkedDecision.adminReviewLinked,
          adminReviewReason: 'Policy review of proof-of-funds upload',
          privateStorageConfigured: true,
          canWriteDownloadAudit: true,
        },
      }),
    ).toMatchObject({ allowed: true, accessLevel: 'download', sourceSurface: 'admin_review' });

    expect(
      evaluateDleEvidenceAccess({
        actor: { actorType: 'admin_reviewer', userId: 60, isAdmin: true },
        artifact,
        context: {
          accessLevel: 'review_mutation',
          sourceSurface: 'admin_review',
          adminReviewLinked: linkedDecision.adminReviewLinked,
        },
      }),
    ).toMatchObject({
      allowed: false,
      denialReason: 'Admin evidence review mutation requires an explicit review-owner policy.',
    });
  });

  it('requires explicit distribution linkage before metadata or download access', () => {
    const artifact = {
      id: 12,
      developmentId: 22,
      developerId: 32,
      leadId: 42,
      transactionType: 'for_rent',
      artifactRole: 'signed_lease',
      artifactType: 'uploaded_file',
      status: 'accepted',
      storageKey: 'dle/evidence/test/development-22/lead-42/artifact-12/lease.pdf',
      externalUrl: null,
      metadata: { uploadStatus: 'uploaded' },
    };
    const linkedDecision = buildDleEvidenceLinkageDecision({
      artifact: {
        artifactId: artifact.id,
        artifactDevelopmentId: artifact.developmentId,
        artifactLeadId: artifact.leadId,
        artifactDistributionDealId: 82,
        artifactRole: artifact.artifactRole,
      },
      distributionDeal: {
        dealId: 82,
        developmentId: artifact.developmentId,
        programmeId: 92,
        managerHasActiveAccess: true,
        roleRelevant: true,
      },
      requestedAccessLevel: 'download',
    });

    expect(
      evaluateDleEvidenceAccess({
        actor: {
          actorType: 'distribution_manager',
          userId: 70,
          managerId: 80,
          hasActiveManagerAccess: true,
        },
        artifact,
        context: {
          accessLevel: 'metadata',
          sourceSurface: 'distribution_manager',
        },
      }),
    ).toMatchObject({
      allowed: false,
      denialReason:
        'Distribution evidence access requires explicit deal, programme, handoff, share, or grant linkage.',
    });

    expect(
      evaluateDleEvidenceAccess({
        actor: {
          actorType: 'distribution_manager',
          userId: 70,
          managerId: 80,
          hasActiveManagerAccess: true,
        },
        artifact,
        context: {
          accessLevel: 'download',
          sourceSurface: 'distribution_manager',
          distributionLinkage: linkedDecision.distributionLinkage,
          distributionRoleRelevant: linkedDecision.distributionRoleRelevant,
          privateStorageConfigured: true,
          canWriteDownloadAudit: true,
        },
      }),
    ).toMatchObject({
      allowed: true,
      accessLevel: 'download',
      sourceSurface: 'distribution_manager',
    });

    expect(
      evaluateDleEvidenceAccess({
        actor: {
          actorType: 'distribution_manager',
          userId: 70,
          managerId: 80,
          hasActiveManagerAccess: true,
        },
        artifact,
        context: {
          accessLevel: 'review_mutation',
          sourceSurface: 'distribution_manager',
          distributionLinkage: linkedDecision.distributionLinkage,
        },
      }),
    ).toMatchObject({
      allowed: false,
      denialReason: 'Distribution access cannot mutate DLE evidence review status.',
    });

    const irrelevantRoleDecision = buildDleEvidenceLinkageDecision({
      artifact: {
        artifactId: artifact.id,
        artifactDevelopmentId: artifact.developmentId,
        artifactLeadId: artifact.leadId,
        artifactDistributionDealId: 82,
        artifactRole: artifact.artifactRole,
      },
      distributionDeal: {
        dealId: 82,
        developmentId: artifact.developmentId,
        programmeId: 92,
        managerHasActiveAccess: true,
        roleRelevant: false,
      },
      requestedAccessLevel: 'download',
    });
    expect(irrelevantRoleDecision.denialReasons).toContain(
      'Evidence role is not relevant to the linked distribution workflow.',
    );
    expect(
      evaluateDleEvidenceAccess({
        actor: {
          actorType: 'distribution_manager',
          userId: 70,
          managerId: 80,
          hasActiveManagerAccess: true,
        },
        artifact,
        context: {
          accessLevel: 'download',
          sourceSurface: 'distribution_manager',
          distributionLinkage: irrelevantRoleDecision.distributionLinkage,
          distributionRoleRelevant: irrelevantRoleDecision.distributionRoleRelevant,
          privateStorageConfigured: true,
          canWriteDownloadAudit: true,
        },
      }),
    ).toMatchObject({
      allowed: false,
      denialReason:
        'Distribution evidence download requires a role relevant to the distribution workflow.',
    });
  });

  it('denies public evidence access and blocks unsafe download inputs', () => {
    const artifact = {
      id: 13,
      developmentId: 23,
      developerId: 33,
      leadId: 43,
      transactionType: 'auction',
      artifactRole: 'legal_pack_acknowledgement',
      artifactType: 'uploaded_file',
      status: 'submitted',
      storageKey: 'properties/public/legal-pack.pdf',
      externalUrl: 'https://cdn.example.test/legal-pack.pdf',
      metadata: { uploadStatus: 'uploaded' },
    };

    expect(
      evaluateDleEvidenceAccess({
        actor: { actorType: 'public_applicant', sessionId: 'public-session' },
        artifact,
        context: {
          accessLevel: 'metadata',
          sourceSurface: 'public_lead_form',
        },
      }),
    ).toMatchObject({
      allowed: false,
      denialReason: 'Public evidence access requires a scoped artifact token.',
    });

    expect(
      evaluateDleEvidenceAccess({
        actor: { actorType: 'developer_operator', developerId: 33, userId: 53 },
        artifact,
        context: {
          accessLevel: 'download',
          sourceSurface: 'developer_leads_manager',
          privateStorageConfigured: true,
          canWriteDownloadAudit: true,
        },
      }),
    ).toMatchObject({
      allowed: false,
      denialReason: 'Evidence artifact storage key is not in the private evidence namespace.',
    });
  });

  it('builds source-surface-aware download audit metadata without sensitive file details', () => {
    const metadata = buildEvidenceDownloadAuditMetadata({
      artifact: {
        id: 91,
        artifactRole: 'proof_of_funds',
        displayName: 'Proof of funds',
      },
      sourceSurface: 'developer_leads_manager',
      actorType: 'developer_operator',
      downloadExpiresInSeconds: 300,
      previousDownloadCount: 2,
    });

    expect(metadata).toEqual({
      artifactId: 91,
      artifactRole: 'proof_of_funds',
      displayName: 'Proof of funds',
      sourceSurface: 'developer_leads_manager',
      accessLevel: 'download',
      actorType: 'developer_operator',
      storageNamespace: 'private_dle_evidence',
      downloadExpiresInSeconds: 300,
      downloadCount: 3,
    });
    expect(metadata).not.toHaveProperty('storageKey');
    expect(metadata).not.toHaveProperty('signedUrl');
    expect(metadata).not.toHaveProperty('downloadUrl');
    expect(metadata).not.toHaveProperty('externalUrl');
    expect(metadata).not.toHaveProperty('documentContents');
  });

  it('recognizes existing distribution deal linkage without mutating access state', () => {
    expect(
      buildDleEvidenceLinkageDecision({
        artifact: {
          artifactId: 201,
          artifactDevelopmentId: 301,
          artifactLeadId: 401,
          artifactDistributionDealId: 501,
          artifactRole: 'signed_lease',
        },
        distributionDeal: {
          dealId: 501,
          developmentId: 301,
          programmeId: 601,
          managerHasActiveAccess: true,
          roleRelevant: true,
        },
      }),
    ).toEqual({
      distributionLinkage: { dealLinked: true },
      adminReviewLinked: false,
      distributionRoleRelevant: true,
      denialReasons: [],
      grantIds: [],
    });
  });

  it('rejects distribution linkage when the deal belongs to another development', () => {
    expect(
      buildDleEvidenceLinkageDecision({
        artifact: {
          artifactId: 202,
          artifactDevelopmentId: 302,
          artifactLeadId: 402,
          artifactDistributionDealId: 502,
          artifactRole: 'proof_of_funds',
        },
        distributionDeal: {
          dealId: 502,
          developmentId: 999,
          programmeId: 602,
          managerHasActiveAccess: true,
          roleRelevant: true,
        },
      }),
    ).toEqual({
      distributionLinkage: {},
      adminReviewLinked: false,
      distributionRoleRelevant: false,
      denialReasons: ['Linked distribution deal does not belong to the evidence development.'],
      grantIds: [],
    });
  });

  it('normalizes future active grants while rejecting revoked and expired grants', () => {
    const futureDate = new Date(Date.now() + 60_000).toISOString();
    const pastDate = new Date(Date.now() - 60_000).toISOString();

    expect(
      buildDleEvidenceLinkageDecision({
        artifact: {
          artifactId: 203,
          artifactDevelopmentId: 303,
          artifactLeadId: 403,
          artifactDistributionDealId: null,
          artifactRole: 'proof_of_income',
        },
        requestedAccessLevel: 'metadata',
        accessGrants: [
          {
            grantId: 701,
            artifactId: 203,
            developmentId: 303,
            distributionDealId: 503,
            distributionProgramId: 603,
            grantedToSurface: 'distribution_manager',
            accessLevel: 'download',
            status: 'active',
            expiresAt: futureDate,
          },
          {
            grantId: 702,
            artifactId: 203,
            developmentId: 303,
            adminReviewItemId: 802,
            grantedToSurface: 'admin_review',
            accessLevel: 'metadata',
            status: 'active',
            expiresAt: futureDate,
          },
          {
            grantId: 703,
            artifactId: 203,
            developmentId: 303,
            grantedToSurface: 'distribution_manager',
            accessLevel: 'metadata',
            status: 'revoked',
          },
          {
            grantId: 704,
            artifactId: 203,
            developmentId: 303,
            grantedToSurface: 'admin_review',
            accessLevel: 'metadata',
            status: 'active',
            expiresAt: pastDate,
          },
        ],
      }),
    ).toEqual({
      distributionLinkage: {
        accessGrantRecorded: true,
        dealLinked: true,
        programmeRoleMappedAndShared: true,
      },
      adminReviewLinked: true,
      distributionRoleRelevant: true,
      denialReasons: ['Access grant 703 is revoked.', 'Access grant 704 is expired.'],
      grantIds: [701, 702],
    });
  });

  it('normalizes persisted admin review access grants into linkage decisions without opening endpoints', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const userInsert = await db!.insert(users).values({
      email: `dle-evidence-admin-grant-${suffix}@example.com`,
      passwordHash: 'test-password-hash',
      role: 'super_admin',
      firstName: 'Evidence',
      lastName: 'Reviewer',
      name: 'Evidence Reviewer',
      emailVerified: 1,
    });
    const userId = getInsertId(userInsert);
    cleanup.userIds.push(userId);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `Evidence Admin Grant Developer ${suffix}`,
      email: `admin-grant-developer-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    const developerId = getInsertId(developerInsert);
    cleanup.developerIds.push(developerId);

    const developmentInsert = await db!.insert(developments).values({
      developerId,
      name: `Evidence Admin Grant Rental ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_rent',
      city: 'Cape Town',
      province: 'Western Cape',
      status: 'launching-soon',
      monthlyRentFrom: '14000',
      monthlyRentTo: '16000',
    });
    const developmentId = getInsertId(developmentInsert);
    cleanup.developmentIds.push(developmentId);

    const otherDevelopmentInsert = await db!.insert(developments).values({
      developerId,
      name: `Evidence Admin Grant Other ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_rent',
      city: 'Cape Town',
      province: 'Western Cape',
      status: 'launching-soon',
      monthlyRentFrom: '9000',
      monthlyRentTo: '11000',
    });
    const otherDevelopmentId = getInsertId(otherDevelopmentInsert);
    cleanup.developmentIds.push(otherDevelopmentId);

    const leadInsert = await db!.insert(leads).values({
      developmentId,
      name: `Evidence Admin Grant Lead ${suffix}`,
      email: `admin-grant-lead-${suffix}@example.com`,
      phone: '0825550300',
      leadType: 'inquiry',
      status: 'qualified',
      funnelStage: 'qualification',
      source: 'development_detail',
      leadSource: 'development_detail_contact',
    });
    const leadId = getInsertId(leadInsert);
    cleanup.leadIds.push(leadId);

    const artifactInsert = await db!.insert(dleEvidenceArtifacts).values({
      developmentId,
      transactionType: 'for_rent',
      leadId,
      artifactRole: 'proof_of_income',
      artifactType: 'uploaded_file',
      storageKey: `dle/evidence/test/development-${developmentId}/lead-${leadId}/artifact-admin-grant/proof.pdf`,
      displayName: 'Proof of income',
      description: 'Private proof document for admin policy review.',
      status: 'submitted',
      reviewOwner: 'leasing_team',
      metadata: {
        uploadStatus: 'uploaded',
        storageNamespace: 'private_dle_evidence',
        originalFilename: 'proof.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 42_000,
      },
      createdByUserId: userId,
      updatedByUserId: userId,
    });
    const artifactId = getInsertId(artifactInsert);
    cleanup.artifactIds.push(artifactId);

    const futureDate = '2037-01-01 00:00:00';
    const pastDate = '2000-01-01 00:00:00';
    const grantRows = await Promise.all([
      db!.insert(dleEvidenceArtifactAccessGrants).values({
        artifactId,
        developmentId,
        leadId,
        adminReviewItemId: 9101,
        sourceSurface: 'admin_review',
        grantedToSurface: 'admin_review',
        grantedToUserId: userId,
        grantedToRole: 'admin_reviewer',
        accessLevel: 'download',
        reasonCode: 'policy_review',
        reasonNote: 'Policy review of protected proof-of-income evidence.',
        status: 'active',
        expiresAt: futureDate,
        grantedByUserId: userId,
      }),
      db!.insert(dleEvidenceArtifactAccessGrants).values({
        artifactId,
        developmentId,
        leadId,
        adminReviewItemId: 9102,
        sourceSurface: 'admin_review',
        grantedToSurface: 'admin_review',
        grantedToUserId: userId,
        grantedToRole: 'admin_reviewer',
        accessLevel: 'metadata',
        reasonCode: 'revoked_review',
        status: 'revoked',
        grantedByUserId: userId,
        revokedByUserId: userId,
      }),
      db!.insert(dleEvidenceArtifactAccessGrants).values({
        artifactId,
        developmentId,
        leadId,
        adminReviewItemId: 9103,
        sourceSurface: 'admin_review',
        grantedToSurface: 'admin_review',
        grantedToUserId: userId,
        grantedToRole: 'admin_reviewer',
        accessLevel: 'download',
        reasonCode: 'expired_review',
        status: 'active',
        expiresAt: pastDate,
        grantedByUserId: userId,
      }),
      db!.insert(dleEvidenceArtifactAccessGrants).values({
        artifactId,
        developmentId: otherDevelopmentId,
        leadId,
        adminReviewItemId: 9104,
        sourceSurface: 'admin_review',
        grantedToSurface: 'admin_review',
        grantedToUserId: userId,
        grantedToRole: 'admin_reviewer',
        accessLevel: 'download',
        reasonCode: 'wrong_development',
        status: 'active',
        expiresAt: futureDate,
        grantedByUserId: userId,
      }),
    ]);
    cleanup.accessGrantIds.push(...grantRows.map(getInsertId));

    const persistedGrants = await db!
      .select()
      .from(dleEvidenceArtifactAccessGrants)
      .where(eq(dleEvidenceArtifactAccessGrants.artifactId, artifactId));
    const accessGrants = persistedGrants.map(buildDleEvidenceAccessGrantInput);
    const activeGrantId = getInsertId(grantRows[0]);

    const linkedDecision = buildDleEvidenceLinkageDecision({
      artifact: {
        artifactId,
        artifactDevelopmentId: developmentId,
        artifactLeadId: leadId,
        artifactDistributionDealId: null,
        artifactRole: 'proof_of_income',
      },
      requestedAccessLevel: 'download',
      accessGrants,
    });

    expect(linkedDecision).toMatchObject({
      distributionLinkage: {},
      adminReviewLinked: true,
      distributionRoleRelevant: false,
      grantIds: [activeGrantId],
    });
    expect(linkedDecision.denialReasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining('is revoked'),
        expect.stringContaining('is expired'),
        expect.stringContaining('does not belong to the evidence development'),
      ]),
    );
    expect(
      evaluateDleEvidenceAccess({
        actor: {
          actorType: 'admin_reviewer',
          userId,
          isAdmin: true,
        },
        artifact: {
          id: artifactId,
          developmentId,
          developerId,
          leadId,
          transactionType: 'for_rent',
          artifactRole: 'proof_of_income',
          artifactType: 'uploaded_file',
          status: 'submitted',
          reviewOwner: 'leasing_team',
          storageKey: `dle/evidence/test/development-${developmentId}/lead-${leadId}/artifact-admin-grant/proof.pdf`,
          externalUrl: null,
          metadata: { uploadStatus: 'uploaded' },
        },
        context: {
          accessLevel: 'download',
          sourceSurface: 'admin_review',
          adminReviewLinked: linkedDecision.adminReviewLinked,
          adminReviewReason: 'Policy review of protected proof-of-income evidence.',
          privateStorageConfigured: true,
          canWriteDownloadAudit: true,
        },
      }),
    ).toMatchObject({
      allowed: true,
      accessLevel: 'download',
      sourceSurface: 'admin_review',
    });
  });

  it('normalizes persisted distribution manager access grants through a real deal and programme without opening endpoints', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const managerInsert = await db!.insert(users).values({
      email: `dle-evidence-distribution-manager-${suffix}@example.com`,
      passwordHash: 'test-password-hash',
      role: 'super_admin',
      firstName: 'Evidence',
      lastName: 'Manager',
      name: 'Evidence Manager',
      emailVerified: 1,
    });
    const managerUserId = getInsertId(managerInsert);
    cleanup.userIds.push(managerUserId);

    const agentInsert = await db!.insert(users).values({
      email: `dle-evidence-distribution-agent-${suffix}@example.com`,
      passwordHash: 'test-password-hash',
      role: 'agent',
      firstName: 'Evidence',
      lastName: 'Agent',
      name: 'Evidence Agent',
      emailVerified: 1,
    });
    const agentUserId = getInsertId(agentInsert);
    cleanup.userIds.push(agentUserId);

    const developerInsert = await db!.insert(developers).values({
      userId: managerUserId,
      name: `Evidence Distribution Grant Developer ${suffix}`,
      email: `distribution-grant-developer-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    const developerId = getInsertId(developerInsert);
    cleanup.developerIds.push(developerId);

    const developmentInsert = await db!.insert(developments).values({
      developerId,
      name: `Evidence Distribution Grant Auction ${suffix}`,
      developmentType: 'residential',
      transactionType: 'auction',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'launching-soon',
      startingBid: '950000',
      auctionDate: '2026-09-12',
    });
    const developmentId = getInsertId(developmentInsert);
    cleanup.developmentIds.push(developmentId);

    const otherDevelopmentInsert = await db!.insert(developments).values({
      developerId,
      name: `Evidence Distribution Grant Other ${suffix}`,
      developmentType: 'residential',
      transactionType: 'auction',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'launching-soon',
      startingBid: '650000',
      auctionDate: '2026-10-12',
    });
    const otherDevelopmentId = getInsertId(otherDevelopmentInsert);
    cleanup.developmentIds.push(otherDevelopmentId);

    const programInsert = await db!.insert(distributionPrograms).values({
      developmentId,
      isActive: 1,
      isReferralEnabled: 1,
      commissionModel: 'flat_percentage',
      defaultCommissionPercent: '2.50',
      tierAccessPolicy: 'restricted',
      currencyCode: 'ZAR',
    });
    const programId = getInsertId(programInsert);
    cleanup.distributionProgramIds.push(programId);

    const dealInsert = await db!.insert(distributionDeals).values({
      programId,
      developmentId,
      agentId: agentUserId,
      managerUserId,
      buyerName: `Evidence Distribution Buyer ${suffix}`,
      buyerEmail: `distribution-buyer-${suffix}@example.com`,
      buyerPhone: '0825550310',
      currentStage: 'application_submitted',
      commissionStatus: 'not_ready',
      dealAmount: 950_000,
    });
    const dealId = getInsertId(dealInsert);
    cleanup.distributionDealIds.push(dealId);

    const leadInsert = await db!.insert(leads).values({
      developmentId,
      name: `Evidence Distribution Grant Lead ${suffix}`,
      email: `distribution-grant-lead-${suffix}@example.com`,
      phone: '0825550311',
      leadType: 'inquiry',
      status: 'qualified',
      funnelStage: 'qualification',
      source: 'development_detail',
      leadSource: 'development_detail_contact',
    });
    const leadId = getInsertId(leadInsert);
    cleanup.leadIds.push(leadId);

    const storageKey = `dle/evidence/test/development-${developmentId}/lead-${leadId}/artifact-distribution-grant/proof.pdf`;
    const artifactInsert = await db!.insert(dleEvidenceArtifacts).values({
      developmentId,
      transactionType: 'auction',
      leadId,
      artifactRole: 'proof_of_funds',
      artifactType: 'uploaded_file',
      storageKey,
      displayName: 'Proof of funds',
      description: 'Private proof document for distribution manager policy review.',
      status: 'submitted',
      reviewOwner: 'auction_team',
      metadata: {
        uploadStatus: 'uploaded',
        storageNamespace: 'private_dle_evidence',
        originalFilename: 'proof-of-funds.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 84_000,
      },
      createdByUserId: managerUserId,
      updatedByUserId: managerUserId,
    });
    const artifactId = getInsertId(artifactInsert);
    cleanup.artifactIds.push(artifactId);

    const futureDate = '2037-01-01 00:00:00';
    const pastDate = '2000-01-01 00:00:00';
    const grantRows = await Promise.all([
      db!.insert(dleEvidenceArtifactAccessGrants).values({
        artifactId,
        developmentId,
        leadId,
        distributionDealId: dealId,
        distributionProgramId: programId,
        sourceSurface: 'distribution_manager',
        grantedToSurface: 'distribution_manager',
        grantedToUserId: managerUserId,
        grantedToRole: 'distribution_manager',
        accessLevel: 'download',
        reasonCode: 'manager_review',
        reasonNote: 'Distribution manager review of proof-of-funds evidence.',
        status: 'active',
        expiresAt: futureDate,
        grantedByUserId: managerUserId,
      }),
      db!.insert(dleEvidenceArtifactAccessGrants).values({
        artifactId,
        developmentId,
        leadId,
        distributionDealId: dealId,
        distributionProgramId: programId,
        sourceSurface: 'distribution_manager',
        grantedToSurface: 'distribution_manager',
        grantedToUserId: managerUserId,
        grantedToRole: 'distribution_manager',
        accessLevel: 'metadata',
        reasonCode: 'revoked_manager_review',
        status: 'revoked',
        grantedByUserId: managerUserId,
        revokedByUserId: managerUserId,
      }),
      db!.insert(dleEvidenceArtifactAccessGrants).values({
        artifactId,
        developmentId,
        leadId,
        distributionDealId: dealId,
        distributionProgramId: programId,
        sourceSurface: 'distribution_manager',
        grantedToSurface: 'distribution_manager',
        grantedToUserId: managerUserId,
        grantedToRole: 'distribution_manager',
        accessLevel: 'download',
        reasonCode: 'expired_manager_review',
        status: 'active',
        expiresAt: pastDate,
        grantedByUserId: managerUserId,
      }),
      db!.insert(dleEvidenceArtifactAccessGrants).values({
        artifactId,
        developmentId: otherDevelopmentId,
        leadId,
        distributionDealId: dealId,
        distributionProgramId: programId,
        sourceSurface: 'distribution_manager',
        grantedToSurface: 'distribution_manager',
        grantedToUserId: managerUserId,
        grantedToRole: 'distribution_manager',
        accessLevel: 'download',
        reasonCode: 'wrong_development_manager_review',
        status: 'active',
        expiresAt: futureDate,
        grantedByUserId: managerUserId,
      }),
    ]);
    cleanup.accessGrantIds.push(...grantRows.map(getInsertId));

    const persistedGrants = await db!
      .select()
      .from(dleEvidenceArtifactAccessGrants)
      .where(eq(dleEvidenceArtifactAccessGrants.artifactId, artifactId));
    const accessGrants = persistedGrants.map(buildDleEvidenceAccessGrantInput);
    const activeGrantId = getInsertId(grantRows[0]);

    const linkedDecision = buildDleEvidenceLinkageDecision({
      artifact: {
        artifactId,
        artifactDevelopmentId: developmentId,
        artifactLeadId: leadId,
        artifactDistributionDealId: null,
        artifactRole: 'proof_of_funds',
      },
      distributionDeal: {
        dealId,
        developmentId,
        programmeId: programId,
        managerHasActiveAccess: true,
        roleRelevant: true,
      },
      requestedAccessLevel: 'download',
      accessGrants,
    });

    expect(linkedDecision).toMatchObject({
      distributionLinkage: {
        accessGrantRecorded: true,
        dealLinked: true,
        programmeRoleMappedAndShared: true,
      },
      adminReviewLinked: false,
      distributionRoleRelevant: true,
      grantIds: [activeGrantId],
    });
    expect(linkedDecision.denialReasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining('is revoked'),
        expect.stringContaining('is expired'),
        expect.stringContaining('does not belong to the evidence development'),
      ]),
    );
    expect(
      evaluateDleEvidenceAccess({
        actor: {
          actorType: 'distribution_manager',
          userId: managerUserId,
          managerId: managerUserId,
          hasActiveManagerAccess: true,
        },
        artifact: {
          id: artifactId,
          developmentId,
          developerId,
          leadId,
          transactionType: 'auction',
          artifactRole: 'proof_of_funds',
          artifactType: 'uploaded_file',
          status: 'submitted',
          reviewOwner: 'auction_team',
          storageKey,
          externalUrl: null,
          metadata: { uploadStatus: 'uploaded' },
        },
        context: {
          accessLevel: 'download',
          sourceSurface: 'distribution_manager',
          distributionLinkage: linkedDecision.distributionLinkage,
          distributionRoleRelevant: linkedDecision.distributionRoleRelevant,
          privateStorageConfigured: true,
          canWriteDownloadAudit: true,
        },
      }),
    ).toMatchObject({
      allowed: true,
      accessLevel: 'download',
      sourceSurface: 'distribution_manager',
    });
  });

  it('creates developer-only upload intents with private storage metadata and no lead mutation', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const userInsert = await db!.insert(users).values({
      email: `dle-evidence-upload-${suffix}@example.com`,
      passwordHash: 'test-password-hash',
      role: 'property_developer',
      firstName: 'Evidence',
      lastName: 'Uploader',
      name: 'Evidence Uploader',
      emailVerified: 1,
    });
    const userId = getInsertId(userInsert);
    cleanup.userIds.push(userId);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `Evidence Upload Developer ${suffix}`,
      email: `developer-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    const developerId = getInsertId(developerInsert);
    cleanup.developerIds.push(developerId);

    const developmentInsert = await db!.insert(developments).values({
      developerId,
      name: `Evidence Upload Rental ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_rent',
      city: 'Cape Town',
      province: 'Western Cape',
      status: 'launching-soon',
      monthlyRentFrom: '12000',
      monthlyRentTo: '14000',
    });
    const developmentId = getInsertId(developmentInsert);
    cleanup.developmentIds.push(developmentId);

    const leadInsert = await db!.insert(leads).values({
      developmentId,
      name: `Evidence Upload Lead ${suffix}`,
      email: `lead-${suffix}@example.com`,
      phone: '0825550301',
      leadType: 'inquiry',
      status: 'qualified',
      funnelStage: 'qualification',
      source: 'development_detail',
      leadSource: 'development_detail_contact',
    });
    const leadId = getInsertId(leadInsert);
    cleanup.leadIds.push(leadId);

    const [leadBefore] = await db!.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    const result = await createLeadEvidenceFileUploadIntent({
      developerId,
      userId,
      leadId,
      artifactRole: 'proof_of_income',
      filename: 'June payslip.pdf',
      contentType: 'application/pdf',
      fileSizeBytes: 512_000,
      displayName: 'June payslip',
      description: 'Applicant payslip for manual review.',
    });
    cleanup.artifactIds.push(result.artifact.id);

    expect(result).toMatchObject({
      uploadUrl: null,
      uploadExpiresInSeconds: null,
      uploadUnavailableReason: 'Private evidence upload storage is not configured in this environment.',
    });
    expect(result).not.toHaveProperty('publicUrl');
    expect(result.uploadToken).toEqual(expect.any(String));
    expect(result.artifact).toMatchObject({
      developmentId,
      transactionType: 'for_rent',
      leadId,
      artifactRole: 'proof_of_income',
      artifactType: 'uploaded_file',
      displayName: 'June payslip',
      description: 'Applicant payslip for manual review.',
      status: 'requested',
      reviewOwner: 'leasing_team',
    });

    const [artifactRow] = await db!
      .select()
      .from(dleEvidenceArtifacts)
      .where(eq(dleEvidenceArtifacts.id, result.artifact.id))
      .limit(1);
    expect(artifactRow.storageKey).toContain(
      `dle/evidence/test/development-${developmentId}/lead-${leadId}/artifact-${result.artifact.id}/`,
    );
    expect(artifactRow.storageKey).not.toContain('properties/');
    expect(artifactRow.externalUrl).toBeNull();
    expect(artifactRow.metadata).toMatchObject({
      uploadStatus: 'pending_upload',
      storageNamespace: 'private_dle_evidence',
      originalFilename: 'June-payslip.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 512_000,
    });
    const listedArtifacts = await listLeadEvidenceArtifacts({
      developerId,
      leadId,
    });
    expect(listedArtifacts.items[0]).toMatchObject({
      id: result.artifact.id,
      artifactType: 'uploaded_file',
      file: {
        originalFilename: 'June-payslip.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 512_000,
        uploadStatus: 'pending_upload',
        downloadCount: 0,
        isDownloadable: false,
      },
    });
    expect(listedArtifacts.items[0]).not.toHaveProperty('storageKey');
    expect(listedArtifacts.items[0]).not.toHaveProperty('externalUrl');

    const [leadAfter] = await db!.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    expect(leadAfter.status).toBe(leadBefore.status);
    expect(leadAfter.funnelStage).toBe(leadBefore.funnelStage);
  });

  it('does not submit uploaded-file evidence when private storage cannot be verified', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const userInsert = await db!.insert(users).values({
      email: `dle-evidence-complete-${suffix}@example.com`,
      passwordHash: 'test-password-hash',
      role: 'property_developer',
      firstName: 'Evidence',
      lastName: 'Verifier',
      name: 'Evidence Verifier',
      emailVerified: 1,
    });
    const userId = getInsertId(userInsert);
    cleanup.userIds.push(userId);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `Evidence Completion Developer ${suffix}`,
      email: `completion-developer-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    const developerId = getInsertId(developerInsert);
    cleanup.developerIds.push(developerId);

    const developmentInsert = await db!.insert(developments).values({
      developerId,
      name: `Evidence Completion Auction ${suffix}`,
      developmentType: 'residential',
      transactionType: 'auction',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'launching-soon',
      startingBid: '850000',
      auctionDate: '2026-08-22',
    });
    const developmentId = getInsertId(developmentInsert);
    cleanup.developmentIds.push(developmentId);

    const leadInsert = await db!.insert(leads).values({
      developmentId,
      name: `Evidence Completion Lead ${suffix}`,
      email: `completion-lead-${suffix}@example.com`,
      phone: '0825550302',
      leadType: 'inquiry',
      status: 'qualified',
      funnelStage: 'qualification',
      source: 'development_detail',
      leadSource: 'development_detail_contact',
    });
    const leadId = getInsertId(leadInsert);
    cleanup.leadIds.push(leadId);

    const intent = await createLeadEvidenceFileUploadIntent({
      developerId,
      userId,
      leadId,
      artifactRole: 'proof_of_funds',
      filename: 'Proof of funds.pdf',
      contentType: 'application/pdf',
      fileSizeBytes: 750_000,
      displayName: 'Proof of funds',
    });
    cleanup.artifactIds.push(intent.artifact.id);

    await expect(
      completeLeadEvidenceFileUpload({
        developerId,
        userId,
        artifactId: intent.artifact.id,
        uploadToken: intent.uploadToken,
      }),
    ).rejects.toThrow(
      'Private evidence upload storage is not configured; upload completion cannot be verified.',
    );

    const [artifactRow] = await db!
      .select()
      .from(dleEvidenceArtifacts)
      .where(eq(dleEvidenceArtifacts.id, intent.artifact.id))
      .limit(1);
    expect(artifactRow.status).toBe('requested');
    expect(artifactRow.externalUrl).toBeNull();
    expect(artifactRow.metadata).toMatchObject({
      uploadStatus: 'pending_upload',
      storageNamespace: 'private_dle_evidence',
    });

    const [leadAfter] = await db!.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    expect(leadAfter.status).toBe('qualified');
    expect(leadAfter.funnelStage).toBe('qualification');
  });

  it('does not issue download URLs for pending evidence uploads', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const userInsert = await db!.insert(users).values({
      email: `dle-evidence-pending-download-${suffix}@example.com`,
      passwordHash: 'test-password-hash',
      role: 'property_developer',
      firstName: 'Evidence',
      lastName: 'Pending',
      name: 'Evidence Pending',
      emailVerified: 1,
    });
    const userId = getInsertId(userInsert);
    cleanup.userIds.push(userId);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `Evidence Pending Download Developer ${suffix}`,
      email: `pending-download-developer-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    const developerId = getInsertId(developerInsert);
    cleanup.developerIds.push(developerId);

    const developmentInsert = await db!.insert(developments).values({
      developerId,
      name: `Evidence Pending Download Rental ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_rent',
      city: 'Cape Town',
      province: 'Western Cape',
      status: 'launching-soon',
      monthlyRentFrom: '13000',
      monthlyRentTo: '15000',
    });
    const developmentId = getInsertId(developmentInsert);
    cleanup.developmentIds.push(developmentId);

    const leadInsert = await db!.insert(leads).values({
      developmentId,
      name: `Evidence Pending Download Lead ${suffix}`,
      email: `pending-download-lead-${suffix}@example.com`,
      phone: '0825550303',
      leadType: 'inquiry',
      status: 'new',
      funnelStage: 'qualification',
      source: 'development_detail',
      leadSource: 'development_detail_contact',
    });
    const leadId = getInsertId(leadInsert);
    cleanup.leadIds.push(leadId);

    const intent = await createLeadEvidenceFileUploadIntent({
      developerId,
      userId,
      leadId,
      artifactRole: 'proof_of_income',
      filename: 'Pending payslip.pdf',
      contentType: 'application/pdf',
      fileSizeBytes: 640_000,
    });
    cleanup.artifactIds.push(intent.artifact.id);

    await expect(
      getLeadEvidenceFileDownloadUrl({
        developerId,
        userId,
        artifactId: intent.artifact.id,
      }),
    ).rejects.toThrow(
      'Evidence file is not available for download until upload completion is verified.',
    );

    const [artifactRow] = await db!
      .select()
      .from(dleEvidenceArtifacts)
      .where(eq(dleEvidenceArtifacts.id, intent.artifact.id))
      .limit(1);
    expect(artifactRow.status).toBe('requested');
    expect(artifactRow.metadata).toMatchObject({
      uploadStatus: 'pending_upload',
    });
    expect(artifactRow.metadata).not.toMatchObject({
      lastDownloadRequestedByUserId: userId,
    });
  });

  it('does not issue download URLs when private download storage is not configured', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const userInsert = await db!.insert(users).values({
      email: `dle-evidence-download-${suffix}@example.com`,
      passwordHash: 'test-password-hash',
      role: 'property_developer',
      firstName: 'Evidence',
      lastName: 'Downloader',
      name: 'Evidence Downloader',
      emailVerified: 1,
    });
    const userId = getInsertId(userInsert);
    cleanup.userIds.push(userId);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `Evidence Download Developer ${suffix}`,
      email: `download-developer-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    const developerId = getInsertId(developerInsert);
    cleanup.developerIds.push(developerId);

    const developmentInsert = await db!.insert(developments).values({
      developerId,
      name: `Evidence Download Auction ${suffix}`,
      developmentType: 'residential',
      transactionType: 'auction',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'launching-soon',
      startingBid: '950000',
      auctionDate: '2026-09-12',
    });
    const developmentId = getInsertId(developmentInsert);
    cleanup.developmentIds.push(developmentId);

    const leadInsert = await db!.insert(leads).values({
      developmentId,
      name: `Evidence Download Lead ${suffix}`,
      email: `download-lead-${suffix}@example.com`,
      phone: '0825550304',
      leadType: 'inquiry',
      status: 'qualified',
      funnelStage: 'qualification',
      source: 'development_detail',
      leadSource: 'development_detail_contact',
    });
    const leadId = getInsertId(leadInsert);
    cleanup.leadIds.push(leadId);

    const intent = await createLeadEvidenceFileUploadIntent({
      developerId,
      userId,
      leadId,
      artifactRole: 'proof_of_funds',
      filename: 'Proof of funds.pdf',
      contentType: 'application/pdf',
      fileSizeBytes: 700_000,
    });
    cleanup.artifactIds.push(intent.artifact.id);

    const [artifactBefore] = await db!
      .select()
      .from(dleEvidenceArtifacts)
      .where(eq(dleEvidenceArtifacts.id, intent.artifact.id))
      .limit(1);
    await db!
      .update(dleEvidenceArtifacts)
      .set({
        status: 'submitted',
        metadata: {
          ...(artifactBefore.metadata as Record<string, unknown>),
          uploadStatus: 'uploaded',
          uploadedByUserId: userId,
          uploadedAt: new Date().toISOString(),
        },
      })
      .where(eq(dleEvidenceArtifacts.id, intent.artifact.id));

    await expect(
      getLeadEvidenceFileDownloadUrl({
        developerId,
        userId,
        artifactId: intent.artifact.id,
      }),
    ).rejects.toThrow(
      'Private evidence download storage is not configured; download URL cannot be issued.',
    );

    const [artifactAfter] = await db!
      .select()
      .from(dleEvidenceArtifacts)
      .where(eq(dleEvidenceArtifacts.id, intent.artifact.id))
      .limit(1);
    expect(artifactAfter.externalUrl).toBeNull();
    expect(artifactAfter.metadata).toMatchObject({
      uploadStatus: 'uploaded',
      storageNamespace: 'private_dle_evidence',
    });
    expect(artifactAfter.metadata).not.toMatchObject({
      lastDownloadRequestedByUserId: userId,
    });
    const listedArtifacts = await listLeadEvidenceArtifacts({
      developerId,
      leadId,
    });
    expect(listedArtifacts.items[0]).toMatchObject({
      id: intent.artifact.id,
      artifactType: 'uploaded_file',
      status: 'submitted',
      file: {
        originalFilename: 'Proof-of-funds.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 700_000,
        uploadStatus: 'uploaded',
        uploadedByUserId: userId,
        downloadCount: 0,
        isDownloadable: true,
      },
    });
    expect(listedArtifacts.items[0]).not.toHaveProperty('storageKey');
    expect(listedArtifacts.items[0]).not.toHaveProperty('externalUrl');
    const downloadEvents = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(
        and(
          eq(developmentOperatingEvents.developmentId, developmentId),
          eq(developmentOperatingEvents.leadId, leadId),
          eq(developmentOperatingEvents.eventType, 'evidence_artifact_downloaded'),
        ),
      );
    expect(downloadEvents).toHaveLength(0);

    const [leadAfter] = await db!.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    expect(leadAfter.status).toBe('qualified');
    expect(leadAfter.funnelStage).toBe('qualification');
  });

  it('does not issue download URLs for uploaded evidence with a public external URL', async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const userInsert = await db!.insert(users).values({
      email: `dle-evidence-public-url-${suffix}@example.com`,
      passwordHash: 'test-password-hash',
      role: 'property_developer',
      firstName: 'Evidence',
      lastName: 'PublicUrl',
      name: 'Evidence PublicUrl',
      emailVerified: 1,
    });
    const userId = getInsertId(userInsert);
    cleanup.userIds.push(userId);

    const developerInsert = await db!.insert(developers).values({
      userId,
      name: `Evidence Public Url Developer ${suffix}`,
      email: `public-url-developer-${suffix}@example.com`,
      category: 'residential',
      status: 'approved',
      isVerified: 1,
    });
    const developerId = getInsertId(developerInsert);
    cleanup.developerIds.push(developerId);

    const developmentInsert = await db!.insert(developments).values({
      developerId,
      name: `Evidence Public Url Rental ${suffix}`,
      developmentType: 'residential',
      transactionType: 'for_rent',
      city: 'Cape Town',
      province: 'Western Cape',
      status: 'launching-soon',
      monthlyRentFrom: '16000',
      monthlyRentTo: '18000',
    });
    const developmentId = getInsertId(developmentInsert);
    cleanup.developmentIds.push(developmentId);

    const leadInsert = await db!.insert(leads).values({
      developmentId,
      name: `Evidence Public Url Lead ${suffix}`,
      email: `public-url-lead-${suffix}@example.com`,
      phone: '0825550305',
      leadType: 'inquiry',
      status: 'qualified',
      funnelStage: 'qualification',
      source: 'development_detail',
      leadSource: 'development_detail_contact',
    });
    const leadId = getInsertId(leadInsert);
    cleanup.leadIds.push(leadId);

    const intent = await createLeadEvidenceFileUploadIntent({
      developerId,
      userId,
      leadId,
      artifactRole: 'proof_of_income',
      filename: 'Uploaded payslip.pdf',
      contentType: 'application/pdf',
      fileSizeBytes: 620_000,
    });
    cleanup.artifactIds.push(intent.artifact.id);

    const [artifactBefore] = await db!
      .select()
      .from(dleEvidenceArtifacts)
      .where(eq(dleEvidenceArtifacts.id, intent.artifact.id))
      .limit(1);
    await db!
      .update(dleEvidenceArtifacts)
      .set({
        status: 'submitted',
        externalUrl: 'https://cdn.example.test/evidence/uploaded-payslip.pdf',
        metadata: {
          ...(artifactBefore.metadata as Record<string, unknown>),
          uploadStatus: 'uploaded',
          uploadedByUserId: userId,
          uploadedAt: new Date().toISOString(),
        },
      })
      .where(eq(dleEvidenceArtifacts.id, intent.artifact.id));

    await expect(
      getLeadEvidenceFileDownloadUrl({
        developerId,
        userId,
        artifactId: intent.artifact.id,
      }),
    ).rejects.toThrow('Uploaded evidence artifacts must not use public external URLs.');

    const [artifactAfter] = await db!
      .select()
      .from(dleEvidenceArtifacts)
      .where(eq(dleEvidenceArtifacts.id, intent.artifact.id))
      .limit(1);
    expect(artifactAfter.externalUrl).toBe(
      'https://cdn.example.test/evidence/uploaded-payslip.pdf',
    );
    expect(artifactAfter.metadata).toMatchObject({
      uploadStatus: 'uploaded',
      storageNamespace: 'private_dle_evidence',
    });
    expect(artifactAfter.metadata).not.toMatchObject({
      lastDownloadRequestedByUserId: userId,
    });

    const downloadEvents = await db!
      .select()
      .from(developmentOperatingEvents)
      .where(
        and(
          eq(developmentOperatingEvents.developmentId, developmentId),
          eq(developmentOperatingEvents.leadId, leadId),
          eq(developmentOperatingEvents.eventType, 'evidence_artifact_downloaded'),
        ),
      );
    expect(downloadEvents).toHaveLength(0);

    const [leadAfter] = await db!.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    expect(leadAfter.status).toBe('qualified');
    expect(leadAfter.funnelStage).toBe('qualification');
  });
});
