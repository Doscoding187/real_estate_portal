import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { eq, inArray, sql } from 'drizzle-orm';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import {
  cataloguePublishers,
  developerOrganisationMemberships,
  developerOrganisations,
  developmentRequiredDocuments,
  developments,
  distributionDealDocumentDeliveries,
  distributionDealDocuments,
  distributionDeals,
  distributionIdentities,
  distributionManagerAssignments,
  distributionPrograms,
  users,
} from '../../drizzle/schema';
import {
  deleteDistributionDealDocument,
  parseDistributionDealDocumentReference,
} from '../services/distributionReferralEvidenceStorage';

const hasDb = Boolean(process.env.DATABASE_URL);
vi.setConfig({ testTimeout: 30000 });
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL test DB)`, fn)) as typeof describe);

const createdState = {
  deliveryIds: [] as number[],
  dealDocumentIds: [] as number[],
  dealIds: [] as number[],
  templateIds: [] as number[],
  assignmentIds: [] as number[],
  programIds: [] as number[],
  identityIds: [] as number[],
  developmentIds: [] as number[],
  publisherIds: [] as number[],
  organisationIds: [] as number[],
  membershipIds: [] as number[],
  userIds: [] as number[],
};

function uniqueIds(ids: number[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function buildCaller(userId: number, role: 'visitor' | 'property_developer' | 'super_admin') {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: userId, role },
  } as any);
}

async function insertUser(
  emailPrefix: string,
  role: 'visitor' | 'property_developer' | 'super_admin',
  name: string,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${emailPrefix}-${suffix}@example.com`;
  await db.execute(sql`
    INSERT INTO users (email, role, firstName, lastName, name, emailVerified)
    VALUES (${email}, ${role}, ${name.split(' ')[0]}, ${name.split(' ').slice(1).join(' ')}, ${name}, ${1})
  `);
  const [created] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const userId = Number(created?.id || 0);
  createdState.userIds.push(userId);
  return userId;
}

async function insertManagerIdentity(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(distributionIdentities).values({
    userId,
    identityType: 'manager',
    active: 1,
    displayName: `Manager ${userId}`,
  });
  const id = Number((result as any).insertId || 0);
  createdState.identityIds.push(id);
  return id;
}

