# Shared hosted closure packet — 12 October 2026

**Status: implementation and execution preparation; hosted exercise pending.**
B01–B07 retain their accepted scopes and B12 remains closed. B08/B11/B16 remain
open. This packet neither changes the register nor grants paid opening.

Task branch: `feat/launch-shared-closure-20261012`.
Integration base: `3e061d78bdb74f26b51acd5d1ab1ec13b934a796`,
tree `63a8a58758c5a61c90e71ce6af940b71d58c955c`.
The fixed worker must be reviewed and integrated before its hosted exercise.
The intended release is the eventual accepted main commit containing this fix;
do not deploy the old base and claim this correction is present.

## 1. Current evidence and the demonstrated gap

[Read-only provider inventory](evidence/shared-launch-closure-20261012/provider-inventory.json)
confirms:

| Service | Current source/deployment | Remaining release delta |
| --- | --- | --- |
| Frontend | Vercel `dpl_Hu9aij7VmRDQJUQ3d5U4WsaEEpuU`, READY, base SHA, canonical aliases | Final approved copy and eventual whole-release source alignment |
| API | Railway `80b36119-97f0-4811-a508-5cab37f8052a`, SUCCESS, base SHA | Reviewed source update containing the fix; existing protections retained |
| Email worker | Configured source `7756376c9ec604b352595b4e4ba8ced73f18562b`; no current deployment | Final accepted source, effective config/credential readback, controlled deployment and actual mailbox/queue proof |
| Lead job | Same older configured source; no current deployment; current cron absent | Final accepted source, corrected publisher dispatch, effective admission and controlled one-shot execution; five-minute cron remains held until its execution scope passes |

The environment also contains staged patch
`398fb997-eeee-4b51-904e-6d4c01fd0aed`, deleting an earlier failed recovery
runner. It belongs to another workstream. No patch was committed, changed or
discarded. Any eventual platform operation must re-read staged work and avoid
accidentally applying that deletion.

OAuth variable inspection returned names only. Presence of DATABASE_URL,
private storage variables and authority approval fields does not prove their
values, selected identities, network access or successful connections.

### Publisher delivery correction

The lead entrypoint obtains a worker connection, but the publisher lookup
previously called `getDb()` through Catalogue Publisher → Developer identity
services. Once the worker pool is admitted, the API accessor rejects reuse.
Therefore a legitimate publisher email could fail before reaching Resend.

The entrypoint now supplies its worker database to dispatch, which carries it
through the canonical publisher lookup. The query shape and worker grants stay
the same. Standalone API lookups still resolve their usual connection.
The stale `ownerType` platform check in dispatch/retry now uses canonical
`authorityKind`; platform references cannot become first-party email recipients.

The focused regression failed before the fix: five of eight cases failed,
including the valid-delivery case with the attempted role switch. After the
fix, the [focused suite](evidence/shared-launch-closure-20261012/focused-tests.txt)
passes 31 tests across six files. Coverage includes the actual worker entrypoint,
real lookup delegation, pool role separation, same delivery key, wrong
recipient/missing publisher/platform custody, uncertain provider outcomes and
resource cleanup. Provider/query doubles were used; this is source evidence,
not actual external delivery or physical database admission.

## 2. B08 criterion-to-evidence map

| Accepted criterion | Evidence reused | Missing proof / next action |
| --- | --- | --- |
| Canonical integrated source and target | October 12 PR600 acceptance; provider source/deployment inventory | Admit the eventual reviewed main source and final worker tuple |
| Canonical head, complete ledger and congruent physical schema | October 10 schema acceptance: head0111, 112 ledger entries, 39 enforced CHECKs, no incomplete attempts; October 12 runtime acceptance | Refresh only if the final release changes the relevant schema/target or current readback disagrees |
| Approved geography/reference and application use | October 10 reference acceptance: 16,944 Places, exclusions retained; October 12 North Riding private draft/image proof | No reinstall or duplicate private-draft exercise; final publication/enquiry checks consume the accepted geography |
| Separate least-privilege identities and denial boundaries | Existing B08 runtime/worker/inspector/migrator establishment and governed grant evidence; October 10 exact Place SELECT grants | Reconcile current grants per identity to their approved scope; keep actual runtime/worker denial evidence explicit and refresh only missing/affected checks |
| Narrow per-service network admission, TLS, selected database | Earlier controlled cutover and dated runtime evidence | Current API/email/lead per-service egress/firewall/session evidence must be mapped; new worker source must prove its actual admitted connection, TLS and exact target |
| Compatible worker consumers; no hidden startup migration | Canonical 16-table worker grant plan, unchanged query shape, new role-propagation regressions | Execute current email and lead process checks on the reviewed source; capture bounded worker reads/batches without expanding privileges |

