/**
 * Integration coverage for the supported development draft workflow.
 *
 * The former strict insert-and-publish contract was retired in S0. Drafts
 * remain an active authoring capability and are covered here independently.
 */

import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { WizardData } from '../../server/services/publishNormalizer';
import { developmentDrafts } from '../../drizzle/schema';
import { getDb } from '../../server/db-connection';
import { saveDraft } from '../../server/services/developmentService';

const TEST_DEVELOPER_ID = 1;

describe('Development draft workflow', () => {
  it.skipIf(!process.env.DATABASE_URL)('saves incomplete development data as a draft', async () => {
    const database = await getDb();
    if (!database) throw new Error('Database connection failed');

    let draftId: number | null = null;
    try {
      const incompleteDraft: WizardData = {
        name: 'Incomplete Draft',
        city: '',
        province: '',
        developmentType: 'residential',
      };

      const result = await saveDraft(TEST_DEVELOPER_ID, incompleteDraft);
      draftId = result.draftId;

      expect(draftId).toBeGreaterThan(0);
    } finally {
      if (draftId) {
        await database.delete(developmentDrafts).where(eq(developmentDrafts.id, draftId));
      }
    }
  });
});
