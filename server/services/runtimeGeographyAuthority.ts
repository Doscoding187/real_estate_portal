import type { CanonicalLocationLevel } from '../../shared/locationAuthority';
import type {
  FactualGeographyType,
  RuntimeSearchScopeKind,
} from '../../shared/factualRuntimeGeographyBridge';

export interface RuntimeGeographyAuthorityRecord {
  canonicalLocationId: string;
  level: CanonicalLocationLevel;
  name: string;
  slug: string;
  provinceName?: string;
  cityName?: string;
  latitude?: string;
  longitude?: string;
  postalCode?: string;
  isMetro?: number;
  provinceCode?: string;
  parentCanonicalLocationId?: string;
  parentName?: string;
  parentSlug?: string;
  runtimeNaturalKey: string;
  scopeKind: RuntimeSearchScopeKind;
  factualLocationId: string;
  factualPreferredName: string;
  factualType: FactualGeographyType;
}

/**
 * Server-owned environment resolver. Callers provide a governed natural key
 * and expected executable scope; they never provide a member set or a numeric
 * row ID. Implementations must return null when the target row or hierarchy
 * is not an exact match.
 */
export interface RuntimeGeographyAuthority {
  resolveRuntimeNaturalKey(
    runtimeNaturalKey: string,
    scopeKind: RuntimeSearchScopeKind,
  ): Promise<RuntimeGeographyAuthorityRecord | null>;
}
