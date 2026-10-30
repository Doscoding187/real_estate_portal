# Property Listify release-day runbook

**Draft for review; no live operation is authorized here.** Owner: founder / release lead. Database: Azure Database for MySQL Flexible Server `propertylistify-mysql`, database `propertylistify_database`, MySQL 8.4. API: Railway. Web: Vercel. Land remains dark: `LAND_VERTICAL_LAUNCH_STATE.enabled=false`.

## Founder-verified production baseline — read-only, 2026-10-30

The founder supplied these observations from Azure Cloud Shell. The agent did not connect to Azure or read/write production.

- Latest migration: `0111_properties_canonical_place_reference_fk.sql`, applied 2026-10-10. Full checksums 0107–0111 match the repository. `sql_migration_attempts` had no running, failed, blocked, or unfinished rows.
- `users=6` (founder test accounts for agent, developer, and agency roles); `listings=1` (test); `developments=0`; `leads=0`; `service_provider_locations=0`.
- The listing references `pl-place-01-6a145c6d642ba208a2c12de7`, a suburb and not the Fordsburg duplicate.
- `place=16,944`: all non-OSM, zero OSM-only, zero unclassified; the rows were created in one bulk load at 2026-10-10 14:25.
- The 48 reviewed Gauteng Places have old type/scope values 48/48 and old evidence-note hashes 48/48. The corrected committed Query 3 returned **Empty set**; the first 47/48 result was the Hiltonia hash typo. Go-checks must run from the committed SQL file below, never a retyped copy.
- The founder compared all five production reference tables with the 2026-10-10 v0.1 package: `place`, `place_name`, `place_relationship`, `place_evidence`, and `place_external_mapping` match. The source package is pinned to commit `49a48572c24d1b122fcf17b025a76e5ab77f03a8`; today's files still use v0.1 filenames but include the later eligibility revision.
- Repository decision record: commit `1dc747fbceed1687135c6b3ec46f3e4b39a91dc8` and D12 in `docs/architecture/geography-coverage-contract.md` exclude source-classified spot/facility-only records from geographic search/publication eligibility while retaining identity, names, and provenance. The repository does not contain a separate founder approval record for this Oct 14 revision; do not label that policy founder-approved based only on the implementation commit.
- Azure reports daily full backups, 14-day retention, and an earliest available restore point of 2026-10-15. Three Railway-related firewall rules exist on the Azure server; names, ranges, and current use were not inspected here.

## Operating rules

This is a coordinated outage. Keep the current maintenance experience and paid intake closed until the release lead says otherwise. The production maintenance experience is client-side; the parked edge 503/noindex headers are not a writer lock. Drain every Railway API and writer service before changing Azure data. Do not infer Railway service names from the three Azure firewall rules.

When the API becomes healthy, the current client-side `ApiAvailabilityBoundary` can automatically reveal the application; it has no separate operator-controlled "reopen" switch. If the founder requires the public app to remain unavailable until smoke tests finish, **stop before the API is brought back** and request a separately reviewed gate change. No such shared-tooling change is included or authorized here. The sequence below assumes the founder accepts the app becoming reachable once API readiness passes while paid intake remains closed.

After the backup is complete, **any ambiguous or failed apply means stop, remain in maintenance, restore the named verified backup to a new server, reconnect the matching application version, and do not retry blindly**. Azure MySQL restore creates a new server; it does not roll the existing server back in place. Never use down-migrations, manual SQL edits, ledger edits, or automatic retries.

**Command evidence rule:** before each release or rehearsal command, create a private evidence directory and save its complete stdout, stderr, and exit code separately before continuing. Apply this to every shell, migration, SQL-client, health-check, and reference-data command. Example template (use a unique `<step>` filename for every command):

```sh
set +e
<exact-command> >"$EVIDENCE_DIR/<step>.stdout.log" 2>"$EVIDENCE_DIR/<step>.stderr.log"
status=$?
printf '%s\n' "$status" >"$EVIDENCE_DIR/<step>.exit-code"
test "$status" -eq 0 || exit "$status"
```

Keep the complete files until the rehearsal/release evidence is reviewed. Before deleting any temporary server, confirm every command has its paired output files and exit code. Never include an admin password or credential-bearing connection string in a command or log.

All commands below are future operator instructions. No command was run against production for this document.

## Numbered release sequence

### 1. Go-checks and exact release source

**Owner:** founder/release lead, DB operator, independent reviewer.

**Command / checks:** inspect the exact merged API/web SHA and required GitHub checks; require an independent B16 review of the exact source/tree and paid-MVP scope; confirm the 0111→0197 rehearsal evidence and matching Preview SHA. Run the repository's read-only checks from the release commit:

```sh
pnpm release:predeploy:production
mysql --defaults-extra-file="$MYSQL_READONLY_DEFAULTS" --database=propertylistify_database < docs/operations/place-reference-bucket-digests.sql
mysql --defaults-extra-file="$MYSQL_READONLY_DEFAULTS" --database=propertylistify_database < docs/operations/gauteng-place-azure-read-only-checks.sql
```

