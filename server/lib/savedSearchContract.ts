import { z } from 'zod';
import { savedSearches } from '../../drizzle/schema';
import type { SavedSearch } from '../../shared/types';

export const savedSearchNotificationFrequencySchema = z.enum([
  'instant',
  'daily',
  'weekly',
  'never',
]);

export const savedSearchCriteriaSchema = z.record(z.any());

type SavedSearchRow = typeof savedSearches.$inferSelect;

function coerceCriteria(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function normalizeSavedSearch(row: SavedSearchRow): SavedSearch {
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    name: row.name,
    criteria: coerceCriteria(row.criteria),
    notificationFrequency: row.notificationFrequency ?? 'never',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastNotifiedAt: row.lastNotifiedAt ?? null,
  };
}
