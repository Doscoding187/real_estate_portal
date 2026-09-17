# Senior review corrections — 2026-09-17

Status: corrections implemented; frozen-candidate verification pending. This
record does not authorize integration, protected release, or commercial launch.

## Scope and authority

Edward authorized implementation of the two findings from the senior review of
`07aab6a4234a7a7e1321f49eed485ab94df76a5d`, with evidence-only head
`3c9b61757516bf0d6fe369d9ecfe5e54ddc34ead`. The correction branch is
`fix/mvp-senior-review-closure`, in `/tmp/property-listify-mvp-senior-review`.
The consolidated integration base remains PR 577,
`4e012b3044628fc06da7489c0055e9ce01bdc8d9`.

This is database consumer work. Canonical sources are the Database Authority
entry contract, operating playbook, manifest, operation policy, database policy,
exception register, and the existing membership/listing models. No schema,
migration, compatibility exception, commercial release flag, or Land policy is
changed.

## Corrections

1. Private agency listing custody now requires an approved agent profile and
   the one current canonical membership in the listing's materialized agency.
   Original authorship and retained profile affiliation cannot bypass that
   requirement. The shared check covers private detail, edits, analytics, media
   reservation/confirmation, archive/delete, submission, promotion, and listing
   leads (including requests by public property ID), and the property-delete
   alias that archives its source listing. The author's listing list
   applies its permitted agency scope before pagination. Independent private
   drafts, exact agency administrators, and super-admin access remain supported.
2. Public media synchronization catches only `LandLaunchContainmentError` as a
   policy exclusion. Database lookup errors propagate, so revision approval
   rolls back instead of committing without synchronized media.

Regression coverage includes suspended/left membership with retained approved
profiles, deactivated visitor identity, replacement-assignee access, original
author denial after reassignment, independent draft visibility, manager access,
stale profile affiliation, previously issued upload tokens, and operational
lookup failure during revision approval. Successful-member unit mocks now
declare canonical membership instead of relying on profile affiliation.

## Disposable verification target

- Target: `listify_wt_mvp_senior_review_2e98a8664dc2`, `disposable-worktree`.
- Fingerprint: `4f437bfb3c64ad31c6d4232324cc7625e38692d155ba893c3e6d319089b3fb2b`.
- Canonical migration head: `0090_retire_disconnected_boost_campaigns.sql`.
- Manifest digest: `a511e70ae06ffbae4027cf02b1de8cc0f586ff7c23cb7cb11a0990606cf728ed`.
- A fresh target was created through `db:worktree:create`; canonical planning
  and application established the existing manifest from `none` to `0090`.
  Plan digest: `92f9f1bc127ba098fddbd03a79f355165fbbfd31f22170b11ea2a8dd7b36ce9f`.
- Schema congruency passed, including all 23 physical MySQL CHECK constraints.
  Geography, commercial foundation, and reviewer data were prepared through
  their governed local adapters. No protected database was accessed.
- Preliminary focused verification: 5 files / 114 tests passed. Initial runs
  exposed two stale success mocks and a missing required `properties.area` in
  the new fixture; both were corrected before the frozen candidate. Typecheck
  and static authority checks passed during development.

The first complete run on `dc5f2bc0` did not pass: 646 files passed, one older
archive unit mock lacked canonical `ownerId`, and the fresh target lacked the
required Search-to-Lead acceptance scenario (nine dependent tests did not run).
The mock was corrected and the scenario prepared through `db:scenario:prepare`.
The public-property archive alias was also connected to the shared membership
check and covered by the direct revocation regression. These executable changes
require a new frozen candidate and a complete verification run.

The `6b83fcd2` run passed the full suite (648 files / 4,291 tests; 9 files /
67 tests skipped), typecheck, lint (zero errors / 11,460 warnings), build, and
static authority checks. Browser startup then failed before executing tests:
the local browser runtime and agency fixture hard-coded the original branch's
disposable target fingerprint. They now require the authorized browser-wrapper
marker and its exact parent fingerprint, retaining the disposable-worktree
restriction and canonical operation authorization/ownership checks. Missing or
mismatching parent authority fails closed. This harness portability correction
requires another frozen candidate; the failed run is not final acceptance.

## Remaining release gates

The [candidate review packet](mvp-candidate-review-packet.md) retains the full
branch acceptance criteria and hosted gate ownership. Final full-suite,
browser, lint, build, authority, and exact-revision evidence will be recorded
below after the correction commit is frozen. Hosted CI, final consolidated
review, integration, exact-artifact deployment/provider verification, monitored
support, approved disclosures, real email, and commercial activation remain
separate gates. Local fixture entitlements do not prove a paid customer journey.
