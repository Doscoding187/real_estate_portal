# Developer registration fields — bounded correction review

The normal Production Developer form displayed and submitted five completed, five current and five upcoming projects, then returned success. A normal profile read omitted every count. Company identity and specialisations persisted with pending review. The sanitised reproduction records the same frozen source and request IDs; the live profile is preserved.

## Canonical disposition

Developer registration authority is Developer Organisation → active Membership → coherent first-party Catalogue Publisher. See [B06 authority table](b06-developer-paid-mvp-closure-packet.md#d-canonical-developer-model), [canonical organisation model](../../../../drizzle/schema/developerIdentity.ts) and [canonical identity service](../../../../server/services/developerIdentityService.ts). Neither the organisation model nor its creation/resubmission contract includes the three self-reported counts. Their presence in the historical developers table is not a compatibility requirement under database-authority policy. The older journey map mentions completed portfolio as development inventory or a future subdomain; it is not an approved registration-storage contract.

The narrow correction therefore stops collecting these unsupported values during organisation registration. This does not remove development inventory, introduce new portfolio storage or claim that the previously submitted numbers were saved. Senior review must assess this disposition before hosted CI.

## Resulting behaviour

- The active setup wizard, defaults, owned-draft hydration, review and request payload collect only supported company/contact details and specialisations. Step three is Development Expertise.
- Resuming an older owned browser draft explicitly says its project counts will not be submitted; the next owned autosave contains only supported fields. Account isolation remains intact.
- createProfile rejects unknown keys, including each count and the combined 5/5/5 payload, before any creation or resubmission. Stale cached clients receive an error instead of false success.
- Normal pending/approved locks, rejected-organisation resubmission, role checks, subscription-foundation creation and canonical profile read remain unchanged. The existing browser acceptance heading is updated, without changing its approval or publication gates.

The old unmounted DeveloperSetupWizard.tsx is not routed or imported; its unsupported payload is rejected by the same API boundary. This correction does not reactivate it.

## Verification and limits

22 focused tests pass: the actual mounted React wizard submits supported values without count controls, resumes and autosaves an older account-owned draft with a notice, and remounts on the pending profile; the real protected API/parser retains canonical service arguments and reloads the same mocked persisted identity. Tests reject individual and combined counts before writes and preserve anonymous/customer-role denial and pending/approved/rejected transitions. Database persistence is mocked in these focused checks; no physical database save/reload or complete joined browser journey is claimed.

Type checking, touched-file lint, application build, all 449 database-authority tests, utility classification, schema sanity, deterministic inventory and lifecycle checks pass. The lint logs retain existing warnings and four explicit-any warnings in new tests; no lint errors. The build retains its existing large-chunk advisory.

The disposable worktree target resolves through Database Authority and remains unreachable with the local service stopped. No migration, schema, query, seed, fixture write, grant, remote database operation, live profile repair, production request, email, configuration change or deployment occurs in preparing this candidate. Mocked tests use SKIP_DB_INIT=1.

## Next gates and remaining customer evidence

Return this exact local candidate for senior review **before hosted CI**, as instructed. The branch is not pushed, so no hosted workflow or preview deployment is triggered. Following technical review, required hosted checks and explicit replacement-source acceptance must precede any attended release. Production stays on 3fb981cb0e08f45ff5c9a826f7ddba2ed87afd99.

Only dependent Developer checks are held by this correction. Preserve the verified founder/login/logout evidence. The unresolved estate locality is separate; no fallback location or production fixture was created. Three permitted Pexels JPGs have been downloaded and visually checked in the private operator evidence directory, with source/photographer/licence/date and content hashes. They are illustrative, not actual property photography; no upload or publication occurred. Once a real private draft can proceed, label it TEST — illustrative stock images and use normal confirmed upload, save, refresh and reopen verification.

Payment intake remains closed, admission/deadline absent, automatic deployments held and Production TiDB writers stopped. Unrelated Testing and staged configuration remain preserved. Paid, proof-owner, publishing/enquiry and operating gates remain separate.

## Evidence

The adjacent developer-registration-canonical-fields-20261007 directory includes sanitised reproduction, validation, logs and SHA256SUMS. Its checksum manifest authenticates the packet and all evidence artifacts; it intentionally does not contain its own digest.
