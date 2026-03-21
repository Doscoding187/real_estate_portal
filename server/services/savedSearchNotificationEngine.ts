import { and, desc, eq } from 'drizzle-orm';
import { notifications, savedSearches } from '../../drizzle/schema';
import type {
  DevelopmentDerivedListing,
  Property,
  PropertyFilters,
  SavedSearch,
} from '../../shared/types';
import { getDb } from '../db-connection';
import { normalizeSavedSearch } from '../lib/savedSearchContract';
import { developmentDerivedListingService } from './developmentDerivedListingService';
import { propertySearchService } from './propertySearchService';

const PREVIEW_QUERY_LIMIT = 100;
const PREVIEW_MATCH_LIMIT = 3;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEK_IN_MS = 7 * DAY_IN_MS;

type ListingSourceFilter = 'manual' | 'development' | 'all';

type ManualNotificationMatch = Pick<
  Property,
  'id' | 'title' | 'price' | 'city' | 'suburb' | 'listingType' | 'listingSource' | 'listedDate'
> & {
  href: string;
  image: string | null;
};

type DevelopmentNotificationMatch = Pick<
  DevelopmentDerivedListing,
  'id' | 'title' | 'price' | 'city' | 'suburb' | 'listingType' | 'listingSource' | 'listedDate'
> & {
  href: string;
  image: string | null;
};

export type SavedSearchNotificationMatch =
  | ManualNotificationMatch
  | DevelopmentNotificationMatch;

export interface SavedSearchNotificationPayload {
  savedSearchId: number;
  userId: number;
  searchName: string;
  notificationFrequency: SavedSearch['notificationFrequency'];
  listingSource: ListingSourceFilter;
  title: string;
  content: string;
  actionUrl: string;
  totalMatches: number;
  newMatchCount: number;
  matches: SavedSearchNotificationMatch[];
  criteria: Record<string, unknown>;
}

export interface SavedSearchNotificationEngineResult {
  processedAt: string;
  scannedSearches: number;
  dueSearches: number;
  emittedNotifications: number;
  dryRun: boolean;
  notifications: SavedSearchNotificationPayload[];
}

interface ProcessSavedSearchNotificationOptions {
  userId?: number;
  dryRun?: boolean;
  limit?: number;
  now?: Date;
}

interface NormalizedSavedSearchCriteria {
  listingSource: ListingSourceFilter;
  propertyFilters: PropertyFilters;
}

interface SearchEvaluationResult {
  totalMatches: number;
  newMatchCount: number;
  matches: SavedSearchNotificationMatch[];
}

function toString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map(item => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && 'slug' in item && typeof item.slug === 'string') {
        return item.slug.trim();
      }
      return '';
    })
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

function toSuburbArray(value: unknown): string[] | undefined {
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return toStringArray(value);
}

function toBounds(criteria: Record<string, unknown>): PropertyFilters['bounds'] | undefined {
  if (
    typeof criteria.bounds === 'object' &&
    criteria.bounds &&
    !Array.isArray(criteria.bounds) &&
    'north' in criteria.bounds &&
    'south' in criteria.bounds &&
    'east' in criteria.bounds &&
    'west' in criteria.bounds
  ) {
    const bounds = criteria.bounds as Record<string, unknown>;
    const north = toNumber(bounds.north);
    const south = toNumber(bounds.south);
    const east = toNumber(bounds.east);
    const west = toNumber(bounds.west);

    if ([north, south, east, west].every(value => value !== undefined)) {
      return { north: north!, south: south!, east: east!, west: west! };
    }
  }

  const north = toNumber(criteria.maxLat);
  const south = toNumber(criteria.minLat);
  const east = toNumber(criteria.maxLng);
  const west = toNumber(criteria.minLng);

  if ([north, south, east, west].every(value => value !== undefined)) {
    return { north: north!, south: south!, east: east!, west: west! };
  }

  return undefined;
}

