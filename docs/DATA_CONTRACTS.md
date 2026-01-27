# Data Contracts - Development Wizard

## Scope
Maps UI fields in the development wizard to tRPC inputs and database columns for:
- Development
- UnitTypes
- Media

Required vs optional is based on:
- Server publish validation (`server/developerRouter.ts` -> helper `assertPublishable`)
- Database NOT NULL constraints (`drizzle/schema.ts`)
- Client-side required UI hints (not always enforced server-side)

## Development

### Field Mapping
| UI field (phase) | API input (tRPC payload) | DB column(s) | Required | Notes / Sanitization |
| --- | --- | --- | --- | --- |
| Development name (IdentityPhase) | `name` | `developments.name` | Create + Publish | Required by `developerRouter` procedure `createDevelopment` input and `assertPublishable` (`server/developerRouter.ts`). |
| Subtitle/Tagline (Identity/Overview) | `subtitle`, `tagline` | `developments.subtitle`, `developments.tagline` | Optional | Both keys are set in `FinalisationPhase` for compatibility. |
| Development type (Type selector) | `developmentType` | `developments.development_type` | Optional (defaults) | `createDevelopment` in `server/services/developmentService.ts` defaults to `residential` if missing; enum is enforced there. |
| Nature (IdentityPhase) | `nature` | `developments.nature` | Optional | Publish validation in `server/developerRouter.ts` only accepts `new` or `phase`. |
| Marketing role (IdentityPhase + listingIdentity) | `marketingRole` | `developments.marketing_role` | Optional | Passed on create payload. |
| Status (IdentityPhase) | `status` | `developments.status` | Optional (UI-required) | DB default is `launching-soon` in `drizzle/schema.ts`; not enforced in `assertPublishable`. |
| Completion date (IdentityPhase) | `completionDate` | `developments.completion_date` | Optional | String date. |
| Launch date (IdentityPhase) | `launchDate` | `developments.launch_date` | Schema drift | `launchDate` is used in `server/services/developmentService.ts` update payload, but `developments.launch_date` is not present in `drizzle/schema.ts` (only `development_phases.launch_date` exists). |
| Description (OverviewPhase) | `description` | `developments.description` | Optional | UI shows length guidance in `client/src/components/development-wizard/phases/OverviewPhase.tsx`; no server-side validation found. |
| Highlights (OverviewPhase) | `highlights` | `developments.highlights` | Optional | Stored as JSON string in `server/services/developmentService.ts`. |
| Amenities (AmenitiesPhase) | `amenities` | `developments.amenities` | Optional | Stored as JSON string in `server/services/developmentService.ts` (TEXT column in `drizzle/schema.ts`). |
| Features (FinalisationPhase derived) | `features` | `developments.features` | Optional | Stored as JSON string in `server/services/developmentService.ts`. |
| Address (LocationPhase) | `address` | `developments.address` | Publish | Required by `assertPublishable` in `server/developerRouter.ts`. |
| City (LocationPhase) | `city` | `developments.city` | Create + Publish | `developments.city` is NOT NULL in `drizzle/schema.ts`; `assertPublishable` requires it. |
| Province (LocationPhase) | `province` | `developments.province` | Create + Publish | `developments.province` is NOT NULL in `drizzle/schema.ts`; `assertPublishable` requires it. |
| Suburb (LocationPhase) | `suburb` | `developments.suburb` | Optional | Column exists in `drizzle/schema.ts`. |
| Postal code (LocationPhase) | `postalCode` | `developments.postal_code` | Optional | Column exists in `drizzle/schema.ts`. |
| Latitude / Longitude (LocationPhase) | `latitude`, `longitude` | `developments.latitude`, `developments.longitude` | Optional | Stored as strings. |
| Price from/to (FinalisationPhase computed) | `priceFrom`, `priceTo` | `developments.price_from`, `developments.price_to` | Optional | Computed from unit base price + extras. |
| Levy range (FinalisationPhase) | `monthlyLevyFrom`, `monthlyLevyTo` | `developments.monthly_levy_from`, `developments.monthly_levy_to` | Optional | Columns exist in `drizzle/schema.ts`. |
| Rates range (FinalisationPhase) | `ratesFrom`, `ratesTo` | `developments.rates_from`, `developments.rates_to` | Optional | Columns exist in `drizzle/schema.ts`. |
| Transfer costs included (FinalisationPhase) | `transferCostsIncluded` | `developments.transfer_costs_included` | Optional | Column exists in `drizzle/schema.ts`; `updateDevelopment` in `server/services/developmentService.ts` merges into `estateSpecs` rather than updating the column directly. |
| Total units (FinalisationPhase) | `totalUnits` | `developments.total_units` | Optional | Not enforced server-side. |
| Available units (FinalisationPhase) | `availableUnits` | `developments.available_units` | Optional | Not enforced server-side. |
| Total development area (FinalisationPhase) | `totalDevelopmentArea` | `developments.total_development_area` | Optional | Stored as integer. |
| SEO title/description (FinalisationPhase) | `metaTitle`, `metaDescription` | `developments.meta_title`, `developments.meta_description` | Optional | Columns exist in `drizzle/schema.ts`. |
| SEO keywords (FinalisationPhase) | `keywords` | `developments.keywords` | Schema drift | `keywords` is written in `server/services/developmentService.ts`, but no `developments.keywords` column in `drizzle/schema.ts`. |

