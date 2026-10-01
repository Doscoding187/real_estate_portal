import {
  LOCATION_AUTHORITY_CATALOG,
  LOCATION_AUTHORITY_CATALOG_SHA256,
} from '../server/locationAuthorityCatalog';

if (LOCATION_AUTHORITY_CATALOG.sources.length === 0) {
  throw new Error('Location authority catalog has no registered sources.');
}

console.log(
  [
    'location-authority:check',
    `catalog=${LOCATION_AUTHORITY_CATALOG.catalog.catalogId}`,
    `index_sha256=${LOCATION_AUTHORITY_CATALOG_SHA256}`,
    `sources=${LOCATION_AUTHORITY_CATALOG.sources.length}`,
    `runtime_rows=${LOCATION_AUTHORITY_CATALOG.runtimeRows.length}`,
    `factual_entries=${LOCATION_AUTHORITY_CATALOG.factualEntries.length}`,
    `co_published_keys=${LOCATION_AUTHORITY_CATALOG.coPublications.length}`,
  ].join(' '),
);
