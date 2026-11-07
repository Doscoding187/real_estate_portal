# Release tooling image (Container Apps jobs only)

Runs release tooling that needs a real git checkout (legal-release installer,
runtime-grant probes). The API Dockerfile cannot: it has no `.git`, git, `scripts/` or pnpm.

## Build

1. Create a staging dir with a clean clone of the merged commit in `src/`
   (keep `.git`).
2. Copy `ops/tooling-image/Dockerfile` and `ops/tooling-image/.dockerignore` to the staging root.
3. Build (az acr build only honours the `.dockerignore` at the context root):

   `az acr build -r propertylistifyacr -t release-tooling:<12-char sha> -f <staging>/Dockerfile <staging>`

The build fails if the tree is dirty.

## Run

The image has no CMD; the job supplies the command, for example:

- `node --import tsx scripts/databaseAuthorityCli.ts legal-release:plan --packet=...`
- `pnpm db:runtime-grants:0197:probe`

The installer refuses in app replicas (CONTAINER_APP_NAME / REVISION / REPLICA_NAME) and
requires CONTAINER_APP_JOB_NAME and CONTAINER_APP_JOB_EXECUTION_NAME.