function normalizeSavedSearchCriteria(criteria: Record<string, unknown>): NormalizedSavedSearchCriteria {
  const listingSourceValue = toString(criteria.listingSource);
  const listingSource: ListingSourceFilter =
    listingSourceValue === 'manual' || listingSourceValue === 'development'
      ? listingSourceValue
      : 'all';

  const propertyFilters: PropertyFilters = {
    province: toString(criteria.province),
    city: toString(criteria.city),
    suburb: toSuburbArray(criteria.suburb),
    locations: toStringArray(criteria.locations),
    propertyType: (() => {
      const single = toString(criteria.propertyType);
      if (single) return [single as Property['propertyType']];
      const multiple = toStringArray(criteria.propertyType);
      return multiple?.length
        ? (multiple as Property['propertyType'][])
        : undefined;
    })(),
    listingType: (() => {
      const listingType = toString(criteria.listingType);
      return listingType === 'sale' || listingType === 'rent'
        ? (listingType as Property['listingType'])
        : undefined;
    })(),
    minPrice: toNumber(criteria.minPrice),
    maxPrice: toNumber(criteria.maxPrice),
    minBedrooms: toNumber(criteria.minBedrooms),
    maxBedrooms: toNumber(criteria.maxBedrooms),
    minBathrooms: toNumber(criteria.minBathrooms),
    minErfSize: toNumber(criteria.minErfSize ?? criteria.minLandSize),
    maxErfSize: toNumber(criteria.maxErfSize ?? criteria.maxLandSize),
    minFloorSize: toNumber(criteria.minFloorSize ?? criteria.minArea),
    maxFloorSize: toNumber(criteria.maxFloorSize ?? criteria.maxArea),
    titleType: (() => {
      const single = toString(criteria.titleType);
      if (single) return [single as Property['titleType']];
      const multiple = toStringArray(criteria.titleType);
      return multiple?.length ? (multiple as Property['titleType'][]) : undefined;
    })(),
    maxLevy: toNumber(criteria.maxLevy),
    securityEstate: toBoolean(criteria.securityEstate),
    petFriendly: toBoolean(criteria.petFriendly),
    fibreReady: toBoolean(criteria.fibreReady),
    loadSheddingSolutions: (() => {
      const values = toStringArray(criteria.loadSheddingSolutions);
      return values?.length
        ? (values as Property['loadSheddingSolutions'])
        : undefined;
    })(),
    status: (() => {
      const single = toString(criteria.status);
      if (single) return [single as Property['status']];
      const multiple = toStringArray(criteria.status);
      return multiple?.length ? (multiple as Property['status'][]) : undefined;
    })(),
    bounds: toBounds(criteria),
  };

  return {
    listingSource,
    propertyFilters,
  };
}

function getSourceLabel(listingSource: ListingSourceFilter): string {
  if (listingSource === 'manual') return 'property listings';
  if (listingSource === 'development') return 'new developments';
  return 'search results';
}

function getDueWindowMs(frequency: SavedSearch['notificationFrequency']): number | null {
  switch (frequency) {
    case 'daily':
      return DAY_IN_MS;
    case 'weekly':
      return WEEK_IN_MS;
    case 'instant':
      return 0;
    case 'never':
    default:
      return null;
  }
}

function isSavedSearchDue(search: SavedSearch, now: Date): boolean {
  const dueWindowMs = getDueWindowMs(search.notificationFrequency);
  if (dueWindowMs === null) return false;
  if (!search.lastNotifiedAt) return true;

  const lastNotifiedMs = Date.parse(search.lastNotifiedAt);
  if (!Number.isFinite(lastNotifiedMs)) return true;

  return now.getTime() - lastNotifiedMs >= dueWindowMs;
}

function isMatchNewerThan(match: { listedDate: Date }, isoTimestamp?: string | null): boolean {
  if (!isoTimestamp) return true;
  const compareTime = Date.parse(isoTimestamp);
  if (!Number.isFinite(compareTime)) return true;
  return new Date(match.listedDate).getTime() > compareTime;
}

function sortMatchesByDateDesc<T extends { listedDate: Date }>(matches: T[]): T[] {
  return [...matches].sort(
    (left, right) => new Date(right.listedDate).getTime() - new Date(left.listedDate).getTime(),
  );
}

function buildManualMatch(property: Property): ManualNotificationMatch {
  return {
    id: property.id,
    title: property.title,
    price: property.price,
    city: property.city,
    suburb: property.suburb,
    listingType: property.listingType,
    listingSource: 'manual',
    listedDate: property.listedDate,
    href: `/property/${property.id}`,
    image: property.images?.[0]?.url || null,
  };
}

function buildDevelopmentMatch(listing: DevelopmentDerivedListing): DevelopmentNotificationMatch {
  const href = listing.development.slug
    ? `/development/${listing.development.slug}`
    : `/development/${listing.development.id}`;

  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    city: listing.city,
    suburb: listing.suburb,
    listingType: listing.listingType,
    listingSource: 'development',
    listedDate: listing.listedDate,
    href,
    image: listing.image || listing.images?.[0]?.url || null,
  };
}