async function insertDeveloperMembership(input: {
  organisationId: number;
  userId: number;
  status?: 'active' | 'invited' | 'suspended';
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(developerOrganisationMemberships).values({
    organisationId: input.organisationId,
    userId: input.userId,
    role: 'sales_manager',
    status: input.status || 'active',
  });
  const id = Number((result as any).insertId || 0);
  createdState.membershipIds.push(id);
  return id;
}

async function seedDeliveryScenario(
  options: { organisationStatus?: 'pending' | 'approved' | 'rejected' } = {},
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const managerUserId = await insertUser('delivery-manager', 'visitor', 'Delivery Manager');
  await insertManagerIdentity(managerUserId);

  const developerUserId = await insertUser(
    'delivery-developer',
    'property_developer',
    'Developer Member',
  );
  const outsiderUserId = await insertUser(
    'delivery-outsider',
    'property_developer',
    'Outsider Developer',
  );
  const visitorUserId = await insertUser('delivery-visitor', 'visitor', 'Delivery Visitor');

  const [organisationInsert] = await db.insert(developerOrganisations).values({
    name: `Delivery Developer ${suffix}`,
    slug: `delivery-developer-${suffix}`,
    status: options.organisationStatus || 'approved',
  });
  const organisationId = Number((organisationInsert as any).insertId || 0);
  createdState.organisationIds.push(organisationId);

  const [outsiderOrganisationInsert] = await db.insert(developerOrganisations).values({
    name: `Outsider Developer ${suffix}`,
    slug: `outsider-developer-${suffix}`,
    status: 'approved',
  });
  const outsiderOrganisationId = Number((outsiderOrganisationInsert as any).insertId || 0);
  createdState.organisationIds.push(outsiderOrganisationId);

  await insertDeveloperMembership({ organisationId, userId: developerUserId });
  await insertDeveloperMembership({
    organisationId: outsiderOrganisationId,
    userId: outsiderUserId,
  });

  const [publisherInsert] = await db.insert(cataloguePublishers).values({
    authorityKind: 'developer_first_party',
    publisherType: 'developer',
    developerOrganisationId: organisationId,
    name: `Delivery Publisher ${suffix}`,
    slug: `delivery-publisher-${suffix}`,
  } as any);
  const publisherId = Number((publisherInsert as any).insertId || 0);
  createdState.publisherIds.push(publisherId);

  const [outsiderPublisherInsert] = await db.insert(cataloguePublishers).values({
    authorityKind: 'developer_first_party',
    publisherType: 'developer',
    developerOrganisationId: outsiderOrganisationId,
    name: `Outsider Publisher ${suffix}`,
    slug: `outsider-publisher-${suffix}`,
  } as any);
  createdState.publisherIds.push(Number((outsiderPublisherInsert as any).insertId || 0));

  const [developmentInsert] = await db.insert(developments).values({
    name: `Delivery Development ${suffix}`,
    developmentType: 'residential',
    city: 'Johannesburg',
    province: 'Gauteng',
    isPublished: 1,
    approvalStatus: 'approved',
    cataloguePublisherId: publisherId,
  } as any);
  const developmentId = Number((developmentInsert as any).insertId || 0);
  createdState.developmentIds.push(developmentId);

  const [programInsert] = await db.insert(distributionPrograms).values({
    developmentId,
    isActive: 1,
    isReferralEnabled: 0,
    commissionModel: 'flat_percentage',
    defaultCommissionPercent: 2.5,
    tierAccessPolicy: 'restricted',
    payoutMilestone: 'bond_approval',
    currencyCode: 'ZAR',
  });
  const programId = Number((programInsert as any).insertId || 0);
  createdState.programIds.push(programId);

  const [assignmentInsert] = await db.insert(distributionManagerAssignments).values({
    developmentId,
    managerUserId,
    isPrimary: 1,
    isActive: 1,
    assignedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    workloadCapacity: 0,
    timezone: null,
  });
  const assignmentId = Number((assignmentInsert as any).insertId || 0);
  createdState.assignmentIds.push(assignmentId);

  const templateIds: number[] = [];
  for (let index = 0; index < 2; index += 1) {
    const [templateInsert] = await db.insert(developmentRequiredDocuments).values({
      developmentId,
      documentCode: index === 0 ? ('id_document' as any) : ('proof_of_address' as any),
      documentLabel: `Delivery requirement ${index + 1}`,
      isRequired: 1,
      sortOrder: index,
      isActive: 1,
    });
    const templateId = Number((templateInsert as any).insertId || 0);
    templateIds.push(templateId);
    createdState.templateIds.push(templateId);
  }

  const terms = {
    version: 2,
    marketMode: 'sale',
    developmentId,
    program: {
      referrerCommissionType: 'flat',
      referrerCommissionValue: 1000,
      currencyCode: 'ZAR',
      payoutMilestone: 'bond_approval',
    },
    requiredDocuments: templateIds.map((templateId, index) => ({
      templateId,
      documentCode: index === 0 ? 'id_document' : 'proof_of_address',
      documentLabel: `Delivery requirement ${index + 1}`,
      category: 'client_required_document',
      isRequired: true,
      sortOrder: index,
    })),
  };
  const termsDigest = createHash('sha256').update(canonicalJson(terms), 'utf8').digest('hex');

  const [dealInsert] = await db.insert(distributionDeals).values({
    programId,
    developmentId,
    agentId: managerUserId,
    managerUserId,
    buyerName: 'Delivery Buyer',
    marketMode: 'sale',
    referralTermsSnapshotJson: { ...terms, digest: termsDigest },
    referralTermsSnapshotDigest: termsDigest,
  });
  const dealId = Number((dealInsert as any).insertId || 0);
  createdState.dealIds.push(dealId);

  await db.insert(distributionDealDocuments).values(
    templateIds.map(templateId => ({
      dealId,
      developmentRequiredDocumentId: templateId,
      status: 'pending' as const,
    })),
  );

  return {
    managerUserId,
    developerUserId,
    outsiderUserId,
    visitorUserId,
    organisationId,
    outsiderOrganisationId,
    developmentId,
    dealId,
    templateIds,
  };
}

async function uploadAndVerify(
  seed: Awaited<ReturnType<typeof seedDeliveryScenario>>,
  templateId: number,
  fileName: string,
) {
  const managerCaller = buildCaller(seed.managerUserId, 'visitor');
  const buffer = Buffer.from(`%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n${fileName}\n`);
  await managerCaller.distribution.manager.uploadDealDocument({
    dealId: seed.dealId,
    templateId,
    file: {
      fileName,
      mimeType: 'application/pdf',
      byteSize: buffer.length,
      base64Content: buffer.toString('base64'),
    },
  });
  await managerCaller.distribution.manager.updateDealDocumentStatus({
    dealId: seed.dealId,
    templateId,
    status: 'verified',
  });
  return buffer;
}

describeWithDb('distribution developer document delivery integration', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    const dealIds = uniqueIds(createdState.dealIds);
    if (dealIds.length) {
      const storedRows = await db
        .select({ submittedFileUrl: distributionDealDocuments.submittedFileUrl })
        .from(distributionDealDocuments)
        .where(inArray(distributionDealDocuments.dealId, dealIds));
      for (const row of storedRows) {
        const reference = parseDistributionDealDocumentReference(row.submittedFileUrl);
        if (reference) await deleteDistributionDealDocument(reference).catch(() => undefined);
      }
    }

    if (dealIds.length) {
      await db
        .delete(distributionDealDocumentDeliveries)
        .where(inArray(distributionDealDocumentDeliveries.dealId, dealIds));
    }
    const dealDocumentIds = uniqueIds(createdState.dealDocumentIds);
    if (dealDocumentIds.length) {
      await db
        .delete(distributionDealDocuments)
        .where(inArray(distributionDealDocuments.id, dealDocumentIds));
    }
    if (dealIds.length) {
      await db.delete(distributionDeals).where(inArray(distributionDeals.id, dealIds));
    }
    const templateIds = uniqueIds(createdState.templateIds);
    if (templateIds.length) {
      await db
        .delete(developmentRequiredDocuments)
        .where(inArray(developmentRequiredDocuments.id, templateIds));
    }
    const assignmentIds = uniqueIds(createdState.assignmentIds);
    if (assignmentIds.length) {
      await db
        .delete(distributionManagerAssignments)
        .where(inArray(distributionManagerAssignments.id, assignmentIds));
    }
    const programIds = uniqueIds(createdState.programIds);
    if (programIds.length) {
      await db.delete(distributionPrograms).where(inArray(distributionPrograms.id, programIds));
    }
    const developmentIds = uniqueIds(createdState.developmentIds);
    if (developmentIds.length) {
      await db.delete(developments).where(inArray(developments.id, developmentIds));
    }
    const publisherIds = uniqueIds(createdState.publisherIds);
    if (publisherIds.length) {
      await db.delete(cataloguePublishers).where(inArray(cataloguePublishers.id, publisherIds));
    }
    const membershipIds = uniqueIds(createdState.membershipIds);
    if (membershipIds.length) {
      await db
        .delete(developerOrganisationMemberships)
        .where(inArray(developerOrganisationMemberships.id, membershipIds));
    }
    const organisationIds = uniqueIds(createdState.organisationIds);
    if (organisationIds.length) {
      await db
        .delete(developerOrganisations)
        .where(inArray(developerOrganisations.id, organisationIds));
    }
    const identityIds = uniqueIds(createdState.identityIds);
    if (identityIds.length) {
      await db
        .delete(distributionIdentities)
        .where(inArray(distributionIdentities.id, identityIds));
    }
    const userIds = uniqueIds(createdState.userIds);
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));

    createdState.deliveryIds = [];
    createdState.dealDocumentIds = [];
    createdState.dealIds = [];
    createdState.templateIds = [];
    createdState.assignmentIds = [];
    createdState.programIds = [];
    createdState.identityIds = [];
    createdState.developmentIds = [];
    createdState.publisherIds = [];
    createdState.organisationIds = [];
    createdState.membershipIds = [];
    createdState.userIds = [];
  });

  it('delivers a verified file, records acknowledgement, and versions replacements', async () => {
    const seed = await seedDeliveryScenario();
    const managerCaller = buildCaller(seed.managerUserId, 'visitor');
    const developerCaller = buildCaller(seed.developerUserId, 'property_developer');
    const firstFile = await uploadAndVerify(seed, seed.templateIds[0], 'buyer-id.pdf');

    const firstDelivery = await managerCaller.distribution.manager.deliverDealDocument({
      dealId: seed.dealId,
      templateId: seed.templateIds[0],
    });
    expect(firstDelivery).toMatchObject({
      deliveryVersion: 1,
      developerOrganisationId: seed.organisationId,
      documentLabel: 'Delivery requirement 1',
    });
    createdState.deliveryIds.push(firstDelivery.deliveryId);

    const repeatDelivery = await managerCaller.distribution.manager.deliverDealDocument({
      dealId: seed.dealId,
      templateId: seed.templateIds[0],
    });
    expect(repeatDelivery.deliveryId).toBe(firstDelivery.deliveryId);
    expect(repeatDelivery.deliveryVersion).toBe(1);

    const checklist = await managerCaller.distribution.manager.getDealChecklist({
      dealId: seed.dealId,
    });
    const deliveredDocument = checklist.requiredDocuments.find(
      document => Number(document.templateId) === seed.templateIds[0],
    );
    expect(deliveredDocument?.delivery).toMatchObject({
      deliveryId: firstDelivery.deliveryId,
      deliveryVersion: 1,
      isCurrentFile: true,
      acknowledgedAt: null,
    });

    const inbox = await developerCaller.distribution.developer.listDocumentDeliveries({
      limit: 50,
    });
    expect(inbox.deliveries).toHaveLength(1);
    expect(inbox.deliveries[0]).toMatchObject({
      deliveryId: firstDelivery.deliveryId,
      dealId: seed.dealId,
      developmentId: seed.developmentId,
      documentLabel: 'Delivery requirement 1',
      fileName: 'buyer-id.pdf',
    });
    expect(inbox.awaitingAcknowledgementCount).toBe(1);

    const downloaded = await developerCaller.distribution.developer.downloadDocumentDelivery({
      deliveryId: firstDelivery.deliveryId,
    });
    expect(Buffer.from(downloaded.base64Content, 'base64')).toEqual(firstFile);

    const acknowledgement =
      await developerCaller.distribution.developer.acknowledgeDocumentDelivery({
        deliveryId: firstDelivery.deliveryId,
        note: 'Received by sales team',
      });
    expect(acknowledgement.alreadyAcknowledged).toBe(false);
    expect(acknowledgement.acknowledgedAt).toBeTruthy();

    const repeatAcknowledgement =
      await developerCaller.distribution.developer.acknowledgeDocumentDelivery({
        deliveryId: firstDelivery.deliveryId,
      });
    expect(repeatAcknowledgement.alreadyAcknowledged).toBe(true);

    const acknowledgedChecklist = await managerCaller.distribution.manager.getDealChecklist({
      dealId: seed.dealId,
    });
    const acknowledgedDocument = acknowledgedChecklist.requiredDocuments.find(
      document => Number(document.templateId) === seed.templateIds[0],
    );
    expect(acknowledgedDocument?.delivery).toMatchObject({
      acknowledgedBy: { userId: seed.developerUserId },
      acknowledgementNote: 'Received by sales team',
    });

    await managerCaller.distribution.manager.updateDealDocumentStatus({
      dealId: seed.dealId,
      templateId: seed.templateIds[0],
      status: 'received',
    });
    const revisedFile = await uploadAndVerify(seed, seed.templateIds[0], 'buyer-id-revised.pdf');

    const downloadedDeliveredFile =
      await developerCaller.distribution.developer.downloadDocumentDelivery({
        deliveryId: firstDelivery.deliveryId,
      });
    expect(Buffer.from(downloadedDeliveredFile.base64Content, 'base64')).toEqual(firstFile);

    const replacement = await managerCaller.distribution.manager.deliverDealDocument({
      dealId: seed.dealId,
      templateId: seed.templateIds[0],
    });
    expect(replacement.deliveryVersion).toBe(2);
    expect(replacement.deliveryId).not.toBe(firstDelivery.deliveryId);
    createdState.deliveryIds.push(replacement.deliveryId);

    const downloadedReplacement =
      await developerCaller.distribution.developer.downloadDocumentDelivery({
        deliveryId: replacement.deliveryId,
      });
    expect(Buffer.from(downloadedReplacement.base64Content, 'base64')).toEqual(revisedFile);

    await expect(
      developerCaller.distribution.developer.downloadDocumentDelivery({
        deliveryId: firstDelivery.deliveryId,
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    await expect(
      developerCaller.distribution.developer.acknowledgeDocumentDelivery({
        deliveryId: firstDelivery.deliveryId,
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });

    const replacementInbox = await developerCaller.distribution.developer.listDocumentDeliveries({
      limit: 50,
    });
    expect(replacementInbox.deliveries).toHaveLength(1);
    expect(replacementInbox.deliveries[0]).toMatchObject({
      deliveryId: replacement.deliveryId,
      deliveryVersion: 2,
      fileName: 'buyer-id-revised.pdf',
      acknowledgedAt: null,
    });
    expect(replacementInbox.awaitingAcknowledgementCount).toBe(1);
    expect(replacementInbox.acknowledgedCount).toBe(0);
  });

  it('rejects delivery of unverified files and delivery to an unapproved organisation', async () => {
    const seed = await seedDeliveryScenario();
    const managerCaller = buildCaller(seed.managerUserId, 'visitor');

    await expect(
      managerCaller.distribution.manager.deliverDealDocument({
        dealId: seed.dealId,
        templateId: seed.templateIds[0],
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });

    await uploadAndVerify(seed, seed.templateIds[0], 'buyer-id.pdf');
    const db = await getDb();
    await db!
      .update(developerOrganisations)
      .set({ status: 'pending' })
      .where(eq(developerOrganisations.id, seed.organisationId));

    await expect(
      managerCaller.distribution.manager.deliverDealDocument({
        dealId: seed.dealId,
        templateId: seed.templateIds[0],
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('keeps deliveries scoped to the approved Developer organisation and role', async () => {
    const seed = await seedDeliveryScenario();
    const managerCaller = buildCaller(seed.managerUserId, 'visitor');
    const developerCaller = buildCaller(seed.developerUserId, 'property_developer');
    const outsiderCaller = buildCaller(seed.outsiderUserId, 'property_developer');
    const visitorCaller = buildCaller(seed.visitorUserId, 'visitor');
    await uploadAndVerify(seed, seed.templateIds[0], 'buyer-id.pdf');

    const delivery = await managerCaller.distribution.manager.deliverDealDocument({
      dealId: seed.dealId,
      templateId: seed.templateIds[0],
    });
    createdState.deliveryIds.push(delivery.deliveryId);

    expect(
      (await outsiderCaller.distribution.developer.listDocumentDeliveries({ limit: 50 }))
        .deliveries,
    ).toHaveLength(0);
    await expect(
      outsiderCaller.distribution.developer.downloadDocumentDelivery({
        deliveryId: delivery.deliveryId,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      outsiderCaller.distribution.developer.acknowledgeDocumentDelivery({
        deliveryId: delivery.deliveryId,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    await expect(
      visitorCaller.distribution.developer.listDocumentDeliveries({ limit: 50 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      developerCaller.distribution.manager.deliverDealDocument({
        dealId: seed.dealId,
        templateId: seed.templateIds[0],
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
