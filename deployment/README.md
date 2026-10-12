# Reviewed Railway service settings

These JSON files are service-setting fragments for an explicitly reviewed
provider plan. Railway does not discover or apply them during a build. Do not
select them as a Railway Config File.

Railway rejects new Config as Code file selections. A default repository
`railway.json` also overrides dashboard commands, healthchecks and restart
policies on legacy services, so an API default can start the wrong process on
a worker. This repository intentionally has no default `railway.json` or
`railway.toml`.

- `railway-api-service-settings.json` preserves the API build, startup,
  readiness, draining and restart contract. Apply these settings to the exact
  API service as part of its separately approved release.
- `railway-worker-admission-service-settings.json` defines the read-only
  diagnostic build/start settings, empty pre-deploy work and NEVER restart.
  Apply only to the exact approved worker, additionally clearing its cron and
  healthcheck. Supply all six independently approved expectation inputs.

Build a minimal `services.<approved-service-id>` environment patch from the
fragment's `build` and `deploy` objects. Commit the explicit patch with
`skipDeploys:true`; never commit pending staged work. Deploy the exact approved
merged commit separately. Verify the effective deployment settings and an
empty repository file manifest before accepting runtime evidence.

The existing `railway.email-worker.json` and `railway.lead-job.json` are legacy
non-default files. They are not selected by worker admission, which requires a
null custom Config File setting. They must not be used to open a worker or cron
without that service's separately reviewed normal-operation plan.

This source change does not migrate project ownership to IaC or modify running
deployments. Current deployed API/frontend source and all worker, public and
commercial holds stay under their existing release approvals.