export class SavedSearchNotificationEngine {
  async processDueNotifications(
    options: ProcessSavedSearchNotificationOptions = {},
  ): Promise<SavedSearchNotificationEngineResult> {
    const db = await getDb();
    const now = options.now ?? new Date();

    if (!db) {
      return {
        processedAt: now.toISOString(),
        scannedSearches: 0,
        dueSearches: 0,
        emittedNotifications: 0,
        dryRun: options.dryRun ?? false,
        notifications: [],
      };
    }

    const query = db
      .select()
      .from(savedSearches)
      .orderBy(desc(savedSearches.createdAt)) as any;

    const rows =
      typeof options.userId === 'number'
        ? await query.where(eq(savedSearches.userId, options.userId))
        : await query;

    const limit = options.limit && options.limit > 0 ? options.limit : Number.POSITIVE_INFINITY;
    const normalizedSearches = rows
      .map(normalizeSavedSearch)
      .filter(search => search.notificationFrequency !== 'never')
      .slice(0, limit);

    const notificationsToEmit: SavedSearchNotificationPayload[] = [];
    let dueSearches = 0;

    for (const search of normalizedSearches) {
      if (!isSavedSearchDue(search, now)) {
        continue;
      }

      dueSearches += 1;
      const payload = await this.buildNotificationPayload(search);
      if (!payload) {
        continue;
      }

      notificationsToEmit.push(payload);

      if (!options.dryRun) {
        await db.insert(notifications).values({
          userId: search.userId,
          type: 'system_alert',
          title: payload.title,
          content: payload.content,
          data: JSON.stringify({
            kind: 'saved_search_matches',
            savedSearchId: payload.savedSearchId,
            searchName: payload.searchName,
            notificationFrequency: payload.notificationFrequency,
            listingSource: payload.listingSource,
            totalMatches: payload.totalMatches,
            newMatchCount: payload.newMatchCount,
            actionUrl: payload.actionUrl,
            matches: payload.matches,
            criteria: payload.criteria,
          }),
          isRead: 0,
        });

        await db
          .update(savedSearches)
          .set({ lastNotifiedAt: now.toISOString() })
          .where(eq(savedSearches.id, payload.savedSearchId));
      }
    }

    return {
      processedAt: now.toISOString(),
      scannedSearches: normalizedSearches.length,
      dueSearches,
      emittedNotifications: notificationsToEmit.length,
      dryRun: options.dryRun ?? false,
      notifications: notificationsToEmit,
    };
  }

  private async buildNotificationPayload(
    search: SavedSearch,
  ): Promise<SavedSearchNotificationPayload | null> {
    const evaluation = await this.evaluateSearch(search);
    if (!evaluation || evaluation.totalMatches === 0 || evaluation.newMatchCount === 0) {
      return null;
    }

    const { listingSource } = normalizeSavedSearchCriteria(search.criteria);
    const sourceLabel = getSourceLabel(listingSource);
    const pluralLabel = evaluation.newMatchCount === 1 ? 'match' : 'matches';
    const title = `${evaluation.newMatchCount} new ${pluralLabel} for ${search.name}`;
    const content = `We found ${evaluation.newMatchCount} new ${sourceLabel} for your saved search. ${evaluation.totalMatches} ${sourceLabel} currently match.`;
    const actionUrl = evaluation.matches[0]?.href || '/properties';

    return {
      savedSearchId: search.id,
      userId: search.userId,
      searchName: search.name,
      notificationFrequency: search.notificationFrequency,
      listingSource,
      title,
      content,
      actionUrl,
      totalMatches: evaluation.totalMatches,
      newMatchCount: evaluation.newMatchCount,
      matches: evaluation.matches.slice(0, PREVIEW_MATCH_LIMIT),
      criteria: search.criteria,
    };
  }

  private async evaluateSearch(search: SavedSearch): Promise<SearchEvaluationResult | null> {
    const { listingSource, propertyFilters } = normalizeSavedSearchCriteria(search.criteria);

    const [manualResults, developmentResults] = await Promise.all([
      listingSource === 'development'
        ? Promise.resolve(null)
        : propertySearchService.searchProperties(propertyFilters, 'date_desc', 1, PREVIEW_QUERY_LIMIT),
      listingSource === 'manual'
        ? Promise.resolve(null)
        : developmentDerivedListingService.searchListings(propertyFilters, 'date_desc', 1, PREVIEW_QUERY_LIMIT),
    ]);

    const manualMatches = manualResults?.properties?.map(buildManualMatch) ?? [];
    const developmentMatches = developmentResults?.items?.map(buildDevelopmentMatch) ?? [];
    const totalMatches = (manualResults?.total || 0) + (developmentResults?.total || 0);

    const freshMatches = [
      ...manualMatches.filter(match => isMatchNewerThan(match, search.lastNotifiedAt)),
      ...developmentMatches.filter(match => isMatchNewerThan(match, search.lastNotifiedAt)),
    ];

    const previewMatches = sortMatchesByDateDesc(
      freshMatches.length > 0
        ? freshMatches
        : [...manualMatches, ...developmentMatches],
    ).slice(0, PREVIEW_MATCH_LIMIT);

    const newMatchCount = search.lastNotifiedAt ? freshMatches.length : totalMatches;

    return {
      totalMatches,
      newMatchCount,
      matches: previewMatches,
    };
  }
}

export const savedSearchNotificationEngine = new SavedSearchNotificationEngine();
