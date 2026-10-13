# B15 controlled installation and hosted verification

13 October 2026. Preparation only. Extends the existing database and shared-hosted release procedure; grants no production action or destructive approval. Continue the task-owned B15 branch. Current database route: consumer/release preparation, source implementation and synthetic rehearsal on the exact owned disposable target; no protected connection. The test target is disposed and its service stopped after rehearsal.

## Exact-copy package

Approved bundle candidate: `property-listify-legal-2026-10-13.1`; Terms `terms-2026-10-13.1`, Privacy `privacy-2026-10-13.1`. [Manifest and exact hashes](evidence/b15-existing-certificate-20261013/release-candidate.json) and [final approval](evidence/b15-existing-certificate-20261013/final-privacy-approval.json) remain immutable. Payment commitments preserve review 0.7. Certificate replacement and repeat approval are unnecessary.

`server/services/legalReleasePreparation.ts` compiles the reviewed candidate/receipt and exact Terms/Privacy bytes into the existing canonical row shape. It verifies both document hashes, versions, business/final references, approval timing and the canonical fixed-v1 digest/validator. It refuses placeholders or changed bytes. Its result is explicitly `prepared_not_installed`; it has no database imports, credentials, connection, grant or mutation. Planned time must equal the actual controlled release timestamp after approval before activation; a rehearsal timestamp is not a public effective date. Recompile/digest/review that metadata during the authorised release, without changing approved text or backdating.

This compilation validates integrity and format, not authenticity of an arbitrary caller's approval claim. Inputs must be the reviewed Git receipts backed by the recorded founder decision. Test fixtures remain synthetic.

## Installation sequence and safeguards

1. Review/integrate the exact branch through required CI and ordinary merge controls. Resolve the real integration head; do not deploy a worktree or reuse old approvals. Keep public intake, finance activation, workers and automatic deployment held.
2. Resolve the exact protected fingerprint/current migration head through the canonical authority. Read-only plans and protected connection approvals still require their established operation scope. Expected source head is `0114_user_legal_acceptances.sql`; actual old head is a readback, not a guessed `0111`.
3. Use the existing named schema-release plan/apply path for any genuinely pending migrations, with the real plan digest, dedicated ephemeral migration credential, current approval/deadline and exact acknowledgement. Verify attempts/head/physical congruency separately. No manual DDL, schema push, ledger editing or startup migration.
4. Use the implemented bounded **named legal-copy install operation** under the same canonical authority: `db:legal:release:prepare`, `plan`, `ack`, `apply`, `verify`. Preparation reads the exact committed candidate, final receipt and Terms/Privacy with `git show` from a clean checkout. Its packet binds source head, canonical manifest digest, explicitly reviewed prior pointer, effective time and a positive activation window of at most 30 minutes. The apply requires its exact plan digest and operation/fingerprint approval plus acknowledgement; protected migration credentials remain separate and TLS verified. It checks accepted history/attempts and canonical physical legal tables using InnoDB, takes the shared migration lock, then locks the same registration/purchase pointer inside one transaction. It inserts immutable copy once and switches only `account_registration`. Same-ID/different-row collisions and stale priors fail closed; exact replays perform no copy/pointer writes. No acceptance backfill, released-text update/delete, schema/grant change or synthetic fixture substitution. Activation occurs within the bounded effective-time window; scheduled metadata is not evidence of actual activation. Both times must be retained.
5. Runtime privileges: `SELECT` on `legal_releases` and `legal_active_release`; `SELECT, INSERT` on `user_legal_acceptances`. No runtime copy/pointer write or acceptance deletion/update. Release operator permissions must be separate and minimal. Existing grant digests are not silently extended; the offline `legalRuntimeGrantPlan` and retained `legal-runtime-grant-delta.json` prepare exactly three restricted grants against the frozen reviewed predecessor footprint. The retained offline delta executes nothing. `db:legal:runtime-grants:plan` and `db:legal:runtime-grants:apply` now provide the separate named protected grant procedure. Plan is database-free; apply requires its exact plan digest, operation/fingerprint approval, exact acknowledgement and an ephemeral bootstrap-admin URL supplied on stdin (never in application variables). It binds to head0114, the exact model/manifest and the frozen prior Place grant footprint; it verifies physical schema/history/attempts under the canonical migration lock, dispatches only the three grants, verifies the resulting exact footprint and closes the connection before success. Partial dispatch, lost acknowledgement or cleanup failure is unsafe to replay. Independently test positive/negative permissions with the real runtime identity after the admitted operation. The retained Place grant operation is not repurposed. Local isolated-CI grants already reflect these restrictions.
6. Read back the exact released row/hash and active pointer independently, then test the matching deployed API/frontend release with intake held. A health endpoint, migration head or source build alone does not prove installed copy or permissions.

