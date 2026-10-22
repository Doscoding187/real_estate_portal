# B16 integration review packet — 2026-09-27

**Status: B16 OPEN.** Senior review accepted the composed B03–B07 source and
the PLE correction on tested candidate tree `b21f454e215d8b02129e4daa14ba6f8d338406d1`.
B03–B07 remain closed within their reviewed scopes. Hosted readiness remains
open. This packet records Edward's B15 founder inputs and the remaining B09,
B15 and containment gates. It does not merge the candidate, contact providers,
change infrastructure, publish copy, deploy, collect payment or activate
production.

## Review worktree and source boundary

| Identity | Value |
| --- | --- |
| B16 worktree / branch | `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b16-no-spend-convergence` / `prep/b16-converged-candidate` |
| B16 HEAD / accepted composition base tree | `f3f99f806ea9ae6be3132e093ce1cf1a6f185a32` / `b5a3475633ea330469507551574c7e61a73b0900` |
| B16 candidate composition | The exact accepted B07 seven-file diff (`aeea344252f553d0f05babe0958f2d1a441acfc6e97c05dcbfab7c7b088a672c`) was applied to that accepted B03/B05/B06 base; the resulting accepted B03–B07 source tree is `2600386978a46b29f371c230f05511c81be2465f`. |
| B16 tested candidate tree | `b21f454e215d8b02129e4daa14ba6f8d338406d1` — accepted B03–B07 tree plus only the PLE browser spec/config expectation correction; the product runtime is unchanged. |
| Current B07 source diff SHA-256 | `aeea344252f553d0f05babe0958f2d1a441acfc6e97c05dcbfab7c7b088a672c`; current role/session test SHA-256 `6b69d0beb855f700e2d0e79bad30927673c67d256842279cb871c11c066f4c28`. |
| B16 source action | A B16-owned candidate branch now contains the exact accepted B03–B07 composition. It remains a review candidate; no merge to the integration branch, deployment, or production activation occurred. The focused PLE test/config correction is recorded separately below. |
| B15 founder-input preparation | Task-owned worktree `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b15-founder-privacy-input-2026-09-27`, branch `docs/b15-founder-privacy-input-2026-09-27`, HEAD `a05868c66f493e3cbc972a119074c91a10797777`, HEAD tree `b21f454e215d8b02129e4daa14ba6f8d338406d1`; documentation review work only. No product/runtime source changed. |

The exact candidate identity is proven by the accepted base tree `b5a347…`,
the accepted B07 seven-file diff hash, its resulting B03–B07 tree
`260038…`, and the tested B16 candidate tree `b21f…` after the PLE-only test
correction. The candidate remains unmerged and is not a release artifact; any
later release process still needs its own explicit artifact identity and
release verification.

## B03–B07 acceptance inputs

The current senior decision records B03, B04, B05, B06 and B07 closed within
their reviewed scopes. Older task packets retain earlier review/open statuses;
those historical status lines predate the later acceptances and do not replace
the accepted source/evidence identities below.

| Workstream | Accepted source/evidence identity | Verified scope and limit |
| --- | --- | --- |
| B03 | Accepted six-file correction SHA-256 `3e292cce43aafefb20075190bf6064b8e2c22ef1785843873f8dffe43880ea76`; included in composed base tree `b5a3475633ea330469507551574c7e61a73b0900`. | Payment/term lifecycle containment and the accepted B03 policy. B03 remains closed; normal production activation remains a separate gate. |
| B04 | Refreshed B04 journey and focused regressions recorded in the current B04/B07 review packet. | Joined Agent paid journey 2/2, focused server 7 files/23 tests, client 9 files/38 tests; these results are reused because only the B07 role/session test changed after the earlier matrix. |
| B05 | Accepted test correction SHA-256 `1e210e5e348576d82663136a2fa2f215f9def31a1fe364dcddf6298072bfd754`; accepted eight-file B03/B05/B06 composition SHA-256 `926086a2e3cf68e9edc1c3d0969717352af6feb42c0d5c91f01c5970b129a711`. | Dedicated Agency paid journey 1/1 and the recorded B05 access, membership, publication, enquiry, revocation and history evidence. B05 remains closed. |
| B06 | Accepted composed source tree `b5a3475633ea330469507551574c7e61a73b0900`; accepted B06 spec SHA-256 `2ce67a21dc05c0bcb9cae67ea8001dbe7a594c71cc48d92f06db57dfb17944d7`. | Current Developer journey report 370 passing steps, including both Gauteng selections; recorded authority result 31/31. Historical Gauteng failure remains unattributed; local provider substitutes do not prove hosted readiness. |
| B07 | Senior-accepted candidate tree `2600386978a46b29f371c230f05511c81be2465f`; seven-file source diff SHA-256 above. | Earlier direct API matrix 11 files/99 tests remains valid for its recorded source. After the sole test amendment, the focused role/session file passed 1/5 on the accepted tree. No full-matrix rerun was required or performed. |

