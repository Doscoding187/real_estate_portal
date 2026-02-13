# Demo Gate v1: Super Admin Publishing

## A) Pre-demo Commands
`pnpm build`
`pnpm dev:backend:clean`
`pnpm run dev`

## B) Browser Checklist
1. Login as `super_admin`.
2. Go to `Admin -> Publisher -> Brand Profiles` and create a brand profile.
3. Go to `Add Development`, complete wizard steps, and publish.
4. Confirm the development appears in admin lists and on public fetch/view.
5. Confirm images/media render through CloudFront/S3 URL paths.
6. Confirm admin/developer/agency/agent dashboard overview pages load without crashes.

## C) Troubleshooting
- If `EADDRINUSE` on port `5000`: run `pnpm dev:backend:clean`.
- If `No "query"/"mutation"-procedure on path` error: confirm router mount in `server/routers.ts`, then rerun `pnpm build`.
- If S3 is missing: verify `.env.local` has AWS keys + bucket + region; if unavailable, keep demo on safe JSON/path stubs and proceed without hard-failing publish flow.

## D) Ticket 8 + 9 Verification (Leads + Search)
Commands:
`rg "trpc\.developer\.createLead|trpc\.leads\.create|trpc\.properties\.search|trpc\.properties\.searchDevelopments" client/src -n`
`rg "createLead|searchDevelopments|includeDevelopments|getBrandLeads|getRecentLeads|getMyLeads|updateLeadStatus" server -n`

Manual lead flow check:
1. Submit a lead from property detail (`PropertyContactModal`).
2. Submit a lead from agent profile (`AgentDetail`).
3. Submit a lead from development lead form (`LeadCaptureForm`).
4. Confirm visibility in:
   - Super Admin brand leads (`superAdminPublisher.getBrandLeads`) when brand-linked.
   - Agency recent leads (`agency.getRecentLeads`) when agency-linked.
   - Agent pipeline/my leads (`agent.getLeadsPipeline`, `agent.getMyLeads`) when agent-linked.
5. Change status in agent flow (`agent.updateLeadStatus` / `agent.moveLeadToStage`) and confirm no crash.

Manual search flow check:
1. Run property search in an area with known published developments.
2. Confirm `properties.search` returns `developments.items` when `includeDevelopments: true`.
3. Confirm Search Results page shows `New Developments Nearby` module.
4. Confirm direct development-only API path works via `properties.searchDevelopments`.

## Stubs/Hardening Added (Why)
- `server/services/recommendationEngineService.ts`
  Stopped importing missing `exploreUserPreferencesNew`; uses safe default profile to prevent backend boot crash.
- `server/services/publicLeadCaptureService.ts`
  Added a centralized lead-capture pipeline to resolve ownership safely (property/development/agent/agency/brand) and avoid FK crashes on missing parent records.
- `server/leadsRouter.ts`
  Added missing `trpc.leads.create` procedure used by public property and agent contact forms.
  Added lightweight abuse controls for demo safety: honeypot (`website`) + in-memory IP rate limiting.
- `server/developerRouter.ts`
  Added missing `saveDraft`, `getDraft`, `getDrafts`, `deleteDraft` procedures used by client.
  Added `createLead` public procedure used by development lead forms.
  Added safe fallback for `getDashboardKPIs` (zero-shape KPI object).
  Hardened `getDevelopment` to return `null` on missing/unauthorized/error instead of crashing.
- `server/routers.ts`
  Mounted `leads` router.
  Extended `properties.search` with optional `includeDevelopments` contract for mixed results.
  Added `properties.searchDevelopments` for development-only discovery path.
- `client/src/pages/SearchResults.tsx`
  Enabled `includeDevelopments` and added a `New Developments Nearby` module for property search path.
- `client/src/components/property/PropertyContactModal.tsx`
  Added `agentId`/`agencyId` forwarding to improve lead owner linkage.
- `client/src/pages/PropertyDetail.tsx`
  Passed through optional owner linkage IDs to contact modal.
- `server/adminRouter.ts`
  `getAnalytics` and `getListingStats` now return safe zero shapes on failure.
- `server/agencyRouter.ts`
  `getDashboardStats` and `getPerformanceData` now return safe defaults when context/data is missing.
- `server/agentRouter.ts`
  `getDashboardStats` now returns safe zero defaults on query/runtime failure.
- `server/superAdminPublisherRouter.ts`
  Hardened `getDevelopments`, `getBrandLeads`, and `getGlobalMetrics` with safe fallback responses.
