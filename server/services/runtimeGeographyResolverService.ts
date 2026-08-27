import {
  canonicalLevelForRuntimeSearchScopeKind,
  isRuntimeNaturalKey,
  type FactualRuntimeProjectionAuthority,
  type RuntimeSearchScopeKind,
} from '../../shared/factualRuntimeGeographyBridge';
import { encodeCanonicalLocationId } from '../../shared/locationAuthority';
import { locationResolver, type PublicLocationResolutionResult } from './locationResolverService';
import type { RuntimeGeographyAuthority, RuntimeGeographyAuthorityRecord } from './runtimeGeographyAuthority';
import { gautengFactualRuntimeProjectionAuthority } from './governedRuntimeGeographyReference';

interface ExactPublicLocationResolver {
  resolvePublicLocation(options: {
    provinceSlug?: string;
    citySlug?: string;
    suburbSlug?: string;
  }): Promise<PublicLocationResolutionResult>;
}

function expectedKeySegmentCount(scopeKind: RuntimeSearchScopeKind): number {
  if (scopeKind === 'province') return 1;
  if (scopeKind === 'metro_city') return 2;
  return 3;
}

function isNaturalKeySegment(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function createRuntimeGeographyAuthority(options: {
  projectionAuthority: FactualRuntimeProjectionAuthority;
  publicLocationResolver: ExactPublicLocationResolver;
}): RuntimeGeographyAuthority {
  return {
    async resolveRuntimeNaturalKey(
      runtimeNaturalKey: string,
      scopeKind: RuntimeSearchScopeKind,
    ): Promise<RuntimeGeographyAuthorityRecord | null> {
      if (!isRuntimeNaturalKey(runtimeNaturalKey)) return null;

      const projection = options.projectionAuthority.resolveNaturalKey(runtimeNaturalKey);
      if (projection.status !== 'resolved') return null;
      if (projection.projection.runtimeSearchScopeKind !== scopeKind) return null;

      const segments = runtimeNaturalKey.split('/');
      if (
        segments.length !== expectedKeySegmentCount(scopeKind) ||
        segments.some(segment => !isNaturalKeySegment(segment))
      ) {
        return null;
      }

      const [provinceSlug, citySlug, suburbSlug] = segments;
      const resolved = await options.publicLocationResolver.resolvePublicLocation({
        provinceSlug,
        ...(citySlug ? { citySlug } : {}),
        ...(suburbSlug ? { suburbSlug } : {}),
      });
      if (resolved.status !== 'resolved' || !resolved.location) return null;

      const expectedLevel = canonicalLevelForRuntimeSearchScopeKind(scopeKind);
      if (resolved.location.level !== expectedLevel) return null;

      const location = resolved.location;
      if (location.province.slug !== provinceSlug) return null;
      if (citySlug && (!location.city || location.city.slug !== citySlug)) return null;
      if (suburbSlug && (!location.suburb || location.suburb.slug !== suburbSlug)) return null;
      if (expectedLevel === 'province') {
        return {
          canonicalLocationId: encodeCanonicalLocationId('province', location.province.id),
          level: 'province',
          name: location.province.name,
          slug: location.province.slug,
          provinceName: location.province.name,
          latitude: location.province.latitude,
          longitude: location.province.longitude,
          provinceCode: location.province.code,
          runtimeNaturalKey,
          scopeKind,
          factualLocationId: projection.projection.factualLocationId,
          factualPreferredName: projection.projection.factualPreferredName,
          factualType: projection.projection.factualType,
        };
      }

      if (expectedLevel === 'city' && location.city) {
        return {
          canonicalLocationId: encodeCanonicalLocationId('city', location.city.id),
          level: 'city',
          name: location.city.name,
          slug: location.city.slug,
          provinceName: location.province.name,
          latitude: location.city.latitude,
          longitude: location.city.longitude,
          isMetro: location.city.isMetro,
          provinceCode: location.province.code,
          parentCanonicalLocationId: encodeCanonicalLocationId(
            'province',
            location.city.provinceId,
          ),
          parentName: location.province.name,
          parentSlug: location.province.slug,
          runtimeNaturalKey,
          scopeKind,
          factualLocationId: projection.projection.factualLocationId,
          factualPreferredName: projection.projection.factualPreferredName,
          factualType: projection.projection.factualType,
        };
      }

      if (expectedLevel === 'suburb' && location.city && location.suburb) {
        return {
          canonicalLocationId: encodeCanonicalLocationId('suburb', location.suburb.id),
          level: 'suburb',
          name: location.suburb.name,
          slug: location.suburb.slug,
          provinceName: location.province.name,
          cityName: location.city.name,
          latitude: location.suburb.latitude,
          longitude: location.suburb.longitude,
          postalCode: location.suburb.postalCode,
          provinceCode: location.province.code,
          parentCanonicalLocationId: encodeCanonicalLocationId('city', location.suburb.cityId),
          parentName: location.city.name,
          parentSlug: location.city.slug,
          runtimeNaturalKey,
          scopeKind,
          factualLocationId: projection.projection.factualLocationId,
          factualPreferredName: projection.projection.factualPreferredName,
          factualType: projection.projection.factualType,
        };
      }

      return null;
    },
  };
}

export const governedRuntimeGeographyAuthority = createRuntimeGeographyAuthority({
  projectionAuthority: gautengFactualRuntimeProjectionAuthority,
  publicLocationResolver: locationResolver,
});
