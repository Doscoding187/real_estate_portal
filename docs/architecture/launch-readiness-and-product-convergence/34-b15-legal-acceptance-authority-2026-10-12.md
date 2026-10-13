# B15 durable acceptance implementation

12 October 2026. B15 OPEN; eight scopes accepted. This is a local schema-authority
slice from integration c475ed724, branch feat/b15-legal-acceptance-authority-20261012.
The earlier copy preparation worktree remains separate and intact.

## Admission and model decision

Classification: additive schema authority, initially inspect/plan. Canonical
authority is modular Drizzle, generated inventory, active manifest and Database
Authority v3. No compatibility exception, alternate schema or new runner.
Target: disposable-worktree, listify_wt_b15_legal_acceptance_authority_3200f8a41f86,
127.0.0.1:3307, fingerprint
3d1259268441812f91c3ee04775defa67522ef1902bc72c3a97382fcf96d1bf4.
Initial status: exact worktree, service unreachable, schema/attempts not evaluated.

Reviewed origin/main manifest is through 0111_properties_canonical_place_reference_fk.sql,
checksum 2ce21151b1793e94436d3018da62aa730a950409b25dbab9cb68893ec530926b.
Proposed next transitions: 0112 legal_releases, 0113 legal_active_release,
0114 user_legal_acceptances. Each is one additive CREATE TABLE, kind ddl,
single-ddl policy, exact predecessor checksum. No existing migration changes,
draft installs, source imports, customer backfills or remote/protected application.
Recheck integration before merge because sequence membership is serialized.

Released Terms and Privacy text, versions, approval reference/actor, effective
date and exact fixed-format digest have one immutable bundle authority. A
separate singleton policy pointer chooses the bundle for registration. Lock
that pointer inside registration before validation/writes; a release switch
must lock the same row and may not rewrite approved bytes. No runtime API grants
approval or installs/releases copy. The initial schema contains no legal release.

Acceptance appends a random evidence ID, canonical nullable user link, bundle
link, document/release digests, server UTC time and account_registration source.
Versions and full copy resolve through the immutable bundle rather than competing
event snapshots. Explicit true and displayed current bundle ID are required;
approval, user identity, time, hashes and marketing permission are not client inputs.
Account, optional agent profile and acceptance commit in one transaction. Email
is sent only after successful commit. Missing/unapproved/stale release denies
registration rather than substituting draft copy or skipping evidence.

Deletion minimisation: user FK SET NULL preserves the minimal acceptance event
without retaining email/name/IP or preventing account deletion indefinitely.
The random evidence ID and bundle survive; identity is no longer recoverable
from this table after unlinking. Any necessary identifiable dispute hold must
be reviewed before account deletion, not secretly reconstructed here. Immutable
bundle FK RESTRICT prevents loss of referenced copy. No general edit/delete API
is provided. Governed retention disposal is a separate bounded operation. The
founder confirmed the proposed business schedule subject to finance/legal review;
the proposed post-closure three years remains conditional on that legal review.

Required proof: static manifest/inventory/authority, focused policy and route
contracts, actual local transaction rollback and durable success against the
canonical schema, physical congruency, type/build checks. A schema or mock test
alone is not recorded customer acceptance or B15 closure. Failed/ambiguous local
service or migration state stops the corresponding apply workflow.

## Founder facts received

Edward confirmed legal-document receipt at 96 Jorissen Street, Braamfontein;
Johannesburg, Gauteng, South Africa as incorporation/registration location; sole
director and full registered name Lehlohonolo Banda. He states no accreditation
or dispute-scheme membership. No subscribed code of conduct was subsequently confirmed. Information Officer
registration was outstanding on October 12 after Edward replied “none so i need
these”. On October 13 Edward supplied the successful-organisation-registration
confirmation: completed on founder report, with certificate reportedly emailed
and downloaded. Edward subsequently supplied Lehlohonolo Banda as the
registered Information Officer. The supplied certificate was subsequently
inspected: registration date 2026-10-13, reference 2026-069040, private-company
CIPC number 2026/702814/07. The printed organisation name PROPERTY LISTIFY t/a
DOS HOLDINGS differs from the draft supplier name; clarification is pending.
The certificate was preserved privately and its SHA-256/minimal fields retained
in repository evidence; no independent portal verification is claimed. Remaining processor/transfer review and final exact public copy approval
are not inferred from those factual confirmations. No identity document is needed
for the office-bearer disclosure. Final approval must identify resolved text,
versions, digest and effective date before any release installation/publication.

## Local verification and remaining release boundary

The owned target was created once and migrated from a fresh target through
0114_user_legal_acceptances.sql. Apply completed successfully; final read-only
plan reports no pending work. A mid-run read-only plan declined the then-running
0050 attempt; this was an observation during the same successful apply, not a
failed attempt or a retry. No ledger was edited and no migration replayed.
Physical congruency passed with identical desired/actual digest
65996db8ffc4fe1b8906108abe58c6202aae247d8ee8f0fef1e2e7c3da345721.

Verification passed: Database Authority static/lifecycle/inventory gates (720
tests), 51 policy/auth/route tests, 17 new/existing registration UI tests,
12 real local database cases, typecheck and production frontend build. All local
release/approval/account fixtures were synthetic. No actual company copy was
installed, no mail sent and no provider resource used. Retained command evidence
is in evidence/b15-legal-acceptance-20261012/. Final whole-suite/lint results are recorded below. The exact owned
target was disposed with its emitted acknowledgement after fixture cleanup,
and the native service stopped through its validated Unix socket. Recovery
reported a clean-stop no-op; inactive legacy home residue was never adopted.

