# Architecture Map - Development Wizard

## Scope
High-level flow for the development listing wizard from UI to tRPC to services and database.

## Request Flow (Happy Path)
Client (React) -> tRPC client -> server `appRouter` -> `developerRouter` -> `developmentService` -> MySQL tables

## Components and Data Flow

### Client Wizard
- Development wizard shell and state: `client/src/components/development-wizard/DevelopmentWizard.tsx`
- Canonical wizard data builder: `client/src/hooks/useDevelopmentWizard.ts`
- Phase inputs that feed the publish payload:
  - Identity: `client/src/components/development-wizard/phases/IdentityPhase.tsx`
  - Location: `client/src/components/development-wizard/phases/LocationPhase.tsx`
  - Amenities: `client/src/components/development-wizard/phases/AmenitiesPhase.tsx`
  - Marketing summary: `client/src/components/development-wizard/phases/OverviewPhase.tsx`
  - Media uploads: `client/src/components/development-wizard/phases/MediaPhase.tsx`
  - Unit types: `client/src/components/development-wizard/phases/UnitTypesPhase.tsx`
  - Review/publish: `client/src/components/development-wizard/phases/FinalisationPhase.tsx`

### tRPC Boundary
- Client creates a typed tRPC client: `client/src/lib/trpc.ts` (export `trpc`)
- Server router wiring: `server/routers.ts` (export `appRouter`, wiring `developer: developerRouter`, `upload: uploadRouter`)
- Development endpoints: `server/developerRouter.ts` (export `developerRouter` with procedures `createDevelopment`, `updateDevelopment`, `publishDevelopment`)
- Uploads (presigned URLs for media): `server/uploadRouter.ts` (export `uploadRouter` with procedure `presign`)

### Services
- Core business logic for development create/update/publish and unit type persistence:
  - `server/services/developmentService.ts` (exports `createDevelopment`, `updateDevelopment`, `publishDevelopment`, `persistUnitTypes`)
- Draft sanitization utility (defined, not wired in router at time of review):
  - `server/lib/sanitizeDraftData.ts` (export `sanitizeDraftData`; imported in `server/developerRouter.ts` but no invocation in that file)

### Database (Drizzle Schema)
- Developments table: `drizzle/schema.ts`
- Unit types table: `drizzle/schema.ts`
- Drafts table: `drizzle/schema.ts`

## Key Flows

### Draft Save and Resume
1) UI builds draft data from `useDevelopmentWizard.getDraftData()` and submits via `trpc.developer.saveDraft` (client call in `client/src/components/development-wizard/DevelopmentWizard.tsx`).
2) Server-side tRPC procedures `saveDraft`/`getDraft` are not present in `server/developerRouter.ts` (no exports with those procedure names in that file).
3) A service exists to persist drafts: `server/services/developmentService.ts` (export `saveDraft`), which inserts into `development_drafts` in `drizzle/schema.ts`.

### Create or Update Development
1) UI composes canonical payload in `client/src/components/development-wizard/phases/FinalisationPhase.tsx` (handlePublish).
2) tRPC call to `developerRouter` procedures:
   - create: `server/developerRouter.ts` export `developerRouter` -> procedure `createDevelopment`
   - update: `server/developerRouter.ts` export `developerRouter` -> procedure `updateDevelopment`
3) Service methods write to DB:
   - `server/services/developmentService.ts` export `createDevelopment`
   - `server/services/developmentService.ts` export `updateDevelopment`

### Publish Development
1) UI calls `developer.publishDevelopment` (client call in `client/src/components/development-wizard/phases/FinalisationPhase.tsx`).
2) Server validation is enforced in `server/developerRouter.ts` (local helper `assertPublishable`, used in procedure `publishDevelopment`).
3) Publish persistence via `server/services/developmentService.ts` (export `publishDevelopment`).

### Media Uploads
1) UI requests a presigned URL via `uploadRouter` procedure `presign` (`server/uploadRouter.ts`).
2) Browser uploads file directly to S3 (client-side `fetch` in `client/src/components/development-wizard/phases/MediaPhase.tsx` and `UnitTypesPhase.tsx`).
3) Public URLs are stored by services in DB columns:
   - `developments.images`, `developments.videos`, `developments.brochures` in `server/services/developmentService.ts` (create/update logic).
   - `unit_types.base_media` in `server/services/developmentService.ts` (export `persistUnitTypes`).

## Tables Involved (Primary)
- `developments`
- `unit_types`
- `development_drafts`

## References
- `client/src/components/development-wizard/DevelopmentWizard.tsx`
- `client/src/components/development-wizard/phases/IdentityPhase.tsx`
- `client/src/components/development-wizard/phases/LocationPhase.tsx`
- `client/src/components/development-wizard/phases/AmenitiesPhase.tsx`
- `client/src/components/development-wizard/phases/OverviewPhase.tsx`
- `client/src/components/development-wizard/phases/MediaPhase.tsx`
- `client/src/components/development-wizard/phases/UnitTypesPhase.tsx`
- `client/src/components/development-wizard/phases/FinalisationPhase.tsx`
- `client/src/hooks/useDevelopmentWizard.ts`
- `client/src/lib/trpc.ts`
- `server/routers.ts`
- `server/developerRouter.ts`
- `server/uploadRouter.ts`
- `server/services/developmentService.ts`
- `server/lib/sanitizeDraftData.ts`
- `drizzle/schema.ts`