The bucket-digest SQL is the committed five-table read-only set from PR #714; compare its output with `docs/operations/place-reference-bucket-digests-v0.1-non-osm.csv`. Require `digest_complete=1`, UTC, and no differing bucket. The Gauteng SQL shows applied checksums 0107–0111, incomplete attempts, the listing's Place ID, 48 old type/scope rows, and evidence-hash anomalies. Compare checksums with both `server/migrations/manifest.json` and each committed migration file. Expected: target is Azure MySQL 8.4 / `propertylistify_database`; migration head 0111; checksums match; no incomplete attempts; all five tables match the Oct 10 package; listing Place matches the baseline above; Gauteng query 2 is 48/48; query 3 is Empty set. `pnpm release:predeploy:production` must report a valid read-only plan to 0197 and valid reference plans.

**Stop:** target, checksum, attempt, plan, row-count, listing identity, query result, source SHA, required CI, Land flag, founder approval, or same-SHA Preview differs. Keep #707 excluded unless the founder explicitly unholds it.

**Rollback:** none is needed; these checks are read-only. Leave maintenance in place and resolve the discrepancy before scheduling the window.

### 2. Maintenance and writer drain

**Owner:** founder/release lead and Railway operator.

**Command:** confirm the Vercel maintenance page is visible. Record each Railway API/worker service's environment, region, and current replica count. Stop public writes and background writers by scaling every write-capable service to zero; use only the verified service names and regions:

```sh
railway scale --service <verified-service> --environment production <verified-region>=0
```

Repeat for every writer. Confirm zero replicas and no active writer before continuing. Keep the previous replica counts for reopening. The three Azure firewall rules are not changed in this sequence.

**Expected:** no API or worker can write while schema/data work runs; the maintenance page remains available.

**Stop:** any writer is unidentified or still active, service/region cannot be verified, traffic continues, or the operator cannot keep maintenance visible. The maintenance page alone does not protect a directly called API.

**Rollback:** before any database change, restore the recorded replica counts and stop the release. After a database change, follow the global backup-restore rule above and restore the matching app with the database.

### 3. Take and verify a named Azure backup

**Owner:** Azure DB operator and reviewer.

**Command:** Azure Portal → **Azure Database for MySQL flexible servers** → `propertylistify-mysql` → **Backup and restore** → **Backup Now** → name it `pl-release-<YYYYMMDD>-<release-sha7>` → **Trigger**. Wait for the named on-demand backup to appear as completed; record its name, backup ID, and UTC time. Verify it is still available before any apply.

**Expected:** a completed, uniquely named restore point exists inside the server's 14-day retention window. Azure's on-demand backups are retained under that policy and can be used for restore; they are not downloadable files. See [Azure on-demand backup steps](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-trigger-on-demand-backup) and [backup/restore behavior](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-backup-restore).

**Stop:** backup fails, is not listed as complete, cannot be identified unambiguously, or restore path/ownership is unclear.

**Rollback:** no database change has occurred. Keep writers drained and maintenance visible; take a new named backup before proceeding.

### 4. Apply migrations 0112–0197

**Owner:** approved Azure migration operator; independent DB reviewer watches the output.

**Command:** first review the fresh plan, then apply exactly that plan with the emitted digest and approval acknowledgement:

```sh
pnpm db:release:plan -- --accepted-old-head=0111_properties_canonical_place_reference_fk.sql --expected-new-head=0197_drop_seller_prospects_province.sql
pnpm db:release:apply -- --accepted-old-head=0111_properties_canonical_place_reference_fk.sql --expected-new-head=0197_drop_seller_prospects_province.sql --plan-digest=<fresh-reviewed-plan-digest> --ack=<issued-release-ack>
```

**Expected:** the plan contains only migrations 0112–0197 (86 files), exact repo checksums, accepted old head 0111, and expected head 0197; apply reports success at 0197 and no incomplete attempt. Migration `0115_non_geographic_place_search_eligibility.sql` is the bounded 2,556-row source-classification correction: for its exact ID set it clears only `publication_eligible`, `search_eligible`, and `search_scope`; Place IDs, type, classification, lifecycle, names, relationships, evidence and mappings stay unchanged. The full five-table Oct 10 digest check above is the old-state gate before this migration.

**Stop:** any different pending set/head/checksum, failed/running/blocked attempt, timeout, ambiguous result, or missing approval.

**Rollback:** remain drained and in maintenance; restore the verified named backup to a new server, verify its head/data, and reconnect the last-known-good API built for that restored schema. No blind retry.

### 5. Verify the migrated schema

**Owner:** DB operator and reviewer.

**Command:**

