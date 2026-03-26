import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { desc, eq, sql } from 'drizzle-orm';

import { getDb } from '../db-connection';
import { persistUnitTypes } from '../services/developmentService';
import { developmentDrafts, developments, unitTypes } from '../../drizzle/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const worktreeRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(worktreeRoot, '../..');

for (const candidate of [
  path.resolve(worktreeRoot, '.env.local'),
  path.resolve(worktreeRoot, '.env'),
  path.resolve(repoRoot, '.env.local'),
  path.resolve(repoRoot, '.env'),
]) {
  dotenv.config({ path: candidate, override: false });
}

function parseArg(flag: string, fallback?: string) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
}

function hasFlag(flag: string) {
  return process.argv.slice(2).includes(flag);
}

function parseJson(value: unknown) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeName(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDraftUnitTypes(draftData: unknown): any[] {
  const parsed = parseJson(draftData);
  if (!parsed || typeof parsed !== 'object') return [];

  const topLevelUnits = Array.isArray((parsed as any).unitTypes) ? (parsed as any).unitTypes : [];
  if (topLevelUnits.length > 0) return topLevelUnits;

  const nestedUnits = (parsed as any)?.stepData?.unit_types?.unitTypes;
  return Array.isArray(nestedUnits) ? nestedUnits : [];
}

type CandidateDraft = {
  id: number;
  draftName: string | null;
  developerId: number | null;
  developerBrandProfileId: number | null;
  draftData: unknown;
  lastModified: string | null;
};

function scoreDraftMatch(
  development: {
    id: number;
    name: string;
    developerId: number | null;
    developerBrandProfileId: number | null;
  },
  draft: CandidateDraft,
  extractedUnits: any[],
) {
  if (extractedUnits.length === 0) return -1;

  const parsed = parseJson(draft.draftData) as any;
  let score = 0;

  if (Number(parsed?.id || 0) === development.id) score += 100;
  if (normalizeName(parsed?.name) === normalizeName(development.name)) score += 40;
  if (normalizeName(draft.draftName) === normalizeName(development.name)) score += 30;
  if (
    development.developerBrandProfileId &&
    Number(draft.developerBrandProfileId || 0) === development.developerBrandProfileId
  ) {
    score += 20;
  }
  if (development.developerId && Number(draft.developerId || 0) === development.developerId) {
    score += 10;
  }

  return score;
}

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('[backfill-unit-types-from-drafts] Database unavailable.');
    process.exit(1);
  }

  const developmentIdArg = parseArg('--developmentId');
  const targetDevelopmentId = developmentIdArg ? Number(developmentIdArg) : null;
  const onlyPublished = !hasFlag('--include-unpublished');
  const apply = hasFlag('--apply');

  const developmentRows = await db
    .select({
      id: developments.id,
      name: developments.name,
      developerId: developments.developerId,
      developerBrandProfileId: developments.developerBrandProfileId,
      isPublished: developments.isPublished,
      approvalStatus: developments.approvalStatus,
    })
    .from(developments)
    .orderBy(desc(developments.createdAt));

  const filteredDevelopments = developmentRows.filter(development => {
    if (targetDevelopmentId && Number(development.id) !== targetDevelopmentId) return false;
    if (!onlyPublished) return true;
    return Number(development.isPublished || 0) === 1 && String(development.approvalStatus) === 'approved';
  });

  const drafts = (await db
    .select({
      id: developmentDrafts.id,
      draftName: developmentDrafts.draftName,
      developerId: developmentDrafts.developerId,
      developerBrandProfileId: developmentDrafts.developerBrandProfileId,
      draftData: developmentDrafts.draftData,
      lastModified: developmentDrafts.lastModified,
    })
    .from(developmentDrafts)
    .orderBy(desc(developmentDrafts.lastModified))) as CandidateDraft[];

  let scanned = 0;
  let eligible = 0;
  let restored = 0;

  for (const development of filteredDevelopments) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(unitTypes)
      .where(eq(unitTypes.developmentId, development.id));

    const existingUnitCount = Number(count || 0);
    scanned += 1;

    if (existingUnitCount > 0) {
      console.log(
        `[skip] Development ${development.id} "${development.name}" already has ${existingUnitCount} unit type(s).`,
      );
      continue;
    }

    const rankedDrafts = drafts
      .map(draft => {
        const extractedUnits = extractDraftUnitTypes(draft.draftData);
        return {
          draft,
          extractedUnits,
          score: scoreDraftMatch(
            {
              id: Number(development.id),
              name: String(development.name),
              developerId: development.developerId == null ? null : Number(development.developerId),
              developerBrandProfileId:
                development.developerBrandProfileId == null
                  ? null
                  : Number(development.developerBrandProfileId),
            },
            draft,
            extractedUnits,
          ),
        };
      })
      .filter(candidate => candidate.score >= 30)
      .sort((a, b) => b.score - a.score);

    if (rankedDrafts.length === 0) {
      console.log(
        `[miss] Development ${development.id} "${development.name}" has no persisted units and no matching draft unit types.`,
      );
      continue;
    }

    const bestDraft = rankedDrafts[0];
    eligible += 1;

    console.log(
      `[match] Development ${development.id} "${development.name}" <- Draft ${bestDraft.draft.id} (score ${bestDraft.score}, ${bestDraft.extractedUnits.length} unit(s))`,
    );

    if (!apply) {
      continue;
    }

    await db.transaction(async tx => {
      await persistUnitTypes(tx, Number(development.id), bestDraft.extractedUnits);
    });

    restored += 1;
  }

  console.log('');
  console.log('[backfill-unit-types-from-drafts] Summary');
  console.log(`- scanned developments: ${scanned}`);
  console.log(`- eligible missing developments with draft units: ${eligible}`);
  console.log(`- restored developments: ${restored}`);
  console.log(`- mode: ${apply ? 'apply' : 'dry-run'}`);
}

main().catch(error => {
  console.error('[backfill-unit-types-from-drafts] Failed:', error);
  process.exit(1);
});