**B08 closure condition:** all rows are supported for the admitted release.
An API save or a credential-variable name cannot substitute for worker proof.
No schema change, database establishment, geography apply or broad grant is
scheduled here.

## 3. B11 criterion-to-evidence map

| Accepted criterion | Evidence reused | Missing proof / next action |
| --- | --- | --- |
| Distinct public/private storage and scoped identities | Packet 29 storage hardening/provisioning, encrypted transfer and independent runtime permission checks; October 9 senior reconciliation | Reconcile effective bindings to the final release; do not create replacement buckets |
| Blocked public/private-cross-principal access; encryption | Accepted configuration and independent anonymous/cross-principal permission negatives | Application payment-document owner/finance/wrong-owner/anonymous matrix remains required |
| Public property-media save/reload/object retrieval | October 12 draft1/image1, matching downloaded JPEG hash/bytes/rendering | Reuse; publication display remains part of the hosted paid value loop |
| Private document read/access expiry | Dedicated proof-object permission tests are infrastructure evidence; current application reads return authorized, hash-checked inline bytes rather than an S3 signed read URL | Use a legitimate controlled invoice/payment/document through application routes; prove access rejection after session expiry/revocation and absence of reusable storage read capabilities. Submit the signed-read criterion disposition to the acceptance reviewer; do not claim an unexecuted signed-URL expiry pass |
| Runtime replacement durability | Durable storage design and actual image server restoration | Across controlled runtime replacement, retrieve the same application document/media identities and compare retained hashes |
| Recovery and retention | Accepted historical-version restore/checksum and independent storage evidence | Map equivalence to current recovery/retention obligations; share any genuinely missing object/application recovery with B09/B17 |

**B11 closure condition:** infrastructure and application authority both pass.
Private content, URLs, tokens and bank evidence remain outside public artifacts.

## 4. B16 criterion-to-evidence map

| Accepted criterion | Evidence reused | Missing proof / next action |
| --- | --- | --- |
| Reviewed integrated content and required CI | PR600 merged source/equal tree and accepted required CI/preview | Review this bounded worker correction; obtain required checks on its final review/merge identity |
| Deployable frontend/API and exact source agreement | Accepted October 12 Vercel/API source and live provider inventory | Record final source/deployment readback after any authorized release |
| Final frontend/API/email/lead tuple and effective commands | Repository worker contracts and current configuration inventory | Align all intended source identities and verify deployment-effective worker settings; provider pin alone is insufficient |
| Data and storage compatibility | Accepted head0111/reference/runtime/private-draft evidence | Consume B08/B11 deltas without duplicating installation or image proof |
| Approved customer copy | Existing B15 founder facts and review candidate | Dated approval of resolved exact copy; versions/digest, rendering and consent/invoice consistency |
| Deployment/sales containment and assigned remaining holds | October 12 final acceptance; current held worker configuration | Re-read effective controls in the protected release session, preserve maintenance/paid closure until their distinct conditions pass, document any authorized temporary scope |

**B16 closure condition:** final integrated source, copy and intended service
tuple are accepted with every remaining hosted hold assigned. API/frontend
agreement alone is insufficient.

## 5. Ordered shared hosted exercise

The reviewer/operator records a private execution manifest before any external
effect. Required fields are: exact accepted main SHA/tree; API/frontend/worker
deployment IDs; database fingerprint; scoped connection approval; consenting
actor/account and owner IDs; recipient inboxes; resource/network identities;
approved document/payment procedure; UTC staffed start/end; incident contact;
allowed writes/messages/publication; abort/recovery and teardown.

Use the existing API, worker, Redis, S3 and email resources where admitted.
Do not copy production secrets/data into ordinary staging. If the existing
controlled production corridor is chosen, explicitly bound the account,
publication, email and finance effects and retain restricted public access.
Staging is an alternative only after its own resource/target authority passes.