```sh
pnpm db:schema:congruency -- --credential=read-only
pnpm db:release:plan -- --accepted-old-head=0197_drop_seller_prospects_province.sql --expected-new-head=0197_drop_seller_prospects_province.sql
```

**Expected:** canonical MySQL schema congruency passes; migration plan has no pending migrations and no incomplete attempts.

**Stop:** any schema difference, pending migration, changed checksum, or attempt row needing recovery.

**Rollback:** stay drained/in maintenance and restore the named backup with its compatible application. Do not edit schema by hand.

### 6. Retire the Fordsburg duplicate

**Owner:** approved DB operator and Place reviewer.

**Command:** plan, review all reported references and digest, apply once, then verify:

```sh
pnpm db:release:reference:plan -- --adapter=fordsburg-retirement
pnpm db:release:reference:apply -- --adapter=fordsburg-retirement --plan-digest=<reviewed-retirement-digest> --ack=<issued-reference-ack>
pnpm db:release:reference:verify -- --adapter=fordsburg-retirement
```

**Expected:** retire `pl-place-01-99dcb8ba9d808741e35b258e` in favor of `pl-place-01-435b493de124264b676f708f`; preserve the supported suburb and source history; remove the duplicate runtime Place, names, relationship, evidence, and mappings; remap only exact reviewed foreign references. The founder-reported listing points elsewhere.

**Stop:** any unexpected reference, changed evidence bundle, collision, or plan digest/result mismatch.

**Rollback:** if still inside the adapter transaction, require its rollback result. After commit or ambiguous outcome, remain drained/in maintenance and restore the named backup with the matching app. Do not rerun.

### 7. Reconcile the 48 reviewed Gauteng Places

**Owner:** approved DB operator and Place reviewer.

**Command:** run the committed SQL file verbatim again before planning; then:

```sh
pnpm db:release:reference:plan -- --adapter=gauteng-type-reconciliation
pnpm db:release:reference:apply -- --adapter=gauteng-type-reconciliation --plan-digest=<reviewed-reconciliation-digest> --ack=<issued-reference-ack>
pnpm db:release:reference:verify -- --adapter=gauteng-type-reconciliation
```

**Expected:** before apply, query 2 is 48/48 and query 3 is Empty set. The plan/apply updates only the reviewed `place_type`, derived `search_scope`, and 48 evidence notes; no IDs, relationships, names, or eligibility flags change. Verify the complete corrected state. Query 3 must be run from `docs/operations/gauteng-place-azure-read-only-checks.sql`, not retyped.

**Stop:** any non-empty Query 3, count other than 48/48, evidence row count other than one per ID, or changed plan rows/digest.

**Rollback:** before commit, require transaction rollback. After commit or ambiguous result, remain in maintenance and restore the named backup with the matching app. No blind retry or hash repair.

### 8. Verify the 2,556-row migration reconciliation

**Owner:** approved DB operator and Place reviewer.

**Command:** run the committed read-only check after the 48-place correction and before the Places load:

```sh
mysql --defaults-extra-file="$MYSQL_READONLY_DEFAULTS" --database=propertylistify_database < docs/operations/place-source-geography-eligibility-0115-read-only-check.sql
```

**Expected:** `reviewed_ids=2556`, `found_ids=2556`, `missing_ids=0`; unchanged old-state categories are suburbs 1,558 (1,514 verified, 44 provisional), localities 988 (975 verified, 13 provisional), and towns 10 (9 verified, 1 provisional). The old scope split is 2,546 locality and 10 metro-city. The corrected state is `publication_eligible=0`, `search_eligible=0`, `search_scope=NULL` for all 2,556; `corrected_rows=2556`, `unexpected_state_rows=0`. The 48 Gauteng type corrections have zero ID overlap. Of the old rows, 2,498 were already publication-eligible and all 2,556 were searchable; this correction removes those eligibility entries. It creates **zero** public pages, public URLs, or search entries; Place identity and URL slugs are unchanged. The query is the post-migration state gate. Migration 0115 is the only writer; it changes only the three listed fields. The following Places plan compares every governed field and stops on any mismatch, so do not add a second writer or continue after a failed count.

