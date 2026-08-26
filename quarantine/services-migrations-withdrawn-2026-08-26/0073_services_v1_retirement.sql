-- Services v1 authority retirement (approved same-release-train convergence).
-- Pre-launch: no production data exists on these authorities. Dev-worktree rows
-- are disposable evidence and are intentionally not backfilled.
-- Approval: SVC-FS-1-services-v1-retirement-2026-08-26-Edward

DROP TABLE `service_lead_events`;
DROP TABLE `service_leads`;
DROP TABLE `service_provider_reviews`;
DROP TABLE `service_explore_videos`;
DROP TABLE `service_provider_subscriptions`;
DROP TABLE `service_provider_services`;
DROP TABLE `service_provider_locations`;
DROP TABLE `service_provider_profiles`;
DROP TABLE `services`;