| Step | Action and pass evidence | Shared package use |
| --- | --- | --- |
| H0 | Integrate the reviewed fix, hold deployments until the release packet passes, resolve final source/artifacts, compare schema/reference digests, privately verify effective roles and current queue state. Classify any mismatch before execution. | B08/B16 |
| H1 | Admit API/email/lead processes on their own credentials and reviewed network scope. Capture selected DB/fingerprint, strict TLS, current grants and relevant denial proof. Check effective email command/ALWAYS, lead command/NEVER and no inherited API healthcheck/frontend serving. Start with controlled one-shot lead execution; recurring cron remains held. | B08/B16 |
| H2 | With consenting Agency owner/member and Developer owner, finish the missing verification/invitation/profile/organisation cases. Obtain links from actual inboxes; verify expiry/replay/wrong-recipient rejection. Preserve IKaya's existing pending state unless its legitimate review is separately in scope. | B10/B18 |
| H3 | Execute real reset, invite and applicable invoice/receipt messages; correlate provider IDs to independent mailbox receipt and working HTTPS links. Prove monitored reply/bounce handling, retry/restart and deduplication without unsafe resend of unknown outcomes. | B10/B14 |
| H4 | After the exact controlled-finance scope is approved, request invoices through normal Agent/Agency/Developer application authority; perform the approved actual bank/payment procedure. No synthetic bank evidence or SQL entitlement activation. Finance matches payer/reference/amount/product/owner before access; preserve rejected/partial/unmatched/duplicate/excess cases and operator disposition. | B11/B14/B18 |
| H5 | For the application-issued private payment document, use owner `billing.getProofDocument`, authorized finance `billing.admin.proofDocument`, a consenting wrong owner and anonymous session. Authorized inline bytes/hash match; unauthorized requests reveal no content/capability. Expired/revoked sessions fail; capture the absence of storage read URLs and submit the signed-read criterion disposition for review. | B07 hosted negatives/B11/B18 |
| H6 | Complete approved Agent/Agency inventory and Developer development/unit publication through normal moderation/entitlement authority. Check desktop/mobile public discovery under the restricted test scope. Reuse completed private draft/image evidence; no broad repeat of geography/login/restoration. | B04–B06 hosted obligations/B11/B18 |
| H7 | One consenting buyer submits one uniquely identified enquiry for each owner. Prove durable correct ownership, recipient's actual delivery/dashboard custody, Agency/Developer assignment and follow-up. Replay must not create a second durable obligation; wrong-owner reads/assignment fail. Retain operator-managed channels honestly rather than calling them delivered. | B10/B13/B14/B18 |
| H8 | Exercise supervised restart, stale lease/retry, unknown/exhausted attention and backlog recovery on controlled obligations. Never force-resend an uncertain provider outcome. At least two approved cron starts/finishes demonstrate effective five-minute scheduling if cron enablement is authorized. | B10/B13/B17 |
| H9 | Execute finance/moderation/support/alert response and accepted weekend/absence/pause/expiry/renewal cases; retrieve the same document/media after controlled runtime replacement. Share measured restore/alert evidence with the separate B17 exercise. | B09/B11/B14/B17 |
| H10 | Reconcile every issued mutation/message to a terminal outcome or explicit incident; preserve records/custody, revoke test sessions, remove temporary access and restore the approved holds. Record object/document/queue IDs privately and sanitized checksums/results publicly. Submit each fully supported package for named acceptance. | B08/B10/B11/B13/B14/B16/B18 |

The existing local B04/B05/B06 Playwright specs use disposable fixtures,
captured email and local origins. **Do not point them at production or turn on
hosted test selectors.** The hosted exercise uses real normal application
authority and the execution manifest.

## 6. Only outstanding decisions, and what they unlock

| Decision/evidence owner | Required input | Unlocked work |
| --- | --- | --- |
| Source reviewer/register authority | Accept the bounded publisher-worker correction and required source checks | Final worker-compatible source and release preparation; no package self-closure |
| Edward / attended release operator | Consenting Agency owner/member, Developer owner, buyer/wrong-owner accounts; exact permitted effects and staffed window; reconcile existing connection/release authority | H1–H3 and the controlled customer journey; no implied permission from this packet |
| Edward / finance operator | Exact controlled payment/bank procedure, legitimate documents and finance account, approved products/owners/window | H4–H5 and paid publication proof; paid configuration must retain explicit owner admission |
| Edward / business-copy reviewer | Resolve only the remaining B15 factual/provider/retention/browser-data fields; dated exact-copy approval and digest | B15 source implementation/rendering and final B16/B18 copy acceptance |
| Edward / operating owner | Confirm monitored contact/alert routes and absence coverage against accepted Mon–Fri 09:00–17:00 SAST model | H3/H9 and B14/B17 operational proof |
| Edward / data and recovery owner | Final B09 category/retention reconciliation; reconcile approved workload, RPO/RTO and recovery-resource budget, supplying only missing decisions | Shared B09/B11 recovery and B17 execution |