The current B04/B07 packet is
[`b04-b07-security-matrix-2026-09-26/review-packet.md`](b04-b07-security-matrix-2026-09-26/review-packet.md).
Its three sanitized evidence files have these SHA-256 checksums:

| Evidence | SHA-256 |
| --- | --- |
| `review-packet.md` | `2cdf36a7ea1e29f894d1aa522eae750915dff2d114a8c2424161c819546dd727` |
| `security-matrix.json` | `d585cd7db57817c6190d9cf10d7fb89569009e3dfe37d62f4738896aefc36995` |
| `role-session-audit-cases.json` | `4329fb5d0ecd80e9a56670d4c31d062ff5b62859cc4c4c155602d31ca1c37d57` |

The historical PLE run on September 26 stopped at its first assertion (**1
failed / 9 not run**): the config enabled the exact `agency_launch_access`
governed test selector, while the spec expected the generic preparation-only
landing. The observed Agency Launch Access page was correct for that isolated
test selector. B16 changed only the PLE test/config expectation to follow the
enabled Agency landing and its owner-account CTA; the onboarding checks still
assert that no invoice, payment request, or publishing activation occurs. The
updated Database Authority rerun result, target identity and cleanup evidence
are recorded below after verification.

The corrected command
`pnpm test:browser:authority -- --config=playwright.ple-agency-operating.config.ts`
passed **10/10 cases** on tested candidate tree `b21f454e215d8b02129e4daa14ba6f8d338406d1`
and exact disposable target fingerprint
`af8dc5d6cb434ff5e3abcd89eb43518a4b58017d407a729e2a26df6a168408e8`, migrated
to `0094_content_topics_primary_key.sql`. The run includes owner and member
registration, reviewer approval, gated invitation acceptance, private draft
and media authoring, moderation/resubmission, public publication and discovery,
enquiry custody/replay, and assigned-agent follow-up/history. The full sanitized
case report, Authority results and governed cleanup record are in
[`b16-ple-browser-journey-2026-09-27.json`](b16-ple-browser-journey-2026-09-27.json).
The test's archive, entitlement-release and no-transaction assertions passed;
Authority then disposed the exact target and stopped its local MySQL service.
Email capture, media proxy and in-memory Redis were local substitutes, not
hosted-provider evidence.

The sanitized B04/B07 review packet and its two JSON evidence files were copied
into this B16 worktree without changing the B07 source worktree. Their bundled
`SHA256SUMS` file passes in this worktree, preserving the original evidence
identity for review.

## B15 copy approval gate

B15 remains OPEN. The founder-accepted review copy v0.3 remains preserved at
SHA-256 `d2925868819a8614b95eee3cd7b3aebf437bbde084681c1b83f055d33165c368`.
The current next review revision is
[`b15-founder-approval-candidate-2026-09-27-v0.4.md`](b15-founder-approval-candidate-2026-09-27-v0.4.md),
version `B15-FOUNDER-REVIEW-0.4`, SHA-256
`1e7e88252945b41ebd720712a053cd9fd5c4fe0f30d84a2002d50ac9b74457d8`. Its
facts register is
[`b15-copy-approval-preparation-2026-09-27-v0.6.md`](b15-copy-approval-preparation-2026-09-27-v0.6.md).
Current B15/B09/B16 evidence hashes are listed in
[`b15-b16-founder-input-sha256-2026-09-27-v0.6.txt`](b15-b16-founder-input-sha256-2026-09-27-v0.6.txt),
with its sidecar digest in `b15-b16-founder-input-sha256-2026-09-27-v0.6.txt.sha256`.
The prior v0.4 copy, facts register, B16 packet/manifest and checksum set are
preserved in [`b15-b16-review-snapshot-2026-09-27-v0.4/`](b15-b16-review-snapshot-2026-09-27-v0.4/).
The older copied v0.3 checksum list is retained as historical preparation
evidence from its prior worktree snapshot; it does not cover this worktree's
accepted B14 documents and revised B16 files. Use the v0.6 list for the current
founder/B09/B16 artifacts and the accepted B14 schedule checksum manifest for
B14 artifacts.

The founder-supplied customer-facing physical/business address is **96 Jorissen
Street, Braamfontein**. Its suitability for formal correspondence or legal
service remains to be confirmed. Privacy requests are routed to
`support@propertylistifysa.co.za` with the subject line **“Privacy Request”**;
there is no separate public privacy mailbox. Privacy complaints may first use
support without restricting a person's right to approach the Information
Regulator. Edward / Founder owns the information/privacy responsibility; this
is not a claim of independent professional review or Information Officer
registration.

