import { afterEach, describe, expect, it } from 'vitest';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { getDb } from '../db-connection';
import { developerRouter } from '../developerRouter';
import { superAdminPublisherRouter } from '../superAdminPublisherRouter';
import { developmentService } from '../services/developmentService';
import type { WizardData } from '../services/publishNormalizer';
import {
  createDeveloperTestContext,
  createPlatformPublisherTestContext,
  deleteDeveloperTestContext,
  deletePlatformPublisherTestContext,
  type DeveloperTestContext,
  type PlatformPublisherTestContext,
} from '../test-utils/developerTestContext';
import { developmentDrafts, users } from '../../drizzle/schema';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

const created = {
  userIds: [] as number[],
  draftIds: [] as number[],
  developer: null as DeveloperTestContext | null,
  platformPublisher: null as PlatformPublisherTestContext | null,
};

type DeveloperRouterContext = Parameters<typeof developerRouter.createCaller>[0];
type SuperAdminPublisherRouterContext = Parameters<
  typeof superAdminPublisherRouter.createCaller
>[0];

function suffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function database() {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  return db;
}

async function insertUser(role: 'property_developer' | 'super_admin') {
  const db = await database();
  const unique = suffix();
  const [result] = await db.insert(users).values({
    email: `draft-land-${role}-${unique}@example.com`,
    name: `Draft Land ${role} ${unique}`,
    role,
    emailVerified: 1,
  });
  const userId = Number(result.insertId);
  created.userIds.push(userId);
  return userId;
}

function developerCaller(userId: number) {
  return developerRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: userId, role: 'property_developer' },
  } as unknown as DeveloperRouterContext);
}

function curatorCaller(userId: number, cataloguePublisherId: number) {
  return superAdminPublisherRouter.createCaller({
    req: { headers: { 'x-operating-as-publisher': String(cataloguePublisherId) } },
    res: {},
    user: { id: userId, role: 'super_admin' },
  } as unknown as SuperAdminPublisherRouterContext);
}

describeWithDb('generic Developer Land draft containment', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    const draftIds = [...new Set(created.draftIds)];
    if (draftIds.length) {
      await db.delete(developmentDrafts).where(inArray(developmentDrafts.id, draftIds));
    }

    if (created.platformPublisher) {
      await deletePlatformPublisherTestContext(created.platformPublisher);
      created.platformPublisher = null;
    }
    if (created.developer) {
      await deleteDeveloperTestContext(created.developer);
      created.developer = null;
    }

    const userIds = [...new Set(created.userIds)];
    if (userIds.length) {
      await db.delete(users).where(inArray(users.id, userIds));
    }
    created.userIds = [];
    created.draftIds = [];
  });

  it('rejects new and retained generic Land drafts without changing custody or state', async () => {
    const developerUserId = await insertUser('property_developer');
    const curatorUserId = await insertUser('super_admin');
    const unique = suffix();
    created.developer = await createDeveloperTestContext({
      userId: developerUserId,
      name: `Draft Land Developer ${unique}`,
      email: `draft-land-developer-${unique}@example.com`,
    });
    created.platformPublisher = await createPlatformPublisherTestContext({
      name: `Draft Land Platform ${unique}`,
      createdByUserId: curatorUserId,
    });

    const db = await database();
    const developer = created.developer;
    const platformPublisher = created.platformPublisher;
    if (!developer || !platformPublisher) throw new Error('Expected canonical developer fixtures');

    const nestedLandDraft = {
      developmentData: {
        name: `Nested Land Draft ${unique}`,
        developmentType: 'land',
      },
      currentPhase: 2,
    };
    await expect(
      developerCaller(developerUserId).saveDraft({ draftData: nestedLandDraft }),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
    await expect(
      db
        .select({ id: developmentDrafts.id })
        .from(developmentDrafts)
        .where(
          and(
            eq(developmentDrafts.developerOrganisationId, developer.organisationId),
            eq(developmentDrafts.cataloguePublisherId, developer.cataloguePublisherId),
          ),
        ),
    ).resolves.toEqual([]);

    const [legacyInsert] = await db.insert(developmentDrafts).values({
      developerOrganisationId: developer.organisationId,
      cataloguePublisherId: developer.cataloguePublisherId,
      draftName: `Retained Land Draft ${unique}`,
      draftData: { developmentType: 'land', developmentData: { name: `Retained Land ${unique}` } },
      progress: 40,
      currentStep: 4,
    });
    const legacyDraftId = Number(legacyInsert.insertId);
    created.draftIds.push(legacyDraftId);
    const [before] = await db
      .select({
        id: developmentDrafts.id,
        draftName: developmentDrafts.draftName,
        draftData: developmentDrafts.draftData,
        progress: developmentDrafts.progress,
        currentStep: developmentDrafts.currentStep,
      })
      .from(developmentDrafts)
      .where(eq(developmentDrafts.id, legacyDraftId))
      .limit(1);
    expect(before).toBeTruthy();

    await expect(
      developerCaller(developerUserId).saveDraft({
        id: legacyDraftId,
        draftData: { developmentType: 'residential', developmentData: { name: 'Relabel attempt' } },
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    const flatLandDraft: WizardData = {
      name: 'Legacy service Land draft',
      developmentType: 'land',
      city: 'Johannesburg',
      province: 'Gauteng',
    };
    await expect(
      developmentService.saveDraft(developerUserId, flatLandDraft),
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });

    const [after] = await db
      .select({
        id: developmentDrafts.id,
        draftName: developmentDrafts.draftName,
        draftData: developmentDrafts.draftData,
        progress: developmentDrafts.progress,
        currentStep: developmentDrafts.currentStep,
      })
      .from(developmentDrafts)
      .where(eq(developmentDrafts.id, legacyDraftId))
      .limit(1);
    expect(after).toEqual(before);

    await expect(
      curatorCaller(curatorUserId, platformPublisher.cataloguePublisherId).saveDraft({
        cataloguePublisherId: platformPublisher.cataloguePublisherId,
        draftData: { developmentType: 'land', developmentData: { name: `Curated Land ${unique}` } },
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    await expect(
      db
        .select({ id: developmentDrafts.id })
        .from(developmentDrafts)
        .where(
          and(
            eq(developmentDrafts.cataloguePublisherId, platformPublisher.cataloguePublisherId),
            isNull(developmentDrafts.developerOrganisationId),
          ),
        ),
    ).resolves.toEqual([]);
  });
});