**Direction and impact check:** The earlier claim that 2,498 rows move from ineligible to eligible was reversed. Oct 10 has 2,498 verified rows at `1/1/<scope>` and 58 provisional rows at `0/1/<scope>`; after 0115 all 2,556 are `0/0/NULL`. From the active territory registry, search-eligible `search_scope='locality'` counts are Gauteng 1,143→1,141 and national 16,643→14,097. The two Gauteng IDs are East Rand (`pl-place-01-1ac94cf7599e695a225f7e2c`) and Sandton Convention Centre (`pl-place-01-9e02b737f2b0bdac9bd1f1f4`). East Rand is an accepted broad locality identity in the package, with source evidence including GeoNames `L.AREA` and `S.RSTN`; 0115 removes its search route. **Founder decision (2026-10-30): keep East Rand excluded from buyer locality search; it is not a buyer search term. Defer SEO and advertising content that points to Ekurhuleni as a content task, not a search-eligibility rule change. Confirm the Ekurhuleni destination route when that content is drafted; do not change eligibility flags or Place IDs for this decision.** The known KwaZulu-Natal Umhlanga ID is outside the set; a different Eastern Cape `uMhlanga` (`pl-place-01-624b0b657f4940917537c08d`, source code `S.RSD`) is inside it. **Founder decision (2026-10-30): keep Eastern Cape `uMhlanga` excluded and KwaZulu-Natal Umhlanga eligible; retain separate Place IDs for same-named places.** The source codes in the sample rows are GeoNames classes (`S.RSD` railroad siding, `S.HTL` hotel, `S.TOWR` tower, `S.RSTN` railroad station; `L.CTRB` convention/business centre), not settlement evidence by themselves. See the [GeoNames feature-code list](https://www.geonames.org/export/codes.html).

**Stop:** any count differs, any ID is missing, any target remains eligible/scoped, or the following Places plan reports drift. Keep maintenance and writer drain in place.

**Rollback:** this query is read-only. If it or the Places plan differs, remain in maintenance and restore the named backup with the matching app; do not rerun or manually repair migration 0115.

### 9. Load the current Places package

**Owner:** approved DB operator and Place reviewer.

**Command:**

```sh
pnpm db:release:reference:plan -- --adapter=places
pnpm db:release:reference:apply -- --adapter=places --plan-digest=<reviewed-places-digest> --ack=<issued-reference-ack>
pnpm db:release:reference:verify -- --adapter=places
```

**Expected final counts:** **17,663 total / 16,943 non-OSM / 720 OSM-only / 0 unclassified**; exact admitted package digest; zero foreign identities and no eligibility changes. The Fordsburg retirement accounts for the one fewer non-OSM row; the Places load adds 720 OSM-only rows.

**Stop:** any other total, class count, identity, package digest, or eligibility value.

**Rollback:** remain drained/in maintenance and restore the named backup with the matching app. A partial/ambiguous load is not permission to retry.

### 10. Deploy the matching API

**Owner:** Railway operator and release lead.

**Command:** in Railway, open the verified production project/environment and API service → **Deployments** → open Command Palette (`Cmd+K`) → **Deploy Latest Commit**. Do this only when the connected default branch points to the reviewed API SHA and no newer commit exists. Verify deployment source SHA and readiness before restoring the recorded replica counts.

**Expected:** API reports the exact reviewed SHA, starts on the migrated 0197 schema, and passes health/readiness. Restore only the recorded replica counts after the new deployment is healthy. This can make the web app available automatically before smoke tests finish; paid intake remains closed.

**Stop:** unexpected SHA, build/deploy failure, incorrect service variables/settings, or unhealthy readiness.

**Rollback:** keep the web maintenance experience and paid intake closed; restore the named DB backup and deploy the API version compatible with that backup. Railway image rollback alone is not a database rollback.

### 11. Deploy the matching web build

**Owner:** Vercel project owner and release lead.

**Command:** Vercel project → **Deployments** → locate the tested Preview for the exact reviewed web SHA → `…` → **Promote to Production** → review the production domain/environment → confirm. This is a production operation for the future release window only; it was not run here. Vercel rebuilds the Preview source using production environment values, so verify the resulting deployment SHA and production variables. See [Vercel deployment promotion](https://vercel.com/docs/deployments/promoting-a-deployment).

**Expected:** production serves the reviewed web SHA; all route redirects and the production API binding match the release record. Keep the Preview-only build pause in place for ordinary main merges; this explicit promotion is the separately approved release action.

**Stop:** missing same-SHA Preview, changed source SHA, build failure, unexpected environment/domain, or pause behavior that would require an unreviewed setting change.

**Rollback:** keep paid intake closed; restore the named DB backup and deploy the matching old API/web pair. Do not roll back only one side.

### 12. Smoke-test the released pair

**Owner:** release lead, product reviewer, and founder test-account holder.

**Commands:**

```sh
pnpm release:smoke:production
AUTH_BOUNDARY_SMOKE_API_URL=https://api.propertylistifysa.co.za \
AUTH_BOUNDARY_SMOKE_ORIGIN=https://www.propertylistifysa.co.za \
pnpm release:smoke:auth-boundary
```

From the exact production web/API pair, verify health and readiness, login/session, one test listing at `pl-place-01-6a145c6d642ba208a2c12de7`, an enquiry path, Sale/Rent guide behavior only if #707 was explicitly unheld and included, broad places opening guides that ask for an exact suburb, and Land remaining hidden. Check permanent redirects: `/gauteng/baragwanath/` → `/gauteng/johannesburg/baragwanath`; `/gauteng/van-wyksrus/` → `/gauteng/city-of-johannesburg/van-wyksrus`; `/gauteng/marshallstown/` → `/gauteng/johannesburg/marshallstown`; `/gauteng/randjesfontein/` → `/gauteng/midrand/randjesfontein` (all 308). Confirm finance documents remain private and B15 customer/legal copy is approved before paid intake.

**Expected:** no P0/P1, no 5xx/CORS/auth failures, all four redirects return 308 to the stated canonical URL, no child-area listing roll-up, and all gates/flags match the founder decisions.

**Stop:** any failed smoke, data/identity drift, public finance document, unresolved legal/copy blank, #707 hold uncertainty, or Land exposure.

**Rollback:** immediately keep paid intake closed; restore the named backup and matching previous API/web artifacts. Do not retry an uncertain mutation.

### 13. Reopen only after GO

**Owner:** founder.

**Command:** no automated command is approved. The client may already have become reachable when API readiness passed in step 9. The founder's explicit GO here authorizes paid intake/customer opening only after all evidence is recorded. Keep `LAND_VERTICAL_LAUNCH_STATE.enabled=false`. Paid intake stays closed until B15 blanks are resolved, Terms/Privacy lawyer review is complete, the exact legal bundle is published, private storage is verified, and Vercel Pro is active.

**Expected:** named operator, source SHAs, backup ID, plan digests, migration head, counts, smoke evidence, and founder GO are recorded.

**Stop:** any evidence missing, maintenance/write controls unclear, or any NO-GO item above.

**Rollback:** return to maintenance, close paid intake, preserve the evidence, restore the named backup and compatible app if any production data/schema change is suspect.

## Optional dress rehearsal on a temporary Azure restore

1. Founder approves a fresh, time-bounded disposable-rehearsal authorization for the exact new temporary server, source backup, 0111→0197 migration, Fordsburg retirement, Gauteng reconciliation, and Places load. Any approval for `.c` is bound to `.c` and cannot authorize a new server; do not reuse its target registration. A new exact-target registration and reviewed tooling path need separate approval.
2. In Azure Portal, select `propertylistify-mysql` → **Overview** → **Restore**; choose the named pre-release restore point, set a unique name such as `pl-release-dress-<date>-<random>`, select isolated networking with no Railway access, and review before creating. Azure restore makes a new server and inherits the source compute/storage settings; verify its identity and network before connecting.
3. Run the disposable sequence only through the approved Database Authority target and release tooling. A restore from the Azure backup already contains the real 0111 data: verify the Oct 10 baseline, do not seed or overwrite it. Migrate 0112–0197 (including the 0115 eligibility correction), retire Fordsburg, reconcile all 48, verify the 2,556 corrected rows, load Places, and verify 17,663 / 16,943 / 720 / 0. Never point Railway/Vercel at the rehearsal.
4. Record timings and sanitized evidence, with each command's complete stdout, stderr, and exit code saved as described above. Before deletion, confirm the logs are complete. After review, delete only the uniquely named restored server in Azure Portal → that server's **Overview** → **Delete** → enter its exact temporary server name → confirm. Verify the temporary server is gone; leave `propertylistify-mysql` and its backup untouched.

### Founder checklist: fourth dress rehearsal (draft; not authorization)

**Proposed target:** `pl-dress-rehearsal-20261030d`. Do not create or connect to it until the founder separately approves the exact backup, region, SKU/storage, total cost cap, operator `/32`, and this exact target. Any `.c` registration is bound to `.c` and cannot authorize `.d`. Review the exact source commit containing the rehearsal guard first; the new registration must name that commit, expire within 12 hours, allow only `release-plan`, `release-apply`, read-only `diagnostics`, and `release-reference-plan/apply/verify`, and explicitly deny `propertylistify-mysql` and all Railway hosts. No app URL or Railway firewall rule may be copied.

1. **Release gates.** Founder/operator must record the Azure public-access readback with the three existing Railway rules preserved, the Vercel Ignored Build Step readback (`Only build preview`), and the Railway deploy-trigger readback. Do not merge until the Vercel and Railway readbacks are recorded. Keep #707 held and Land disabled.
2. **Evidence folder.** On the operator machine, set a private persistent path and create it before any command:
   ```sh
   umask 077
   export PL_EVIDENCE_DIR="/secure/operator/path/pl-dress-rehearsal-20261030d-<UTC-run-id>"
   mkdir -p "$PL_EVIDENCE_DIR"
   run_logged() { local step_name="$1"; shift; local status; if "$@" >"$PL_EVIDENCE_DIR/$step_name.stdout.log" 2>"$PL_EVIDENCE_DIR/$step_name.stderr.log"; then status=0; else status=$?; fi; printf '%s\n' "$status" >"$PL_EVIDENCE_DIR/$step_name.exit-code"; return "$status"; }
   ```
   Run every shell, SQL-client, and Authority command through `run_logged`; retain each complete output and exit code. Use a new target-specific read-only MySQL defaults file for the committed SQL checks. Never log credentials.
3. **Restore and network.** In Azure Portal: **Azure Database for MySQL flexible servers** → `propertylistify-mysql` → **Overview** → **Restore** → choose the founder-approved automated backup → enter `pl-dress-rehearsal-20261030d` → confirm the approved source region and size/cost → **Review + create**. Do not use `--no-wait`. On `.d` only, remove inherited firewall entries, verify the list is empty, re-check the operator's current egress IP, add only that `/32`, and save a screenshot of the final list. Stop if Azure requires unapproved storage/cost or any extra firewall entry. Wait for `Ready`; founder resets the password in Portal. Supply only a fresh `.d` credential through the approved secret channel, never the app credential.
4. **Bind and prove target.** Activate the newly reviewed exact-target registration only after showing its hostname. Supply the fresh target credential through the approved secret channel (never as a command argument). In the protected shell, run `run_logged authority-status pnpm db:authority:status` and `run_logged authority-context pnpm db:authority:context -- --operation=release-plan`; require class `disposable-rehearsal`, host `pl-dress-rehearsal-20261030d.mysql.database.azure.com`, database `propertylistify_database`, the reviewed source commit, and the unexpired registration. Any other target/class is a stop.
5. **Old-state go-checks (read only).** Run the committed SQL files verbatim against `.d` before migration; require the Oct 10 five-table digests/counts to match, 48 old type/scope and note hashes to be 48/48, and no incomplete migration attempts:
   ```sh
   run_logged old-digests mysql --defaults-extra-file="$PL_DRESS_READONLY_DEFAULTS" --database=propertylistify_database < docs/operations/place-reference-bucket-digests.sql
   run_logged old-gauteng-check mysql --defaults-extra-file="$PL_DRESS_READONLY_DEFAULTS" --database=propertylistify_database < docs/operations/gauteng-place-azure-read-only-checks.sql
   ```
6. **Migrate 0112–0197.** Review the exact plan before applying; its only pending range must be 86 migrations from 0111 through 0197. Then issue the exact-target release acknowledgement and apply that reviewed digest once:
   ```sh
   run_logged migration-plan pnpm db:release:plan -- --accepted-old-head=0111_properties_canonical_place_reference_fk.sql --expected-new-head=0197_drop_seller_prospects_province.sql
   PL_MIGRATION_DIGEST=$(jq -er '.planDigest' "$PL_EVIDENCE_DIR/migration-plan.stdout.log")
   run_logged migration-ack pnpm db:release:ack
   PL_RELEASE_ACK=$(jq -er '.acknowledgement' "$PL_EVIDENCE_DIR/migration-ack.stdout.log")
   run_logged migration-apply pnpm db:release:apply -- --accepted-old-head=0111_properties_canonical_place_reference_fk.sql --expected-new-head=0197_drop_seller_prospects_province.sql --plan-digest="$PL_MIGRATION_DIGEST" --ack="$PL_RELEASE_ACK"
   run_logged schema-check pnpm db:schema:congruency -- --credential=read-only
   run_logged migration-postcheck pnpm db:release:plan -- --accepted-old-head=0197_drop_seller_prospects_province.sql --expected-new-head=0197_drop_seller_prospects_province.sql
   ```
   Require congruent schema, enforced CHECKs 40/40, head 0197, zero pending migrations, and no failed/incomplete attempt. Migration 0115 is applied inside this batch; it is not separately replayed.
7. **Fordsburg retirement.**
   ```sh
   run_logged ford-plan pnpm db:release:reference:plan -- --adapter=fordsburg-retirement
   PL_FORD_DIGEST=$(jq -er '.planDigest' "$PL_EVIDENCE_DIR/ford-plan.stdout.log")
   run_logged ford-ack pnpm db:release:reference:ack
   PL_REFERENCE_ACK=$(jq -er '.acknowledgement' "$PL_EVIDENCE_DIR/ford-ack.stdout.log")
   run_logged ford-apply pnpm db:release:reference:apply -- --adapter=fordsburg-retirement --plan-digest="$PL_FORD_DIGEST" --ack="$PL_REFERENCE_ACK"
   run_logged ford-verify pnpm db:release:reference:verify -- --adapter=fordsburg-retirement
   ```
   Review the complete summary and digest before apply; require only the approved duplicate retirement/remap. Otherwise stop.
8. **48 Gauteng corrections.** Re-run the committed pre-correction check; require old values 48/48 and no note mismatch:
   ```sh
   run_logged gauteng-old-check mysql --defaults-extra-file="$PL_DRESS_READONLY_DEFAULTS" --database=propertylistify_database < docs/operations/gauteng-place-azure-read-only-checks.sql
   ```
   Then:
   ```sh
   run_logged gauteng-plan pnpm db:release:reference:plan -- --adapter=gauteng-type-reconciliation
   PL_GAUTENG_DIGEST=$(jq -er '.planDigest' "$PL_EVIDENCE_DIR/gauteng-plan.stdout.log")
   run_logged gauteng-ack pnpm db:release:reference:ack
   PL_REFERENCE_ACK=$(jq -er '.acknowledgement' "$PL_EVIDENCE_DIR/gauteng-ack.stdout.log")
   run_logged gauteng-apply pnpm db:release:reference:apply -- --adapter=gauteng-type-reconciliation --plan-digest="$PL_GAUTENG_DIGEST" --ack="$PL_REFERENCE_ACK"
   run_logged gauteng-verify pnpm db:release:reference:verify -- --adapter=gauteng-type-reconciliation
   ```
   Review all 48 IDs and the 96 place/evidence updates before apply. Any ID/value/hash discrepancy is a stop.
9. **0115 and Places.** Run the committed post-migration check; require 2,556/2,556 corrected and zero unexpected state:
   ```sh
   run_logged 0115-check mysql --defaults-extra-file="$PL_DRESS_READONLY_DEFAULTS" --database=propertylistify_database < docs/operations/place-source-geography-eligibility-0115-read-only-check.sql
   ```
   Then:
   ```sh
   run_logged places-plan pnpm db:release:reference:plan -- --adapter=places
   PL_PLACES_DIGEST=$(jq -er '.planDigest' "$PL_EVIDENCE_DIR/places-plan.stdout.log")
   run_logged places-ack pnpm db:release:reference:ack
   PL_REFERENCE_ACK=$(jq -er '.acknowledgement' "$PL_EVIDENCE_DIR/places-ack.stdout.log")
   run_logged places-apply pnpm db:release:reference:apply -- --adapter=places --plan-digest="$PL_PLACES_DIGEST" --ack="$PL_REFERENCE_ACK"
   run_logged places-verify pnpm db:release:reference:verify -- --adapter=places
   ```
   Review zero drift and the exact package digest before apply. Require **17,663 / 16,943 / 720 / 0**, no identity drift, and the listing Place ID unchanged. Any mismatch is a stop.
   ```sh
   run_logged final-gauteng-readback mysql --defaults-extra-file="$PL_DRESS_READONLY_DEFAULTS" --database=propertylistify_database < docs/operations/gauteng-place-azure-read-only-checks.sql
   ```
   Compare query 1 with the pre-change listing Place reference; it must be identical. Query 4 should show `town / metro_city` before correction for all three IDs, then `pl-place-01-1dbb2de0670edd2d18b29dfd` and `pl-place-01-880f4a3a6f4c793a77df6889` as `suburb / locality`, and `pl-place-01-83f8631b4bb941634415fd27` as `locality / locality`. Query 3 returns the 48 new-note hashes (hashes only); `gauteng-verify` remains the exact-state verification.
10. **Close the rehearsal.** On any failure or mismatch: stop immediately, do not retry or repair, preserve `.d` and all evidence for review. After the complete evidence packet is reviewed, revoke the `.d` registration; delete only `.d` in Azure Portal; verify Azure reports it absent and record the remaining server list and cost. Never connect an app to `.d` or alter `propertylistify-mysql` data.

**Cost estimate:** the restored server inherits production compute and provisioned storage. Budget roughly 2–4 hours of that SKU's hourly compute plus 2–4 hours of provisioned storage and any backup use above Azure's included allowance. The production SKU, region, and storage size were not supplied, so a currency quote cannot be responsibly stated from this record; get the Azure Portal estimate for the restored configuration before creation and set a founder-approved cost cap. Azure documents up to 100% of provisioned server storage as backup storage at no extra cost; excess is billed. See [Azure MySQL pricing](https://azure.microsoft.com/en-us/pricing/details/mysql/) and [backup storage cost](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-backup-restore).

## Founder-only actions still open

- **Azure public-access readback (founder/operator still must do this):** Azure Portal → **Azure Database for MySQL flexible servers** → `propertylistify-mysql` → **Networking**. Close the broad public-access setting while preserving the three existing Railway-specific rules; record the final state and rule count. Stop if the portal cannot preserve the three rules exactly. This is not verified by the agent; do not merge until the separate Vercel and Railway readbacks below are recorded.
- **Vercel pause readback:** Vercel Dashboard → `real-estate-portal` → **Settings** → **Build and Deployment** → **Ignored Build Step**. Read the selected option and confirm it is **Only build preview**; record a dated screenshot or note. Do not change it in this review. If it is not confirmed, hold all merges. Vercel's default Git behavior can build a deployment for commits to the production branch; see [Ignored Build Step](https://vercel.com/docs/project-configuration/project-settings).
- **Railway trigger/readback:** Railway Dashboard → project → **production** environment → each API/worker service → **Settings** → **Source**. Record connected repository, branch, autodeploy state, service name, region, and replica count. Keep autodeploy disabled for the release window so a merge cannot deploy unexpectedly. After DB/data checks pass, API service → **Deployments** → `Cmd+K` → **Deploy Latest Commit**; verify exact SHA. Railway GitHub autodeploy can deploy commits pushed to its connected branch; see [Railway GitHub autodeploys](https://docs.railway.com/deployments/github-autodeploys).
- **AWS B11:** AWS Console → account `914683204061` → region `af-south-1` → CloudFormation → stack `listify-finance-af-south-1`; confirm `CREATE_COMPLETE` and outputs `listify-finance-914683204061-af-south-1` and `listify-finance-af-south-1-financebackup-kce1wayc2h2e`. For both S3 buckets check region `af-south-1`, Versioning enabled, SSE-S3/AES256, Bucket owner enforced, all four Block Public Access controls on, TLS-only bucket policy/no public principal. On primary verify the replication rule targets the named backup, has an empty prefix (whole bucket), delete-marker replication off, and no object-expiry lifecycle. On the backup verify versioning and retention. In IAM inspect `listify-finance-af-south-1-ProofRuntimeUser-AZx3gkrzcgMx`: one active key; only PutObject/GetObject on primary `billing-proofs/*`; no list/delete/backup/media permissions. Never reveal keys. Then in Railway Dashboard → production → API service → **Variables**, read values privately and confirm `BILLING_PROOF_STORAGE_ADAPTER=s3`, `BILLING_PROOF_S3_BUCKET` is the primary finance bucket, `BILLING_PROOF_S3_REGION=af-south-1`, and `BILLING_PROOF_S3_PREFIX=billing-proofs`; confirm `BILLING_PROOF_AWS_ACCESS_KEY_ID` and `BILLING_PROOF_AWS_SECRET_ACCESS_KEY` are set without displaying values. Verify the finance bucket differs from public `S3_BUCKET_NAME` and check `AWS_REGION`, `CLOUDFRONT_URL`, `AWS_S3_BUCKET`. In Vercel Dashboard → project → **Settings** → **Environment Variables**, read `VITE_CLOUDFRONT_URL` / `VITE_ASSETS_BASE_URL` privately and confirm they point only to public media. Do not copy secret values or keys. Repository/config evidence is summarized in PR #710's B11 readback; app binding remains a hosted check.
- **B15 copy blanks:** resolve every `[FOUNDER: ...]` in PR #710's `docs/operations/customer-copy-inventory-and-drafts-20261029.md`: reconfirm R499/R999/R1,499 and VAT; one-business-day activation target; refund time and request route; company/legal-service details; monitored email/WhatsApp and support hours/pause rule; Terms/Privacy versions and effective date; Information Officer status/wording; actual providers, processing countries and safeguards; exact cookies/browser storage/analytics/external requests; category retention/deletion/legal holds; approve the listing/authority/enquiry disclaimers. Terms and Privacy stay lawyer-review drafts until reviewed and approved.
- **#707:** GitHub → repository → **Pull requests** → #707. Review the latest diff and green checks. If Sale/Rent guides are wanted in this release, the founder must explicitly comment that the hold is lifted and approve including its exact head; otherwise leave it open and exclude it. Do not merge it as part of this runbook.
- **Azure approvals:** after rehearsal, review a fresh exact-target `db:release:plan` and reference plans; approve only the displayed Azure fingerprint and digests for that window. A previous plan or a merge is not approval.
- **Maintenance/reopen boundary:** decide whether the app becoming reachable automatically as API readiness passes (before smoke completes) is acceptable while paid intake stays closed. If not, approve a separate reviewed server-side/edge gate task first; this runbook does not add or toggle one.

## Deferred Place work — post-launch backlog

- **Display disambiguation table, migration, and loader:** deferred; no migration 0198 in the launch candidate. The launch stopgap hides unresolved collision groups only in the shared listing-authoring and buyer-search pickers; public Place pages and backend eligibility remain unchanged until reviewed labels are supplied.
- **East Rand SEO/advertising content:** deferred content pointing to Ekurhuleni; East Rand remains excluded from buyer locality search and no eligibility flag or Place ID changes.
- **Municipality pages:** deferred until after launch.
- **Ekurhuleni content target:** confirm the exact canonical Place route when East Rand content is drafted; do not infer a broad-place child-listing roll-up.

## Separate cleanup proposal — not part of this release

Create a separate delete-only PR for the five tracked historical TiDB backup JSON files; preserve Git history and the B09 decision record. Files: `backups/tidb-serverless-backup-2026-01-14T21-26-30-044Z.json`, `backups/tidb-serverless-backup-2026-01-14T21-33-36-247Z.json`, `backups/tidb-serverless-backup-2026-01-14T21-34-31-067Z.json`, `backups/tidb-serverless-backup-2026-01-14T21-35-25-581Z.json`, and `backups/tidb-serverless-backup-2026-01-14T21-41-20-316Z.json`. B09 records “retired, no archive, fresh accounts”; the files are not runtime inputs. Do not rewrite repository history.
