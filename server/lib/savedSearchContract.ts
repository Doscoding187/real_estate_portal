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
export const savedSearchDeliveryPreferencesSchema = z.object({
  emailEnabled: z.boolean().default(true),
  inAppEnabled: z.boolean().default(true),
});

const DELIVERY_PREFERENCES_KEY = '__deliveryPreferences';

type SavedSearchRow = typeof savedSearches.$inferSelect;

function coerceCriteria(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getDeliveryPreferences(criteria: Record<string, unknown>) {
  const parsed = savedSearchDeliveryPreferencesSchema.safeParse(criteria[DELIVERY_PREFERENCES_KEY]);
  if (parsed.success) {
    return parsed.data;
  }

  return savedSearchDeliveryPreferencesSchema.parse({});
}

function stripCriteriaMeta(criteria: Record<string, unknown>): Record<string, unknown> {
  const nextCriteria = { ...criteria };
  delete nextCriteria[DELIVERY_PREFERENCES_KEY];
  return nextCriteria;
}

export function serializeSavedSearchCriteria(
  criteria: Record<string, unknown>,
  input: Pick<SavedSearch, 'emailEnabled' | 'inAppEnabled'>,
): Record<string, unknown> {
  return {
    ...stripCriteriaMeta(coerceCriteria(criteria)),
    [DELIVERY_PREFERENCES_KEY]: savedSearchDeliveryPreferencesSchema.parse({
      emailEnabled: input.emailEnabled,
      inAppEnabled: input.inAppEnabled,
    }),
  };
}

export function normalizeSavedSearch(row: SavedSearchRow): SavedSearch {
  const rawCriteria = coerceCriteria(row.criteria);
  const deliveryPreferences = getDeliveryPreferences(rawCriteria);

  return {
    id: Number(row.id),
    userId: Number(row.userId),
    name: row.name,
    criteria: stripCriteriaMeta(rawCriteria),
    notificationFrequency: row.notificationFrequency ?? 'never',
    emailEnabled: deliveryPreferences.emailEnabled,
    inAppEnabled: deliveryPreferences.inAppEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastNotifiedAt: row.lastNotifiedAt ?? null,
  };
}
