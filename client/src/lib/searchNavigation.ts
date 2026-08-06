import { parseCanonicalLocationId } from '@shared/locationAuthority';
import type { LocationNode } from '@/types/location';
import {
  generateIntentUrl,
  resolveExplicitTransactionType,
  resolveSearchIntent,
  type TransactionType,
} from './searchIntent';
import { buildLocationDiscoveryPath } from './locationDiscovery';

type SearchCriteria = Record<string, unknown>;

function appendCriteria(params: URLSearchParams, criteria: SearchCriteria) {
  Object.entries(criteria).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item !== undefined && item !== null && item !== '') {
          params.append(key, String(item));
        }
      });
      return;
    }

    params.set(key, String(value));
  });
}

function slug(value: string | null): string | undefined {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return normalized && !normalized.includes('/') ? normalized : undefined;
}

function buildNeutralPathFromParams(params: URLSearchParams): string | undefined {
  const locationId = params.get('locationId')?.trim();
  const parsed = parseCanonicalLocationId(locationId);
  if (!parsed) return undefined;

  const province = slug(params.get('province'));
  const city = slug(params.get('city'));
  const suburb = slug(params.get('suburb'));
  const locationSlug =
    parsed.level === 'province' ? province : parsed.level === 'city' ? city : suburb;

  if (!locationSlug) return undefined;
  if (parsed.level === 'province' && (city || suburb)) return undefined;
  if (parsed.level === 'city' && (!province || suburb)) return undefined;
  if (parsed.level === 'suburb' && (!province || !city)) return undefined;

  const location: LocationNode = {
    id: locationId!,
    canonicalLocationId: locationId,
    slug: locationSlug,
    name: locationSlug,
    type: parsed.level,
    provinceSlug: province,
    citySlug: city,
  };

  return buildLocationDiscoveryPath(location);
}

function canonicalTransactionPath(transactionType: TransactionType): string {
  if (transactionType === 'to-rent') return '/property-to-rent';
  if (transactionType === 'developments') return '/new-developments';
  return '/property-for-sale';
}

/**
 * Converts a legacy criteria object into one canonical destination without
 * inventing a transaction when the record does not declare one.
 */
export function buildCanonicalSearchUrl(criteria: SearchCriteria): string {
  const params = new URLSearchParams();
  appendCriteria(params, criteria);

  const resolution = resolveExplicitTransactionType('/properties', params);
  if (resolution.invalid) return '/';

  if (!resolution.transactionType) return buildNeutralPathFromParams(params) || '/';

  const root = canonicalTransactionPath(resolution.transactionType);
  const intent = resolveSearchIntent(root, {}, params);
  return generateIntentUrl({ ...intent, transactionType: resolution.transactionType });
}

/**
 * Compatibility boundary for the retired generic /properties route.
 * Explicit transaction state is canonicalized; geography-only state remains
 * neutral; incomplete state returns to the journey chooser.
 */
export function buildPropertiesCompatibilityRedirect(search: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const criteria: SearchCriteria = {};
  params.forEach((value, key) => {
    const existing = criteria[key];
    if (existing === undefined) criteria[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else criteria[key] = [existing, value];
  });
  return buildCanonicalSearchUrl(criteria);
}

export function getListingTypeForPath(path: string, search: string): 'sale' | 'rent' | null {
  const resolution = resolveExplicitTransactionType(path, new URLSearchParams(search));
  if (resolution.transactionType === 'for-sale') return 'sale';
  if (resolution.transactionType === 'to-rent') return 'rent';
  return null;
}
