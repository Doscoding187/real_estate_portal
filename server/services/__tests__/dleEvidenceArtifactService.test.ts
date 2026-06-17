import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { developers, developments, dleEvidenceArtifacts, leads, users } from '../../../drizzle/schema';
import { getDb } from '../../db-connection';
import {
  assertEvidenceArtifactReviewTransition,
  assertEvidenceRoleForTransaction,
  buildDevelopmentEvidenceCoverageSummary,
  buildEvidenceUploadToken,
  buildLeadEvidenceCoverageSummary,
  buildPrivateEvidenceStorageKey,
  completeLeadEvidenceFileUpload,
  createLeadEvidenceFileUploadIntent,
  getDefaultReviewOwnerForEvidence,
  getEvidenceArtifactEventType,
  getEvidenceArtifactReviewEventType,
  getLeadEvidenceFileDownloadUrl,
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
    leadIds: number[];
    artifactIds: number[];
  } = {
    userIds: [],
    developerIds: [],
    developmentIds: [],
    leadIds: [],
    artifactIds: [],
  };

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    for (const artifactId of cleanup.artifactIds.reverse()) {
      await db.delete(dleEvidenceArtifacts).where(eq(dleEvidenceArtifacts.id, artifactId));
    }
    for (const leadId of cleanup.leadIds.reverse()) {
      await db.delete(leads).where(eq(leads.id, leadId));
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

    const [leadAfter] = await db!.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    expect(leadAfter.status).toBe('qualified');
    expect(leadAfter.funnelStage).toBe('qualification');
  });
});
