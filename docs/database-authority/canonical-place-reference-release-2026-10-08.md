# Canonical Place reference release

Status: integration candidate for senior review. Hosted CI follows review. Production application is separately approved. This runbook grants no mutation authority.

The authority manifest registers `--adapter=places` on the existing protected reference release commands. `--adapter=geography` still addresses the older numeric catalog and cannot materialise Place authority. Local `places:prepare-national` loads the complete admitted storage packages on disposable targets; it is not a production release command.

The Place release policy is `admitted-national-non-osm-only-v1`. It reads and verifies all nine committed admission packages, their source artifacts and registry pins. D3 holds all 720 `osm_only_odbl_provisional` Places, 807 names, 720 relationships, 736 evidence rows and 750 mappings. There is no flag to clear that hold. Remaining admitted assertions are copied unchanged: 16,944 Places, 25,618 names, 16,935 relationships, 79,189 evidence rows and 19,042 mappings. Every released non-province Place must have a single bounded evidenced chain to one of the nine released province roots. Raw relationship search authorization and SEO eligibility are unchanged. A founder decision about the held set requires a new governed policy candidate; an operation approval cannot override licensing.

The protected adapter admits only the registered Azure production fingerprint `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`. Database authorization must issue a genuine decision for the exact operation, target and credential class. Before application it requires the complete current migration head, physical canonical schema congruency and enforced CHECK constraints. A plan binds the migration manifest, registry, package pins, licensing hold, desired assertions and observed target assertions. It refuses foreign identities, duplicate assertions, changed values, changed plans and ambiguous containment. Application holds the named session lock, inserts Places before their dependants in one transaction, verifies every governed column before COMMIT, and repeats with zero writes. There are no updates, deletions, provider suburb inserts, legacy ID remaps or label backfills.

The target must be frozen against competing reference writers for application. The named lock coordinates this release protocol; it is not a claim that unrelated writers are locked. Connection loss, COMMIT failure or lock-release failure is an ambiguous outcome: preserve evidence, inspect read-only and obtain a fresh review before any further apply. Never blindly replay.

## Senior review corrections to 66c0dd84

The correction candidate continues the same integration branch. Discovery coverage signals are operational research records, not admitted reference assertions. Only the exact writer contract is accepted: null Place and provider-record IDs, unresolved/ambiguous kind, recorded state, bounded nonempty subject, `property_listify_search` provider, the exact non-authorising note and priority 0 or 1. All other evidence identities and all admitted values remain strictly reconciled. Validated operational counts are reported separately and do not bind the immutable reference plan digest; discovery may record or raise priority between plan and apply. Neither reconciliation nor replay deletes signals.

The inspector checks `listings.canonical_place_id`, `properties.canonical_place_id` and `saved_searches.place_id`. Absent, complete and partial installation states are tested.

Application uses parameterised multi-row inserts in dependency order, with at most **250 rows**, **4,096 parameters** and **262,144 estimated payload bytes** per statement. The conservative payload estimate includes UTF-8 SQL, JSON-encoded bind values and 16 framing bytes per parameter; it is not a network packet measurement. A row that cannot fit is refused. All batches remain in one transaction, with exact plan comparison after lock acquisition and complete assertion verification before COMMIT. No partial-table commit or automatic retry exists. Reports include insert counts by table, observed batch maxima and elapsed operation milliseconds. The operation clock starts after lock acquisition and includes transaction reconciliation, insertion, verification, COMMIT and lock cleanup; it excludes source loading and preflight. Local timing does not predict Azure timing. Production review must still set its release-window budget, monitoring and incident handoff before approving an apply; do not use a client timeout as permission to replay.

A successful release requires `RELEASE_LOCK` to return 1. A false/null/missing result or exception prevents a clean-success report. Errors retain the original operation cause plus independent cleanup/rollback errors and an explicit outcome:

- `not-committed`: no COMMIT attempted; any started transaction rolled back successfully.
- `rollback-uncertain`: rollback acknowledgement failed before any COMMIT attempt.
- `commit-uncertain`: COMMIT was attempted but no successful response was received; no automatic rollback or replay is claimed.
- `committed-cleanup-failed`: COMMIT succeeded but lock cleanup was not confirmed.