### Enums (Source: `drizzle/schema.ts`)
- `developments.development_type`: `residential`, `commercial`, `mixed_use`, `land`
- `developments.status`: `launching-soon`, `selling`, `sold-out`
- `developments.nature`: `new`, `phase`, `extension`, `redevelopment` (UI options in `client/src/types/wizardTypes.ts` omit `redevelopment`)
- `developments.marketing_role`: `exclusive`, `joint`, `open`

## UnitTypes

### Field Mapping
| UI field (UnitTypesPhase) | API input (payload unitTypes[]) | DB column(s) | Required | Notes / Sanitization |
| --- | --- | --- | --- | --- |
| Unit ID | `unitTypes[].id` | `unit_types.id` | Optional | Server generates UUID if missing. |
| Name | `unitTypes[].name` | `unit_types.name`, `unit_types.label` | Publish | Required by publish validation. |
| Bedrooms | `unitTypes[].bedrooms` | `unit_types.bedrooms` | Publish | Required by publish validation. |
| Bathrooms | `unitTypes[].bathrooms` | `unit_types.bathrooms` | Publish | Required by publish validation. |
| Unit size | `unitTypes[].unitSize` | `unit_types.unit_size` | Optional | Int. |
| Size range | `unitTypes[].sizeFrom`, `unitTypes[].sizeTo` | `unit_types.size_from`, `unit_types.size_to` | Optional | Int. |
| Yard size | `unitTypes[].yardSize` | `unit_types.yard_size` | Optional | Int. |
| Base price from | `unitTypes[].basePriceFrom` | `unit_types.base_price_from` | Publish | Required by publish validation. |
| Price from/to | `unitTypes[].priceFrom`, `unitTypes[].priceTo` | `unit_types.price_from`, `unit_types.price_to` | Optional | `priceTo` auto-calculated in UI. |
| Extras | `unitTypes[].extras` | `unit_types.extras` | Optional | Stored as JSON string. |
| Parking kind/bays | `unitTypes[].parkingType`, `unitTypes[].parkingBays` | `unit_types.parking`, `unit_types.parking_type`, `unit_types.parking_bays` | Publish | Server maps to enum (`none`, `1`, `2`, `carport`, `garage`) + type detail. |
| Total units | `unitTypes[].totalUnits` | `unit_types.total_units` | Optional | UI enforces, server defaults to 0. |
| Available units | `unitTypes[].availableUnits` | `unit_types.available_units` | Optional | Server defaults to 0. |
| Reserved units | `unitTypes[].reservedUnits` | `unit_types.reserved_units` | Optional | Not present in `FinalisationPhase` payload; not mapped in `persistUnitTypes` (`server/services/developmentService.ts`). |
| Deposit required | `unitTypes[].depositRequired` | `unit_types.deposit_required` | Optional | Decimal. |
| Completion date | `unitTypes[].completionDate` | `unit_types.completion_date` | Optional | Date only. |
| Ownership type | `unitTypes[].ownershipType` | `unit_types.ownership_type` | Optional | Enum sanitized server-side. |
| Structural type | `unitTypes[].structuralType` | `unit_types.structural_type` | Optional | Enum sanitized server-side. |
| Floors | `unitTypes[].floors` | `unit_types.floors` | Optional | Enum sanitized server-side. |
| Features (structured) | `unitTypes[].features` | `unit_types.features` | Optional | Stored as JSON string. |
| Specifications (legacy) | `unitTypes[].specifications` | `unit_types.specifications` | Optional | Stored as JSON string. |
| Amenities (legacy) | `unitTypes[].amenities` | `unit_types.amenities` | Optional | Stored as JSON string. |
| Base features | `unitTypes[].baseFeatures` | `unit_types.base_features` | Optional | Stored as JSON string. |
| Base finishes | `unitTypes[].baseFinishes` | `unit_types.base_finishes` | Optional | Stored as JSON string. |
| Spec overrides | `unitTypes[].specOverrides` | `unit_types.spec_overrides` | Optional | Stored as JSON string. |
| Base media | `unitTypes[].baseMedia` | `unit_types.base_media` | Optional | Stored as JSON string. |
| Virtual tour link | `unitTypes[].virtualTourLink` | `unit_types.virtual_tour_link` | Optional | URL string. |
| Internal notes | `unitTypes[].internalNotes` | `unit_types.internal_notes` | Optional | Column exists in `drizzle/schema.ts`. |
| Display order | `unitTypes[].displayOrder` | `unit_types.display_order` | Optional | Defaults to index. |
| Active flag | `unitTypes[].isActive` | `unit_types.is_active` | Optional | Stored as tinyint. |

