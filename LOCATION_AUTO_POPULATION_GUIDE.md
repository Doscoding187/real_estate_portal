# Location Auto-Population System

## Overview

Property Listify resolves location information from Google Places during listing creation. The active listing flow can resolve province, city, and suburb records without requiring operators to run standalone location seed scripts.

## Runtime authority

The active implementation is:

- `server/listingRouter.ts` receives the selected Google Places location data.
- `server/services/locationAutoPopulation.ts` extracts address components and resolves the legacy province, city, and suburb identifiers.
- `server/services/locationPagesServiceEnhanced.ts` resolves or creates canonical location records and synchronizes the legacy location tables where required.

Manual province or location seed scripts are not part of the approved runtime or migration workflow.

## Required listing input

The listing location payload must include:

- a Google Places `placeId`
- the formatted address
- latitude and longitude
- Google Places address components

The runtime uses `administrative_area_level_1` for the province, `locality` or `administrative_area_level_2` for the city, and `sublocality` for the suburb.

## Operational behaviour

When a listing is created:

1. `server/listingRouter.ts` extracts the Google Places components.
2. The location services look for existing matching records.
3. Missing canonical location records may be created by the enhanced location service.
4. The resolved location identifiers are associated with the listing.

## Troubleshooting

### Province is not resolved

Confirm that the Google Places address components contain `administrative_area_level_1` and review the listing and enhanced-location service logs.

### City or suburb is not resolved

Confirm that the payload contains `locality`, `administrative_area_level_2`, or `sublocality` as applicable.

### Duplicate locations appear

The services check existing names and hierarchy relationships before creating records. Investigate normalization or parent-location mismatches rather than running repair or seed scripts.

## Verification

Create a listing using a valid Google Places selection and verify the resolved province, city, and suburb through the normal listing flow.

Database schema changes must use the canonical commands documented in `server/migrations/README.md`. Do not use standalone location scripts as migration or schema authority.