## Named command inputs

At the approved controlled release, use a clean reviewed integration checkout. `prepare` requires `--effective-at=<UTC time>`, `--valid-until=<UTC time, no more than 30 minutes later>`, and `--previous-bundle=<verified bundle ID or none>`. Save the JSON output from the direct `tsx scripts/databaseAuthorityCli.ts legal-release:prepare` command outside the checkout; preparation does not connect or activate copy.

`plan` and `verify` take `--packet=<absolute JSON path>` and the established read-only credential/operation approval. `apply` takes that same packet plus `--plan-digest=<reviewed digest>` and `--ack=<exact legal-release-apply acknowledgement>`, with the established protected migration channel/approval. Plan may run in the preceding 30 minutes; apply must occur on/after the effective time and before expiry. A missed window requires a freshly prepared/reviewed operational plan, not another approval of unchanged customer text. Later read-only verification of the original packet is allowed. The packet never makes a planned rehearsal timestamp a public release date.

The command's receipt records source/schema/bundle/hash/active pointer, operation approval and client commit-dispatch/acknowledgement timestamps (plus whether activation changed), without customer data. Keep an actual activation receipt alongside the planned effective date. This is preparation for the existing controlled release, not authority to execute it now.

## Containment and rollback

Before any approved apply, retain sanitized prior pointer/head/grant digests and private rollback material under existing custody. If installation is absent/invalid, registration and new paid commitments in this prepared artifact fail closed. This is not a claim that an older hosted artifact has acquired the new guard. If artifact, pointer, row or grants disagree, close affected intake and finance activation, keep worker admission held, preserve attempts and investigate; do not retry an ambiguous apply. The installer marks a lost COMMIT response unsafe to replay; named read-only verification remains available after its activation window expires. The CLI preserves primary/result evidence if connection closure fails and does not report successful completion before closure.

A pointer rollback may select an already-preserved valid historical bundle only through a separately authorised bounded operation and expected-pointer check. Never erase a release or accepted evidence. With no previous valid bundle, remain contained. Code rollback must preserve the released consent contract; an old artifact that bypasses recorded acceptance cannot be admitted just because it starts. No down migration or automatic revoke/delete is prepared here.

## Hosted cases to append to the existing shared exercise

| Normal-flow check                      | Required evidence                                                                                                                                                                     | Stop condition                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Actual release/regions/agreement scope | Exact API/frontend/worker identities, storage bindings/regions, permitted frontend plan, applicable provider terms and finance-location disposition                                   | A stale/different artifact, missing material agreement or unresolved affected foreign tax retention keeps that flow contained. |
| All ten legal aliases, desktop/mobile  | Exact installed text/version/effective time and hashes, available historical links, print/save, no draft instructions                                                                 | Missing, substituted or different content.                                                                                     |
| New consenting account                 | Initially unchecked choice, correct links; absent/false/stale choice rejected with no partial user/profile/evidence; valid choice creates one account and one evidence row atomically | UI-only or forged acceptance, partial writes, mail before commit or accepted old form after pointer switch.                    |
| Three paid owners                      | Ordinary Agent/Agency/Developer invoice request records one server-derived bundle and exact canonical price/term; unchecked/stale/different quote denied                              | Incorrect owner/quote/bundle, backfill, marketing implication or duplicated commitment.                                        |
| Invoice email                          | Original issuance-bundle Terms/Privacy links, confirmed payee, proof/activation distinction and support; genuine delivery evidence in the existing mail case                          | Current-bundle substitution or unapproved finance flow.                                                                        |
| Enquiry and browser storage            | Notice at collection, correct recipient/custodian, explicit contact choice; actual authenticated local storage and cookie observations with consenting actors                         | Implied optional marketing, wrong recipient or unsupported clearing/retention claim.                                           |
| Private proof                          | Normal owner receipt, authenticated authorised finance read, wrong owner and anonymous denied, public-media identity denied for an independently existing harmless proof              | Any disclosure, missing target existence or mismatch with approved foreign/domestic finance disposition.                       |
| Interaction endpoint                   | Named event received successfully, operational output contains only its type despite supplied sensitive fields; no newly enabled external tracker                                     | Retained user/session IDs, URLs, arbitrary payloads or unexpected tracker requests.                                            |