Every failure stops the release. Preserve the result and inspect the exact target read-only; any further apply needs fresh review. The additional defect found during correction was that the shared transaction helper obscured COMMIT-response uncertainty. The Place release now controls its own transaction outcome; unrelated adapters are unchanged.

Current regression and native evidence is in `docs/architecture/launch-readiness-and-product-convergence/evidence/geography-integration-corrections-2026-10-08/`. The preceding 35-file integration evidence packet remains unchanged as historical evidence.

## Place command closure and failure reporting

All protected `release-reference:plan/apply/verify --adapter=places`, `release-reference:inspect --adapter=places` and owned `places:release-preview:prepare/verify` commands now buffer their evidence until the acquired connection closes successfully. Final successful evidence includes `connectionClosed=true`. The adapter must already have confirmed transaction and lock cleanup before returning; the command must then confirm connection closure before printing success.

If any phase fails, the Place command emits one sanitised JSON failure record to stderr and exits unsuccessfully. The record identifies the command, transaction outcome, primary failed phase and independent operation/rollback/lock-cleanup/connection-close failure flags, plus `nextAction=stop-and-inspect` and `automaticRetryAllowed=false`. It does not contain exception messages, stacks, credentials, SQL, parameter values or raw exception objects. Internal causes retain the original release failure and independent close error without replacing one with the other. Setup/open failures report `not-started`; completed read-only operations with failed closure report `not-applicable`; transaction failures preserve their adapter outcome.

If COMMIT and lock cleanup succeeded but connection closure fails, the record retains `transactionOutcome=committed` and identifies connection-close failure. This is a failed command with committed data, not a rollback or permission to replay. An uncertain COMMIT remains `commit-uncertain` even if closure also fails. Stop, preserve the structured evidence, inspect read-only and obtain fresh review before any further apply. Neither the operation nor closure is retried automatically. Other reference adapters retain their existing command handling.

The reporting-only correction packet is `docs/architecture/launch-readiness-and-product-convergence/evidence/geography-place-command-boundary-2026-10-08/`. Native reference materialisation was not repeated: the pinned packages, loader, adapter digest and schema are unchanged from the preceding correction candidate. Its measured native evidence remains historical proof of that unchanged adapter. Production census evidence remains timestamped, not a claim of a new inspection.

## Approved read-only inspection

Use the dedicated `propertylistify_b08_inspector` credential in the protected operator process. The credential must actually retain USAGE plus SELECT on the approved database only. `DATABASE_CREDENTIAL_CLASS=read-only` does not turn another user's grants into inspector authority. No password or complete URL belongs in transcripts.

```sh
pnpm db:release:reference:inspect -- --adapter=places
pnpm db:release:plan -- --accepted-old-head=0096_user_founder_authority_unique.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql
pnpm db:release:reference:plan -- --adapter=places
```

Set the existing `DATABASE_AUTHORITY_APPROVAL_REFERENCE`, `DATABASE_AUTHORITY_APPROVAL_ACTOR`, `DATABASE_AUTHORITY_APPROVED_FINGERPRINT` and approved credential-class inputs for this exact read-only operation in the current operator process. The inspection checks the selected database, dedicated inspector identity and SELECT-only grants, then reads migration checksums, incomplete attempts, Place schema presence, canonical reference columns, CHECK metadata and the reported legacy North Riding locality. It never reads private listing addresses or mutates database data.

A data plan before schema application reports the desired and held packages but `readyForDataRelease=false` and `planDigest=null`. It cannot authorize data application. Partial Place schema or ledger drift refuses and requires schema review.

## Separately approved schema and data sequence

The captured production state is head 0096, with all 97 prefix checksums intact, no incomplete attempts and none of the seven Place/Search Area tables or three canonical consumer columns. There are 15 pending migrations, 0097–0111. The senior packet includes a deterministic schema plan derived from the fresh inspector census. Refresh it through the named release runner after merge; the recorded digest is not standing apply approval.

1. Review the exact integration SHA; then publish the review branch/PR and run every required hosted CI check for that SHA. If rebased or changed, invalidate the review SHA and rerun the affected checks. Merge only the accepted candidate. Freeze authoring and competing reference writers for the coordinated release window, establish preservation evidence and record the intended deployed artifact.
2. Re-inspect the exact target and obtain the named fresh schema plan for the merged manifest. Review old/new heads, checksums, pending order and attempt state. Obtain separate exact-target schema-apply approval. Supply a distinct same-target migration username/password through ephemeral `DATABASE_MIGRATION_URL`, never a persistent service variable.
3. Under that separately approved migration operation:

```sh
pnpm db:release:apply -- --accepted-old-head=0096_user_founder_authority_unique.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql --plan-digest=<fresh-reviewed-schema-plan-digest> --ack=CONFIRM_RELEASE_APPLY_b23d640cdf242812
```

4. Return to approved read-only authority. Require zero pending schema migrations, canonical schema congruency, all 39 expected CHECKs enforced and the intended foreign keys/indexes. On this actual Azure MySQL target there is no TiDB capability change to perform. Any failed/running/blocked DDL attempt routes to the named database recovery process, never a retry.

```sh
pnpm db:release:plan -- --accepted-old-head=0111_properties_canonical_place_reference_fk.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql
pnpm db:schema:congruency -- --credential=read-only
pnpm db:release:reference:plan -- --adapter=places
```

5. Review the now-applicable data plan: exact target, head, registry/package/desired/hold digests, observed assertions and pending counts. Initial production Place tables are expected to be empty. Unexpected rows or assertion drift stop the release; never delete or adopt them to make the plan fit. Obtain separate exact-target reference-data approval, with the migration credential and operation-specific acknowledgement:

```sh
pnpm db:release:reference:apply -- --adapter=places --plan-digest=<fresh-reviewed-place-plan-digest> --ack=CONFIRM_RELEASE_REFERENCE_APPLY_b23d640cdf242812
```

6. Restore approved read-only authority and verify exact data reconciliation and zero pending rows:

```sh
pnpm db:release:reference:verify -- --adapter=places
pnpm db:release:reference:plan -- --adapter=places
```

Do not use the full national disposable verifier on this protected subset. Verification is read-only; a repeat apply is still a separately authorized mutation operation, even when its reviewed plan expects zero writes.

7. Deploy the reviewed matching artifact within the approved window. Prove its exact source SHA and readiness. Check North Riding discovery and explicit selection, private house draft save/reload through an approved account/target, plus refusal of mixed geography, missing house evidence and unresolved provider suggestions. Close the window only after the reviewed acceptance evidence. Existing numeric catalog rows and old draft geography are not guessed into Place IDs; an unavailable old draft location requires explicit reselection. The legacy North Riding city is not converted or deleted by this release.

## Disposable executable preview

`reference.places-release-preview` is an independent local reference-data role. It invokes the same reconciliation, lock, insert and before-COMMIT verification protocol on an exact owned disposable target through genuine `reference-seed` / `verification` authority. Its prepare command computes the local plan and rechecks it under the lock. The protected wrapper still requires a reviewed digest and protected target approval. Neither wrapper accepts the other's authorization.

```sh
pnpm db:places:release-preview:prepare
pnpm db:places:release-preview:verify
```

Use a fresh, fully migrated owned target. The complete national storage fixture and the production release preview have different exact row sets; never mix them or dispose a protected target to resolve a mismatch.

## Hosted CI sequence after senior review

Run these only after the senior reviewer accepts the exact handoff SHA. A branch push can trigger the frontend workflow immediately; creating the PR triggers the full pipeline. The local candidate deliberately does neither before review.

```sh
GEOGRAPHY_REVIEWED_SHA='<exact SHA accepted by the senior reviewer>'
test "$(git rev-parse HEAD)" = "$GEOGRAPHY_REVIEWED_SHA"
git merge-base --is-ancestor 7756376c9ec604b352595b4e4ba8ced73f18562b HEAD
git push origin feat/place-authority-slice0-decision
gh pr create --draft --base main --head feat/place-authority-slice0-decision --title 'Integrate canonical Place foundation and governed national reference release' --body-file docs/architecture/launch-readiness-and-product-convergence/evidence/geography-integration-2026-10-08/PR_DESCRIPTION.md
gh pr checks --watch
```

Record the run URLs and tested head SHA. Require DB Contract Verification, Location Authority, Lint & TypeCheck, Unit & Integration Tests, Build Application and Build Frontend to pass for the reviewed head. A draft PR is review/CI preparation, not merge or production approval. If main moves or any fix changes this SHA, integrate the new accepted base in the same owned branch, issue a replacement exact-SHA review packet and run the applicable hosted checks again.