### Enums (Source: `drizzle/schema.ts`)
- `unit_types.ownership_type`: `full-title`, `sectional-title`, `leasehold`, `life-rights`
- `unit_types.structural_type`: `apartment`, `freestanding-house`, `simplex`, `duplex`, `penthouse`, `plot-and-plan`, `townhouse`, `studio`
- `unit_types.floors`: `single-storey`, `double-storey`, `triplex`
- `unit_types.parking`: `none`, `1`, `2`, `carport`, `garage`

## Media

### Development Media Mapping
| UI field (MediaPhase) | API input | DB column(s) | Required | Notes / Sanitization |
| --- | --- | --- | --- | --- |
| Hero image (photos w/ category `hero` or first photo) | `images[]` | `developments.images` | Publish | `assertPublishable` in `server/developerRouter.ts` checks `media.heroImage` or `images[0]`. Stored as JSON string in `server/services/developmentService.ts`. |
| Gallery photos | `images[]` | `developments.images` | Optional | Stored as JSON string. |
| Videos | `videos[]` | `developments.videos` | Optional | URLs only in current payload. |
| Documents/Brochures | `brochures[]` | `developments.brochures` | Optional (UI-required) | UI shows as required in `client/src/components/development-wizard/phases/MediaPhase.tsx`; no server-side publish validation for brochures. |
| Media object | `media` | `developments.media` | Schema drift | `media` is written in `server/services/developmentService.ts`, but no `developments.media` column in `drizzle/schema.ts`. |

### Unit Media Mapping
| UI field (UnitTypesPhase) | API input | DB column(s) | Required | Notes |
| --- | --- | --- | --- | --- |
| Unit gallery | `unitTypes[].baseMedia.gallery` | `unit_types.base_media` | Optional | Stored as JSON string. |
| Unit floor plans | `unitTypes[].baseMedia.floorPlans` | `unit_types.base_media` | Optional | Stored as JSON string. |

## Sanitization and Validation (Where It Happens)
- Client-side normalization:
  - Wizard data assembly and hero image derivation: `client/src/hooks/useDevelopmentWizard.ts`
  - Publish payload normalization (unit types, media extraction): `client/src/components/development-wizard/phases/FinalisationPhase.tsx`
- Draft sanitization utility:
  - `server/lib/sanitizeDraftData.ts` defines `sanitizeDraftData` (imported in `server/developerRouter.ts`, no invocation found in that file)
- Server-side publish validation:
  - Required fields and unit type validation: `server/developerRouter.ts` (`assertPublishable` and procedure `publishDevelopment`)
- Server-side persistence sanitization:
  - Development fields normalization: `server/services/developmentService.ts` (`createDevelopment`, `updateDevelopment`)
  - Unit type enum/number coercion and JSON serialization: `server/services/developmentService.ts` (`persistUnitTypes`)

## References
- `client/src/components/development-wizard/phases/IdentityPhase.tsx`
- `client/src/components/development-wizard/phases/LocationPhase.tsx`
- `client/src/components/development-wizard/phases/AmenitiesPhase.tsx`
- `client/src/components/development-wizard/phases/OverviewPhase.tsx`
- `client/src/components/development-wizard/phases/MediaPhase.tsx`
- `client/src/components/development-wizard/phases/UnitTypesPhase.tsx`
- `client/src/components/development-wizard/phases/FinalisationPhase.tsx`
- `client/src/hooks/useDevelopmentWizard.ts`
- `client/src/types/wizardTypes.ts`
- `server/developerRouter.ts`
- `server/services/developmentService.ts`
- `server/lib/sanitizeDraftData.ts`
- `server/uploadRouter.ts`
- `drizzle/schema.ts`