Collect minimal references/hashes/outcomes, not private proofs, identity numbers, credentials or complete request bodies. Actual consenting actor/time/mailbox evidence comes from the existing hosted packet. The prior geography/save/login/storage work is reused where valid; do not reproduce it just to create new paperwork. B17 workload/restore remains its own gate.

## Current verification

New offline checks exercise the real Express route on a temporary loopback listener, conservative finance review and exact-copy compilation. Existing legal validator tests are included. Tests use no database and send no real mail/provider traffic. Typecheck and focused lint accompany the source change; results are retained in the internal-review receipt. The real approved candidate also has a compiler format rehearsal; its timestamp is explicitly provisional and it installs nothing.

The named installer and offline grant delta are implemented. Local verification includes 87 focused checks, the database-authority static gate and 13 real MySQL rehearsal checks, including a registration-style pointer lock and an actual commit followed by an injected lost acknowledgement. The CLI read-only plan is exercised separately. Only synthetic text is installed locally; four historical synthetic rows are preserved and no user acceptances are fabricated. The exact test database is then disposed and the task-started local service stopped.

Remaining work is integration/CI, applicable provider/finance dispositions, authorised schema/copy/grant execution and independent hosted verification. The named grant procedure is implemented, not applied; no protected operation approval is inferred from its offline JSON. Internal review does not wait for an external professional. No production installation, grant or hosted result is claimed complete.

## Founder progression and domestic storage implementation

Completed B15 review/decision/local items are closed; B14 is the active next
gate. Installation and hosted observations stay on this existing execution
checklist. Unchanged approvals and accepted packages are preserved. No adviser
appointment or second general review is required.

The prepared `scripts/storage/south-african-finance-storage.template.json`
defines new primary and separate backup buckets in the existing AWS account,
conditioned on Cape Town (`af-south-1`) and the exact account. Wrong-region or
wrong-account execution creates no resources/outputs; it is not a successful
installation. Both buckets use encryption, all public-access blocks,
bucket-owner-enforced ownership, versioning, TLS-only and explicit principal
isolation. The runtime identity may GET/PUT only `billing-proofs/*` in primary,
cannot delete versions/objects and has no backup access. The backup gets
same-region replication without propagated delete markers or automatic record
expiry. CF deletion/replacement retains both buckets. No access key, secret,
production variable change or existing media resource is in the template.

The read-only `tsx scripts/storage/verifySouthAfricanFinanceStorage.ts
<primary-bucket> <backup-bucket> <runtime-arn> <operator-arn>` uses the existing
AWS SDK process/profile credential chain and expected bucket-owner guards. It
checks actual locations, versioning/encryption/public blocks/TLS/principal
isolation, absence of automatic expiry and exact domestic replication. Output
explicitly leaves runtime exercises, recovery and migration false. Neither
configured versioning nor replication is a completed recovery test.

Execution order: obtain the existing AWS operator session and check Cape Town
region admission; validate the prepared CF template/change set under the
existing infrastructure/spend controls; provision only the dedicated resources;
retain real outputs and run the verifier. Then use a synthetic dedicated canary
for runtime PUT/GET, wrong-owner/anonymous/public-media identity/backup/delete
and version-delete denials. Retain its original version/checksum, overwrite the
canary, wait for confirmed replication, independently read the original backup
version with the recovery identity, compare exact bytes/checksum and record
elapsed time. Leave ambiguous outcomes contained; no customer object deletion.
Same-region separate-bucket replication improves isolation and accidental-loss
recovery; it does not claim independent regional-disaster recovery. Existing
objects are not covered by automatic replication; copy/census/checksum them
explicitly if any actual financial documents exist.

