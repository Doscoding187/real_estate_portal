import {
  LOCATION_AUTHORITY_CATALOG,
  LOCATION_AUTHORITY_CATALOG_SHA256,
  locationAuthorityProjectionAuthority,
} from '../locationAuthorityCatalog';

const gautengSource = LOCATION_AUTHORITY_CATALOG.sources.find(
  source => source.source.sourceId === 'za-gp',
);

if (!gautengSource) {
  throw new Error('Registered location authority source za-gp is unavailable.');
}

export const GAUTENG_LOCATION_AUTHORITY_SOURCE = gautengSource;
export const GAUTENG_RUNTIME_REFERENCE_PROJECTION = gautengSource.projection;
export const GAUTENG_FACTUAL_RUNTIME_PROJECTION_ENTRIES = gautengSource.factualEntries;
export const gautengFactualRuntimeProjectionAuthority = locationAuthorityProjectionAuthority;
export const LOCATION_AUTHORITY_SOURCE_INDEX_SHA256 = LOCATION_AUTHORITY_CATALOG_SHA256;
