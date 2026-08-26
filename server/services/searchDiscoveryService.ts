import { and, eq, like, or, sql } from 'drizzle-orm';

import { getDb } from '../db';
import { cities, properties, provinces, suburbs } from '../../drizzle/schema';
import {
  isFactualGeographyId,
  type FactualRuntimeProjectionAuthority,
  type RuntimeSearchScopeKind,
} from '../../shared/factualRuntimeGeographyBridge';
import {
  encodeCanonicalLocationId,
  parseCanonicalLocationId,
} from '../../shared/locationAuthority';
import type {
  CanonicalLocationDiscoveryResult,
  SearchDiscoveryResult,
  SearchDiscoverySelection,
  SearchAreaDiscoveryResult,
} from '../../shared/searchDiscovery';
import {
  isSearchAreaId,
  type SearchAreaSummary,
  type SearchJourneyId,
  type SearchScope,
} from '../../shared/searchScope';
import { gautengFactualRuntimeProjectionAuthority } from './governedRuntimeGeographyReference';
import {
  locationResolver,
  type PublicLocationResolutionResult,
  type ResolvedLocation,
} from './locationResolverService';
import { governedRuntimeGeographyAuthority } from './runtimeGeographyResolverService';
import type {
  RuntimeGeographyAuthority,
  RuntimeGeographyAuthorityRecord,
} from './runtimeGeographyAuthority';
import {
  searchAreaAuthority,
  type ListSearchAreaSummaryOptions,
  type ResolveSearchAreaOptions,
  type SearchAreaResolution,
} from './searchAreaAuthority';

export type SearchDiscoveryMode = 'public' | 'controlled_acceptance';

interface CanonicalLocationCatalogRow {
  canonicalLocationId: string;
  label: string;
  factualLevel: 'province' | 'city' | 'suburb';
  provinceSlug: string;
  citySlug?: string;
  suburbSlug?: string;
  canonicalPath: string;
  listingCount?: number;
}

export interface SearchDiscoverySearchAreaAuthority {
  listSearchAreaSummaries(
    options?: ListSearchAreaSummaryOptions,
  ): Promise<readonly SearchAreaSummary[]>;
  resolveSearchArea(
    searchAreaId: string,
    options?: ResolveSearchAreaOptions,
  ): Promise<SearchAreaResolution>;
}

export interface SearchDiscoveryPublicLocationResolver {
  resolvePublicLocation(options: {
    locationId?: string;
    provinceSlug?: string;
    citySlug?: string;
    suburbSlug?: string;
  }): Promise<PublicLocationResolutionResult>;
}

export interface SearchDiscoveryServiceOptions {
  mode?: SearchDiscoveryMode;
  searchAreaAuthority?: SearchDiscoverySearchAreaAuthority;
  projectionAuthority?: FactualRuntimeProjectionAuthority;
  runtimeGeographyAuthority?: RuntimeGeographyAuthority;
  publicLocationResolver?: SearchDiscoveryPublicLocationResolver;
  canonicalLocationSearch?: (
    query: string,
    limit: number,
  ) => Promise<readonly CanonicalLocationCatalogRow[]>;
}

export type SearchDiscoverySelectionResolution =
  | {
      status: 'resolved';
      selection: SearchDiscoverySelection;
      scope: SearchScope;
      label: string;
      factualLocationId?: string;
      searchAreaSummary?: SearchAreaSummary;
    }
  | {
      status: 'unavailable';
      reason:
        | 'invalid_selection'
        | 'factual_identity_unresolved'
        | 'factual_runtime_unresolved'
        | 'canonical_location_unresolved'
        | 'canonical_identity_mismatch'
        | 'search_area_unavailable'
        | 'preview_only';
      message: string;
    };

function normalizedQuery(value: string): string {
  return value.trim().toLowerCase();
}