The UI requires an unchecked explicit choice, preserves form inputs while
opening exact-bundle document links in a new tab, and reloads documents/clears
the choice after stale-release rejection. Terms/Privacy aliases render the
server-approved archived text or a customer-facing unavailable state. No raw
HTML is rendered. Pending customer wording stays in the internal review packet.
There is no marketing choice or inferred permission.

The new canonical table count is 224. CI application grants are SELECT-only on
released copy/policy and SELECT/INSERT on acceptance; migration/fixture identity
is separate. The older protected Place grant release stays pinned to its original
0111 model and prior grant digests; B15 does not extend or revive that approval.
New protected legal-table grants and copy installation require a separately
reviewed release contract. No live permission was changed here.

Alternate-account audit: the public Express/tRPC context uses AuthService;
legacy Manus OAuth registration is not registered by the active entry point.
Agency invitation acceptance consumes an existing authenticated account; it
must not be labelled account consent. Founder Google can bootstrap only the
configured proven founder administrator, and is not customer legal acceptance.
Two administrator-controlled Distribution referrer approval/resend paths still
create identities directly in distributionRouter.ts; they require a deliberate
self-registration/acceptance boundary before admitting that workflow. Existing
controlled accounts also need their agreed next-commitment collection step;
this slice does not backfill or infer acceptance. These are B15 closure gaps,
not evidence that every identity path is covered.

Also remaining: final Terms/Privacy/Cookies and payment copy approval, supplier
telephone applicability review, legal/trading-name reconciliation, processor/transfer
and finance/legal retention review, operational disposal/hold capability,
Agency/Developer setup wording, paid commitment and enquiry notices, specified hosted acceptance. Do not merge
or deploy this slice as a completed launch gate or silently disable the maintained
payment/worker holds. B15 remains OPEN; eight scopes remain accepted.

Actual local SPA browser checks passed at 1440×1000 and 390×844: unchecked
choice, disabled submission before choice and when copy is unavailable, exact
bundle links, complete in-viewport dialog, no horizontal overflow, released
fixture text and neutral unavailable legal state, no page errors. Fixtures were
clearly synthetic; external network requests were blocked. The API origin was
set to the existing approved development origin 127.0.0.1:5000, with browser
API interception; no backend or hosted provider call was made. Initial attempts
failed the existing environment-origin contract until local setup was corrected;
no origin-policy bypass was added. Screenshots and JSON are in the OS evidence
folder evidence/2026-10-12-b15-application-local/; sanitized JSON is copied here.
Other unapproved legal-page routes show an unavailable state rather than
publishing drafting instructions. Final approved Cookies/compliance text is
still required before legal-page completion.

The completed database-free pnpm test:ci run passed 5,194 tests and failed 23
across three files (333 skipped). Twenty failures require admitted Place fixtures
or real query methods; three are 5-second readiness-test timeouts. All 23 were
reproduced on unchanged c475ed724 in clean detached comparison worktrees under
the same SKIP_DB_INIT=1 / empty DATABASE_URL conditions. Those comparison trees
were removed cleanly. This is not a configured isolated-database CI success;
whole-suite-result.json and the two baseline logs retain the result. Do not relabel missing fixtures as consent
regressions, or waive real configured CI before integration. Whole lint reported
zero errors with 13,204 existing/style warnings. Final touched-source lint
reported zero errors and 19 pre-existing any/formatting warnings in auth.ts and
authRoutes.ts; newly added standalone files reported no warnings. Browser checks
also verified the unapproved Cookies route at both viewports. The owned Vite
preview was stopped after verification; no task-owned service remains running.

## October 13 registration and operating continuation

The organisation-registration submission is no longer an outstanding founder
action. Edward then supplied IO_Certificate_2026-069040.pdf. Local inspection
confirms officer Lehlohonolo Banda, registration date 2026-10-13 and reference
2026-069040. The private-company type and CIPC 2026/702814/07 match the accepted
company number. Minimal fields and source SHA-256 are retained in
[evidence](evidence/b15-legal-acceptance-20261012/information-officer-certificate-fields-20261013.json).
The complete certificate is privately preserved in the OS worklog evidence
folder; ID/contact payloads were excluded from Git. No portal/email access or
independent regulator verification was performed. Supplier legal/trading names
need reconciliation because the printed name is PROPERTY LISTIFY t/a DOS
HOLDINGS, while the approved-fact draft says Property Listify (Pty) Ltd. No registration event is installed
as customer legal-copy approval, and no exact-copy candidate is mutated here.

Ongoing privacy/request/security procedures and the applicable PAIA manual
remain launch work. The supplied success message also describes PAIA annual
reporting and a future POPIA Annual Compliance Assessment. B14 should retain
request counts/outcomes, review regulator notices through the normal staffed
checks and record the actual applicable submission window/receipt. Private-body
reporting follows the relevant section 83(4) request; public-body section 32 is
not substituted. Historical 2024/2026 windows and the proposed future assessment
do not establish a new deadline or an immediate new launch gate here. The OS
worklog `2026-10-13 - B15 Information Regulator Registration Completion.md`
records this operating handoff and the remaining evidence fields. B15 remains
OPEN; eight scopes remain accepted; no release or worker hold was changed.