The v0.4 draft incorporates the supplied MVP privacy decisions: restricted
operational purposes; no sale of personal information; only necessary sharing
with production providers; access/correction/deletion/objection/consent
withdrawal routes; separate optional marketing consent and opt-out; necessary
authentication/security/session cookies; no advertising or behavioural tracking
cookies in the MVP position; no indefinite retention; and Terms acceptance
plus Privacy Notice availability at collection. Actual provider names/categories,
locations/safeguards, category-level retention and disposal based on B09, and
cookies/analytics in the accepted production artifact remain unresolved. The
Information Officer registration status is **UNVERIFIED**: no company-specific
certificate or authenticated verification was available here. No claim that
registration is complete or absent is made; the status requires evidence.

Other B15 holds include confirmation that the supplied address is fit for
formal correspondence/legal service; registration place and any required
office-bearer disclosure; whether/how the WhatsApp message number satisfies any
public telephone disclosure; support-channel operation proof; exact dated copy
approval; public version/effective dates; and rendered `/terms`, `/privacy`,
collection-consent and invoice/payment consistency evidence. The draft is not
approved or publishable. B14/B18 and B09 dependencies remain separate.

### B14 schedule documentation and operational rehearsal

B14's documentation implementation is accepted. The procedure SHA-256 is
`80545f1092297fb0bf7d634ed54005be45326d49bc634f0fa3d3a610d73b3acf`; its
reviewed proposal SHA-256 is
`5a6857e5c41c79f0e0d62cd8fd54850dfd8c425652b8c064930d65781dbc613a`. It
preserves Monday–Friday, 09:00–17:00 South Africa time excluding South African
public holidays; the existing weekday-specific sales-window limit and 72-hour
maximum; pause when the next attended check would exceed that limit; pending
records and paid access; and blocked finance activation until return-time
triage/reconciliation is complete and controlled resumption occurs. B14 remains
OPEN for operational rehearsal covering ordinary weekends, extended holiday
closures, missed checks and pause/resumption. This B15 update claims no rehearsal.
See [`b14-schedule-reconciliation-implementation-2026-09-27.md`](b14-schedule-reconciliation-implementation-2026-09-27.md)
for the accepted procedure evidence; its original checksum set remains intact.

## B12 diagnostic gate

The September 27 public DNS/TLS/HTTP observations are refreshed in
[`b12-public-diagnostics-2026-09-27.json`](b12-public-diagnostics-2026-09-27.json).
The API returns liveness and version 200 on SHA `4e012b3044628fc06da7489c0055e9ce01bdc8d9`,
but readiness is 503; the frontend version endpoint returns HTML, apex TLS
hostname verification fails, and both staging names are NXDOMAIN. The
September 24 variable-only observations remain historical; their nine
candidate gaps were not rechecked. The new dated checklist is
[`b12-diagnostic-preparation-2026-09-27.md`](b12-diagnostic-preparation-2026-09-27.md).
No provider configuration, authenticated session or staging operation was
inspected or performed. The mandatory Database Authority preflight in the B12
worktree resolved only its owned local disposable target, which was
unreachable; ledger and schema state were not evaluated. That result is
explicitly not hosted evidence. The sanitized command record is
[`b12-database-authority-preflight-2026-09-27.json`](b12-database-authority-preflight-2026-09-27.json).

B12 diagnostics require a frozen artifact identity, sanitized public
DNS/TLS/version/readiness observations, read-only effective service config,
and isolated staging proof for cookies, origin/proxy behavior, Redis, S3,
email, lead delivery, term scheduling and restart. Preserve issue keys only;
never include secret values, full credential URLs, cookies or customer data.
Stop on artifact mismatch, readiness failure, schema/target inconsistency,
staging DNS/certificate failure or any unexpected side effect. B08 owns the
database release boundary. B10/B11/B13 own real providers and their acceptance;
B14 owns the staffed sales window; B17 owns continuous monitoring; B18 owns
exact-artifact acceptance.

## B09 source-data census and disposition prerequisite

Edward / Founder, Property Listify (Pty) Ltd, is the accountable owner for
approving Paid MVP source-data transfer, retention, archive, disposal, or
deferral. Edward has now supplied preliminary category-level dispositions.
They are not final, do not establish launch data scope, and authorize no data
access or mutation. The full founder record is
[`b09-founder-data-scope-preliminary-dispositions-2026-09-27.md`](b09-founder-data-scope-preliminary-dispositions-2026-09-27.md).

No source system has been verified as authoritative. Prior use in production
or historical references alone do not establish authority. Potential former
production database, storage, or provider systems may be evaluated only from
current source-specific evidence. B09 still requires the governed census to
verify actual systems and records, provenance, ownership, current/real versus
test status, purpose, launch need, legal/accounting/support/security/recovery
obligations, and parent relationships for retained media. Only then can a
final disposition and B15 category-level retention schedule be approved.