Keep required finance rows in the South African Azure database and archive
necessary readable finance exports in the dedicated domestic primary/backup,
using a release-authorised read-only export route. The present 14-day Azure
backup horizon is recovery configuration, not the accounting-retention period.
Never truncate financial rows based on that horizon. Apply a named bounded
document relocation/database-metadata transition only after real inventory and
preservation evidence; no historic bucket fallback or manual database edit.
Keep existing foreign records preserved/contained until their specific
retention/disposition is resolved. No completed migration or zero-customer-proof
claim is inferred from the old canary.

Hosted proof writes and reads now reject overseas/unadmitted buckets. Existing
verified public-media and non-financial functionality can progress separately.
Billing email notification bodies no longer retain individual financial facts
at the overseas email provider; canonical invoice/payment facts remain inside
the authenticated account. The old approved legal bytes remain immutable.
After actual migration, update only the changed location/processing disclosure
as a new legal version, preserving the old approval/history and applying the
same controlled installer. Never claim domestic object storage before readback.


## Focused manual-EFT notice release — founder brief, 13 October

The founder's EFT implementation brief authorises the signed-in no-attachment
payment notice and customer-facing invoice, pending-review and activation
emails. This supersedes the earlier neutral-only billing email recommendation
for this journey. Resend remains the existing provider; overseas retention is
recorded as a founder-owned follow-up, not a verified compliance conclusion.
No attachment, bank credential or internal reconciliation note is included in
these customer emails. No new storage service or payment gateway is required
for the notice. Existing hosted proof-storage guards remain in place.

The historical approved `terms.txt`, receipt and candidate remain unchanged.
`evidence/b15-existing-certificate-20261013/terms-payment-notice-2026-10-13.2.txt`
is the prepared narrow amendment: no mandatory document, and the activation
target starts after received funds are matched and full settlement approved.
It is prepared text, not an installed release or a replacement approval receipt.
Use the existing versioned copy release process when including this amendment;
do not substitute its bytes into the old receipt or install the older upload
wording as if it describes the revised flow. No external reviewer prerequisite
or general B15 reopening is introduced.

Controlled deployment order for this feature:

1. Merge the reviewed payment-notice source only after required CI passes.
   PR #608 is already merged at `8daa007de27fef20f1cd5d9671df8c575807e478`.
   Keep Railway/Vercel production auto-deployment, public intake, sales and
   worker dispatch held while funding remains pending.
2. From a clean reviewed integration checkout, resolve the real Azure schema,
   attempts and grant footprint. Apply only genuinely pending canonical
   migrations through `pnpm db:release:plan` / `pnpm db:release:apply`, with the
   reviewed digest, protected credentials and exact target acknowledgement.
   This feature adds no migration or new runtime privilege.
3. Include the matching recorded-copy amendment through the named legal
   preparation/plan/apply/verify procedure above. Apply the separate bounded
   legal runtime-grant operation from PR #609 through its own protected plan,
   acknowledgement and ephemeral bootstrap-admin channel; do not reuse a
   migrator as a grant administrator. Read back actual copy and permissions.
4. Restore funded hosted runtime through the existing controlled API/frontend
   release. Resolve the exact merged artifact head; do not deploy a worktree
   or turn on production Git triggers as a shortcut. Verify process identity,
   readiness and runtime permission denials before exposing customer intake.
5. With one admitted attended customer, request an invoice, check actual bank
   instructions/reference, submit “I’ve paid” without a file, and verify the
   finance queue remains pending. Use an actual matched EFT only under the
   existing finance authority; enter its verified amount, exact received bank
   reference and reconciliation note. Confirm one settled invoice and one
   90-day term. Test duplicate notices/approvals and exception containment.
6. Admit the existing email worker through the held worker-admission procedure.
   Collect genuine delivery evidence for invoice instructions, notice
   acknowledgement and activation dates. Synthetic provider tests do not prove
   delivery. Unknown sends require reconciliation, not a blind retry.
7. Run the shared agent property journey: profile/preparation, property draft,
   review, publication, public discovery and enquiry delivery. Open attended
   sales only for verified journeys within the existing admission/calendar
   controls. Do not infer hosted acceptance from local test results.

Containment remains the existing sales/intake/worker hold and preserved
canonical financial/consent records. Do not roll back to an artifact that
bypasses recorded acceptance, manually activate access, replay an ambiguous
protected installation, delete evidence, or change pricing, plan pairs,
moderation or the 90-day term. A source merge, local test or prepared Terms
file is not production installation or storage migration evidence.