function titleCase(value: string): string {
  return value
    .split(/[_\-/\s]+/)
    .filter(Boolean)
    .map(word => `${word[0]?.toUpperCase() || ''}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

function displayTypeLabel(factualType: string | undefined, level: string): string {
  if (factualType?.trim()) return titleCase(factualType);
  if (level === 'suburb') return 'Locality';
  if (level === 'city') return 'City';
  return 'Province';
}

function scopeKindForLevel(level: 'province' | 'city' | 'suburb'): RuntimeSearchScopeKind {
  if (level === 'province') return 'province';
  if (level === 'city') return 'metro_city';
  return 'locality';
}

function scopeForRuntimeRecord(record: RuntimeGeographyAuthorityRecord): SearchScope {
  const kind =
    record.scopeKind === 'province'
      ? 'province'
      : record.scopeKind === 'metro_city'
        ? 'metro_city'
        : 'locality';
  return { kind, canonicalLocationId: record.canonicalLocationId };
}

function scopeForResolvedLocation(location: ResolvedLocation): SearchScope {
  const selected = location.suburb || location.city || location.province;
  const canonicalLocationId = encodeCanonicalLocationId(location.level, selected.id);
  const kind =
    location.level === 'province'
      ? 'province'
      : location.level === 'city'
        ? 'metro_city'
        : 'locality';
  return { kind, canonicalLocationId };
}

function contextLabelForFactualProjection(
  factualContext: readonly string[],
  provinceSlug: string,
): string | undefined {
  return factualContext.find(value => {
    const normalized = normalizedQuery(value);
    return normalized !== normalizedQuery(provinceSlug) && normalized !== 'gauteng';
  });
}

function pathFromRuntimeNaturalKey(runtimeNaturalKey: string): string {
  return `/${runtimeNaturalKey
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')}`;
}

async function searchCanonicalLocationCatalog(
  query: string,
  limit: number,
): Promise<readonly CanonicalLocationCatalogRow[]> {
  const db = await getDb();
  if (!db) return [];

  const searchPattern = `%${query.toLowerCase()}%`;
  const publishedCount = sql<number>`COUNT(${properties.id})`;

  const provinceRows = await db
    .select({
      id: provinces.id,
      name: provinces.name,
      slug: provinces.slug,
      listingCount: publishedCount,
    })
    .from(provinces)
    .leftJoin(
      properties,
      and(eq(properties.provinceId, provinces.id), eq(properties.status, 'published')),
    )
    .where(
      or(
        like(sql`LOWER(${provinces.name})`, searchPattern),
        like(sql`LOWER(${provinces.slug})`, searchPattern),
      ),
    )
    .groupBy(provinces.id, provinces.name, provinces.slug)
    .limit(limit);

  const cityRows = await db
    .select({
      id: cities.id,
      name: cities.name,
      slug: cities.slug,
      provinceSlug: provinces.slug,
      listingCount: publishedCount,
    })
    .from(cities)
    .innerJoin(provinces, eq(cities.provinceId, provinces.id))
    .leftJoin(properties, and(eq(properties.cityId, cities.id), eq(properties.status, 'published')))
    .where(
      or(
        like(sql`LOWER(${cities.name})`, searchPattern),
        like(sql`LOWER(${cities.slug})`, searchPattern),
      ),
    )
    .groupBy(cities.id, cities.name, cities.slug, provinces.slug)
    .limit(limit);

  const suburbRows = await db
    .select({
      id: suburbs.id,
      name: suburbs.name,
      slug: suburbs.slug,
      citySlug: cities.slug,
      provinceSlug: provinces.slug,
      listingCount: publishedCount,
    })
    .from(suburbs)
    .innerJoin(cities, eq(suburbs.cityId, cities.id))
    .innerJoin(provinces, eq(cities.provinceId, provinces.id))
    .leftJoin(
      properties,
      and(eq(properties.suburbId, suburbs.id), eq(properties.status, 'published')),
    )
    .where(
      or(
        like(sql`LOWER(${suburbs.name})`, searchPattern),
        like(sql`LOWER(${suburbs.slug})`, searchPattern),
      ),
    )
    .groupBy(suburbs.id, suburbs.name, suburbs.slug, cities.slug, provinces.slug)
    .limit(limit);

  return [
    ...provinceRows.map(row => ({
      canonicalLocationId: encodeCanonicalLocationId('province', Number(row.id)),
      label: row.name,
      factualLevel: 'province' as const,
      provinceSlug: row.slug,
      canonicalPath: `/${row.slug}`,
      listingCount: row.listingCount ?? undefined,
    })),
    ...cityRows.map(row => ({
      canonicalLocationId: encodeCanonicalLocationId('city', Number(row.id)),
      label: row.name,
      factualLevel: 'city' as const,
      provinceSlug: row.provinceSlug,
      citySlug: row.slug,
      canonicalPath: `/${row.provinceSlug}/${row.slug}`,
      listingCount: row.listingCount ?? undefined,
    })),
    ...suburbRows.map(row => ({
      canonicalLocationId: encodeCanonicalLocationId('suburb', Number(row.id)),
      label: row.name,
      factualLevel: 'suburb' as const,
      provinceSlug: row.provinceSlug,
      citySlug: row.citySlug,
      suburbSlug: row.slug,
      canonicalPath: `/${row.provinceSlug}/${row.citySlug}/${row.slug}`,
      listingCount: row.listingCount ?? undefined,
    })),
  ];
}

function toCanonicalCatalogResult(
  row: CanonicalLocationCatalogRow,
): CanonicalLocationDiscoveryResult {
  return {
    kind: 'canonical_location',
    canonicalLocationId: row.canonicalLocationId,
    label: row.label,
    factualLevel: row.factualLevel,
    searchScopeKind: scopeKindForLevel(row.factualLevel),
    display: { typeLabel: displayTypeLabel(undefined, row.factualLevel) },
    provinceSlug: row.provinceSlug,
    ...(row.citySlug ? { citySlug: row.citySlug } : {}),
    ...(row.suburbSlug ? { suburbSlug: row.suburbSlug } : {}),
    canonicalPath: row.canonicalPath,
    source: 'canonical_geography',
    ...(row.listingCount !== undefined ? { listingCount: Number(row.listingCount) } : {}),
  };
}

export class SearchDiscoveryService {
  private readonly mode: SearchDiscoveryMode;

  private readonly searchAreaAuthority: SearchDiscoverySearchAreaAuthority;

  private readonly projectionAuthority: FactualRuntimeProjectionAuthority;

  private readonly runtimeGeographyAuthority: RuntimeGeographyAuthority;

  private readonly publicLocationResolver: SearchDiscoveryPublicLocationResolver;

  private readonly canonicalLocationSearch: (
    query: string,
    limit: number,
  ) => Promise<readonly CanonicalLocationCatalogRow[]>;

  constructor(options: SearchDiscoveryServiceOptions = {}) {
    const productionRuntime =
      process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
    this.mode =
      options.mode === 'controlled_acceptance' && !productionRuntime
        ? 'controlled_acceptance'
        : 'public';
    this.searchAreaAuthority = options.searchAreaAuthority ?? searchAreaAuthority;
    this.projectionAuthority =
      options.projectionAuthority ?? gautengFactualRuntimeProjectionAuthority;
    this.runtimeGeographyAuthority =
      options.runtimeGeographyAuthority ?? governedRuntimeGeographyAuthority;
    this.publicLocationResolver = options.publicLocationResolver ?? locationResolver;
    this.canonicalLocationSearch =
      options.canonicalLocationSearch ?? searchCanonicalLocationCatalog;
  }

  private searchAreaOptions(journey?: SearchJourneyId): ListSearchAreaSummaryOptions {
    return {
      ...(journey ? { journey } : {}),
      ...(this.mode === 'controlled_acceptance' ? { includePreview: true } : {}),
    };
  }

  private async searchFactualProjection(
    query: string,
    limit: number,
  ): Promise<readonly CanonicalLocationDiscoveryResult[]> {
    const lowerQuery = normalizedQuery(query);
    const entries = this.projectionAuthority
      .entries()
      .filter(
        entry =>
          entry.projectionStatus === 'projection_ready' &&
          (normalizedQuery(entry.factualPreferredName).includes(lowerQuery) ||
            entry.factualContext.some(context => normalizedQuery(context).includes(lowerQuery))),
      )
      .sort((left, right) => {
        const leftPrefix = normalizedQuery(left.factualPreferredName).startsWith(lowerQuery)
          ? 0
          : 1;
        const rightPrefix = normalizedQuery(right.factualPreferredName).startsWith(lowerQuery)
          ? 0
          : 1;
        if (leftPrefix !== rightPrefix) return leftPrefix - rightPrefix;
        return left.factualPreferredName.localeCompare(right.factualPreferredName);
      })
      .slice(0, limit);

    const results: CanonicalLocationDiscoveryResult[] = [];
    for (const entry of entries) {
      if (!entry.runtimeNaturalKey || !entry.runtimeSearchScopeKind) continue;
      const runtime = await this.runtimeGeographyAuthority.resolveRuntimeNaturalKey(
        entry.runtimeNaturalKey,
        entry.runtimeSearchScopeKind,
      );
      if (!runtime) continue;

      const [provinceSlug, citySlug, suburbSlug] = entry.runtimeNaturalKey.split('/');
      results.push({
        kind: 'canonical_location',
        factualLocationId: entry.factualLocationId,
        canonicalLocationId: runtime.canonicalLocationId,
        label: entry.factualPreferredName,
        factualLevel: runtime.level,
        factualType: entry.factualType,
        searchScopeKind: entry.runtimeSearchScopeKind,
        display: {
          typeLabel: displayTypeLabel(entry.factualType, runtime.level),
          ...(contextLabelForFactualProjection(entry.factualContext, provinceSlug)
            ? {
                contextLabel: contextLabelForFactualProjection(entry.factualContext, provinceSlug),
              }
            : {}),
        },
        provinceSlug,
        ...(citySlug ? { citySlug } : {}),
        ...(suburbSlug ? { suburbSlug } : {}),
        canonicalPath: pathFromRuntimeNaturalKey(entry.runtimeNaturalKey),
        source: 'canonical_geography',
      });
    }

    return results;
  }

  private async searchAreas(
    query: string,
    journey?: SearchJourneyId,
  ): Promise<readonly SearchAreaDiscoveryResult[]> {
    const lowerQuery = normalizedQuery(query);
    const summaries = await this.searchAreaAuthority.listSearchAreaSummaries(
      this.searchAreaOptions(journey),
    );

    return summaries
      .filter(summary => {
        const labelMatches = normalizedQuery(summary.label).includes(lowerQuery);
        const slugMatches = summary.publicSlug
          ? normalizedQuery(summary.publicSlug).includes(lowerQuery)
          : false;
        return labelMatches || slugMatches;
      })
      .map(summary => ({
        kind: 'search_area' as const,
        searchAreaId: summary.searchAreaId,
        label: summary.label,
        display: {
          typeLabel: 'Property market area',
          ...(summary.canonicalContext?.primaryContextName
            ? { contextLabel: summary.canonicalContext.primaryContextName }
            : {}),
        },
        ...(summary.publicSlug ? { publicSlug: summary.publicSlug } : {}),
        lifecycle: summary.lifecycle,
        availability: summary.availability,
        publicEligible: summary.availability === 'available',
        supportedJourneys: summary.supportedJourneys,
        source: 'search_area' as const,
      }));
  }

  async search(
    query: string,
    limit = 8,
    journey?: SearchJourneyId,
  ): Promise<readonly SearchDiscoveryResult[]> {
    const normalized = normalizedQuery(query);
    if (normalized.length < 2) return [];

    const safeLimit = Math.max(1, Math.min(20, Math.floor(limit)));
    const [catalogRows, factualResults, areaResults] = await Promise.all([
      this.canonicalLocationSearch(normalized, safeLimit).catch(error => {
        console.error('[searchDiscovery] Canonical catalog query failed:', error);
        return [] as readonly CanonicalLocationCatalogRow[];
      }),
      this.searchFactualProjection(normalized, safeLimit).catch(error => {
        console.error('[searchDiscovery] Factual projection query failed:', error);
        return [] as readonly CanonicalLocationDiscoveryResult[];
      }),
      this.searchAreas(normalized, journey).catch(error => {
        console.error('[searchDiscovery] Search Area discovery query failed:', error);
        return [] as readonly SearchAreaDiscoveryResult[];
      }),
    ]);

    const factualPaths = new Set(factualResults.map(result => result.canonicalPath));
    const catalogResults = catalogRows
      .filter(row => !factualPaths.has(row.canonicalPath))
      .map(toCanonicalCatalogResult);

    const combined = [...factualResults, ...catalogResults, ...areaResults];
    combined.sort((left, right) => {
      const leftPrefix = normalizedQuery(left.label).startsWith(normalized) ? 0 : 1;
      const rightPrefix = normalizedQuery(right.label).startsWith(normalized) ? 0 : 1;
      if (leftPrefix !== rightPrefix) return leftPrefix - rightPrefix;
      if (left.kind !== right.kind) return left.kind === 'canonical_location' ? -1 : 1;
      return left.label.localeCompare(right.label);
    });

    return combined.slice(0, safeLimit);
  }

  async resolveSelection(
    selection: SearchDiscoverySelection,
    options: { journey?: SearchJourneyId } = {},
  ): Promise<SearchDiscoverySelectionResolution> {
    if (selection.kind === 'search_area') {
      if (!isSearchAreaId(selection.searchAreaId)) {
        return {
          status: 'unavailable',
          reason: 'invalid_selection',
          message: 'The selected Search Area identity is invalid.',
        };
      }

      const resolution = await this.searchAreaAuthority.resolveSearchArea(selection.searchAreaId, {
        ...(options.journey ? { journey: options.journey } : {}),
        ...(this.mode === 'controlled_acceptance' ? { includePreview: true } : {}),
      });
      if (resolution.status === 'unavailable') {
        return {
          status: 'unavailable',
          reason: resolution.reason === 'preview_only' ? 'preview_only' : 'search_area_unavailable',
          message:
            resolution.reason === 'preview_only'
              ? 'This Search Area remains preview-only.'
              : 'The selected Search Area is unavailable.',
        };
      }

      return {
        status: 'resolved',
        selection,
        scope: { kind: 'search_area', searchAreaId: resolution.summary.searchAreaId },
        label: resolution.summary.label,
        searchAreaSummary: resolution.summary,
      };
    }

    const factualLocationId = selection.factualLocationId;
    if (factualLocationId !== undefined) {
      if (!isFactualGeographyId(factualLocationId)) {
        return {
          status: 'unavailable',
          reason: 'invalid_selection',
          message: 'The selected factual geography identity is invalid.',
        };
      }

      const projection = this.projectionAuthority.resolveFactualLocation(factualLocationId);
      if (projection.status !== 'resolved' || !projection.projection.runtimeNaturalKey) {
        return {
          status: 'unavailable',
          reason: 'factual_identity_unresolved',
          message: 'The selected factual geography has no executable runtime projection.',
        };
      }

      const runtime = await this.runtimeGeographyAuthority.resolveRuntimeNaturalKey(
        projection.projection.runtimeNaturalKey,
        projection.projection.runtimeSearchScopeKind!,
      );
      if (!runtime) {
        return {
          status: 'unavailable',
          reason: 'factual_runtime_unresolved',
          message: 'The selected factual geography is not executable in this environment.',
        };
      }

      if (
        selection.canonicalLocationId &&
        selection.canonicalLocationId !== runtime.canonicalLocationId
      ) {
        return {
          status: 'unavailable',
          reason: 'canonical_identity_mismatch',
          message: 'The selected factual identity does not match its runtime compatibility handle.',
        };
      }

      return {
        status: 'resolved',
        selection,
        scope: scopeForRuntimeRecord(runtime),
        label: projection.projection.factualPreferredName,
        factualLocationId,
      };
    }

    const parsed = parseCanonicalLocationId(selection.canonicalLocationId);
    if (!parsed) {
      return {
        status: 'unavailable',
        reason: 'invalid_selection',
        message: 'The selected canonical location identity is invalid.',
      };
    }

    const resolved = await this.publicLocationResolver.resolvePublicLocation({
      locationId: encodeCanonicalLocationId(parsed.level, parsed.id),
    });
    if (resolved.status !== 'resolved' || !resolved.location) {
      return {
        status: 'unavailable',
        reason: 'canonical_location_unresolved',
        message: resolved.message || 'The selected canonical location is unavailable.',
      };
    }

    const selected =
      resolved.location.suburb || resolved.location.city || resolved.location.province;
    return {
      status: 'resolved',
      selection,
      scope: scopeForResolvedLocation(resolved.location),
      label: selected.name,
    };
  }
}

export const searchDiscoveryService = new SearchDiscoveryService();