Existing founder facts, source preservation, bucket provisioning and product
policy remain accepted within scope. No fresh-account decision, legacy import,
source recapture, duplicate storage resource or new payment product is proposed.
Missing acceptance is not evidence that an implemented capability is broken.

## 7. Approval and recovery boundaries

Current preparation leaves public API maintenance, payment closure, worker/cron
holds and automatic production deployments intact. Paid configuration is parsed
at startup; reviewed source/config changes require redeployment and readback.
An attended rehearsal uses canonical product identifiers, legitimate admitted
owner pairs and its own finite window/approval, not a fixture or blanket bypass.

If worker admission fails, stop that process before external effects, retain the
exact source/config/target evidence and diagnose the concrete cause. Do not
widen privileges or fall back to an API pool. If a send or payment mutation is
uncertain, preserve its identifiers and reconcile; no automatic duplicate write.

After an authoritative Azure write, recovery remains within Azure. Preserve
accepted source captures and current backups; never re-enable a TiDB writer.
A release rollback of application source requires an independently reviewed
schema/consumer compatibility decision. Never deploy the known-broken lead
source as a default worker rollback.

B17 still requires its approved recovery/alert/capacity criteria, including the
24-hour representative run. B18 paid GO and first-customer acceptance remain
separate. This packet does not alter thresholds or silently reduce the three
paid audience scopes.

## 8. Database work record and evidence sources

Classification: **consumer work**, inspect → implement → verify, plus
protected-release **plan** only. Canonical authority is the repository entry
contract/playbook/manifest/policy/exception register; affected consumers read
`catalogue_publishers` and `leads` from canonical Drizzle definitions.
The worker continues to use its existing 16-table grant plan.

Local status/manifest/context passed for the task-owned disposable target
`listify_wt_launch_shared_closure_20261012_5a2ac80a3e3e`,
fingerprint `f1cae8cafe6314dc09b4ac3ce31f627996018dd728dd8645eb23b9f579cb6137`.
The local service was unreachable; no database was started, created, migrated
or seeded. No protected database connection, customer send, payment/document
upload, publication or production/worker deployment was performed. The only
provider mutation is the branch-specific preview correction recorded below.

Dated acceptance sources were read from Edward's Codex Audits folder:

- `2026-10-09 - Remaining Launch Gates - Senior Audit.md` and
  `Engineering Manager Evaluation - 2026-10-09.md`.
- October 10 geography schema, reference and runtime senior acceptances.
- `2026-10-12 - PR 600 Production Private Draft and Image Acceptance - Senior Review.md`.
- `2026-10-12 - Launch Progress and Gate Status - Senior Report.md`.

Canonical package criteria remain
[the blocker audit](19-paid-mvp-launch-blocker-audit.md) and
[the closure plan](24-paid-mvp-launch-closure-execution-plan.md).
Their superseded starting-state observations/schedules are not new work.
Accepted storage evidence comes from
[packet 29](29-mvp1-aws-storage-hardening.md);
B15 facts/remaining decisions from
[the existing preparation record](evidence/b15-copy-approval-preparation-2026-09-27-v0.6.md).

### Branch preview configuration

The original candidate `7000c0432a8019823d9351ae22115996ccef93f5` passed all
five required GitHub CI jobs, including DB Contract Verification, Location
Authority, Lint & TypeCheck, Unit & Integration Tests and Build Application.
Its Vercel preview failed because this new branch had no explicit preview
environment. Provider logs identify the existing hosted build guard.

Two public inputs were created only for this branch and the preview target:
`VITE_DEPLOY_ENV=preview` and
`VITE_API_URL=https://api-staging.propertylistifysa.co.za`.
[Provider creation/readback and removal IDs](evidence/shared-launch-closure-20261012/preview-config.json)
record the bounded correction. Production/shared inputs and build guards are
unchanged. The next pushed source must pass required CI and its preview build;
this configuration receipt is not customer-journey or API admission evidence.