Census execution is **NOT AUTHORIZED / NOT EXECUTED** pending source-specific
read-only Database Authority authorization. No TiDB or other historical
source was accessed. After `pnpm install --frozen-lockfile` completed with
exit 0, `pnpm db:authority:status` completed with exit 0 for this worktree's
exact-owned disposable target only. The local service was unreachable; ledger
and schema were not evaluated and no database was provisioned. This is not
source authorization or census evidence. Sanitized results are recorded in
[`b09-database-authority-preflight-2026-09-27.json`](b09-database-authority-preflight-2026-09-27.json).

The concrete request
[`b09-read-only-census-authorization-packet-2026-09-27.md`](b09-read-only-census-authorization-packet-2026-09-27.md)
records TiDB, prior public-media storage and Azure provenance; exact historical
fingerprints where available; unresolved current bindings; the approved
least-privilege envelope, census scope, required aggregate evidence and stop
conditions. No supported B09 census runner was identified in the authority
contract, so Database Authority must identify/register one and Edward must
approve each exact source before any query. Historical B08 inventory commands
are not revived. No provider or source access occurred.

The founder's preliminary list distinguishes launch-required real identities,
listings, developments and leads from synthetic/test data; preserves real
financial records and required audit/security/history by transfer or archive
as applicable; transfers media with verified retained parents; and defers
anything whose ownership, purpose, provenance or continuing need is uncertain.
These remain preliminary classifications only. No transfer, archive, retention
execution, disposal, deletion, or other destructive action is authorized.

## Founder and owner decision queue

These decisions remain open; confirmed facts and document preparation do not
supply or imply operational proof or final publication approval.

| Owner | Required input | Status |
| --- | --- | --- |
| Edward / Founder | Customer-facing address supplied as `96 Jorissen Street, Braamfontein`; confirm formal correspondence/legal-service suitability. Privacy requests use `support@propertylistifysa.co.za`, subject “Privacy Request”; no separate privacy mailbox. Confirm company disclosure facts, whether/how WhatsApp Support meets telephone disclosure, Information Officer registration evidence, and support-channel operation. | Partially supplied; B15 remains open. IO registration is unverified, not claimed complete or absent. |
| Edward / Founder (accounting review owner unless delegated) | Review VAT wording, payee and final invoice/receipt text against governed billing configuration; record approval or any delegation. Founder confirmation is not independent professional verification. | Open |
| Edward / Founder (legal/privacy review owner unless delegated) | Review and approve the dated exact copy or record any delegation. Resolve provider/configuration disclosures, retention schedule from B09, cookie/analytics artifact inventory and remaining privacy/company disclosures. | Open; v0.4 review draft prepared, not approved or publishable. |
| Edward / Founder (B14 operator) | Complete rehearsals for ordinary weekends, extended holiday closures, missed checks and pause/resumption against the accepted B14 procedure. Prove monitored contacts, queue handling and paid-access preservation. | Procedure accepted; B14 operational acceptance remains open. |
| Infrastructure owner + Edward | Concrete staging resource, DNS/certificate and access proposal, costs, and operation-specific approvals. | Open |
| Edward / Founder — accountable B09 data owner; Database Authority owner for technical operation | Review the [B09 read-only census authorization request](b09-read-only-census-authorization-packet-2026-09-27.md); identify/confirm current exact sources and approve source, purpose and scope. Database Authority must identify/register a supported aggregate census runner and approve exact target fingerprint, grants and expiry. After those separate approvals, execute census and approve evidence-backed final dispositions and B15 retention scope. | Preliminary dispositions supplied; request prepared; source approvals and supported runner absent; census not executed; final disposition remains open. |

Hosted acceptance remains a later release gate. It is not a circular
prerequisite for preparing this integration candidate; staging or provider
operations still require the concrete owner proposal and approvals above.

## B16 decision and remaining limits

The accepted source composition and PLE correction remain attached to tree
`b21f454e215d8b02129e4daa14ba6f8d338406d1`; this documentation refresh preserves
that product/runtime source. It does not close B16 or hosted readiness. B09 source census/final disposition
remains open despite the founder's preliminary input; source-specific
read-only authorization and a supported, approved census runner are required
before census. The local authority preflight now passes for this disposable
worktree only and does not satisfy source authorization. B14 operational rehearsal, B15 final approval and rendered proof, final
candidate verification, and deployment containment remain open. B12 provider proof and the stated hosted limitations
also remain open.

No B16 integration merge, B08 database cutover, provider setting change,
deployment, customer payment collection or production product activation was
performed. B03–B07 stay closed within their accepted scopes; hosted readiness
and B16 acceptance remain open.
