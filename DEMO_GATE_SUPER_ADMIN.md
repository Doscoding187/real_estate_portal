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

## Stubs/Hardening Added (Why)
- `server/services/recommendationEngineService.ts`
  Stopped importing missing `exploreUserPreferencesNew`; uses safe default profile to prevent backend boot crash.
- `server/developerRouter.ts`
  Added missing `saveDraft`, `getDraft`, `getDrafts`, `deleteDraft` procedures used by client.
  Added safe fallback for `getDashboardKPIs` (zero-shape KPI object).
  Hardened `getDevelopment` to return `null` on missing/unauthorized/error instead of crashing.
- `server/adminRouter.ts`
  `getAnalytics` and `getListingStats` now return safe zero shapes on failure.
- `server/agencyRouter.ts`
  `getDashboardStats` and `getPerformanceData` now return safe defaults when context/data is missing.
- `server/agentRouter.ts`
  `getDashboardStats` now returns safe zero defaults on query/runtime failure.
- `server/superAdminPublisherRouter.ts`
  Hardened `getDevelopments`, `getBrandLeads`, and `getGlobalMetrics` with safe fallback responses.
