# Senior review corrections — 2026-09-17

Status: corrections implemented; frozen-candidate local verification passed. This
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
browser, lint, build, authority, and exact-revision evidence is recorded
below for the frozen correction candidate. Hosted CI, final consolidated
review, integration, exact-artifact deployment/provider verification, monitored
support, approved disclosures, real email, and commercial activation remain
separate gates. Local fixture entitlements do not prove a paid customer journey.

## Final frozen-candidate verification

- Tested executable SHA: `d61eb2c37940ecf3ed1946d45400818df65dd7f9`.
- Tested executable tree: `3b1744d5f0eb53a6caca5196899da4290419e294`.
- Complete sequential run: 2026-09-17 04:09:02–04:25:09 UTC; exit 0.
- The runner verified a clean worktree and unchanged HEAD before and after all
  gates. No executable correction occurred during verification.
- Remote `main` refreshed after verification remains the recorded PR-577 base.

All times below are UTC on 2026-09-17; every gate exited 0.

| Gate / command | Start–finish | Result |
| --- | --- | --- |
| `pnpm test:authority` | 04:09:02–04:17:42 | 648 files / 4,291 tests passed; 9 files / 67 tests explicitly skipped. |
| `pnpm check` | 04:17:42–04:17:51 | Passed. |
| `pnpm lint:check` | 04:17:51–04:20:45 | Zero errors; 11,460 retained warnings (original candidate: 11,475). |
| `pnpm build` | 04:20:45–04:21:27 | Passed; existing large-chunk warning retained. |
| `pnpm db:authority:check` | 04:21:27–04:21:58 | 35 files / 295 tests passed; utility authority, schema sanity, and lifecycle passed. |
| `pnpm test:browser:authority -- --config=playwright.prepayment-onboarding.config.ts` | 04:21:58–04:23:25 | Chromium 10/10 passed. |
| `pnpm test:browser:authority -- --config=playwright.ple-agency-operating.config.ts` | 04:23:25–04:25:07 | Chromium 10/10 passed. |
| `pnpm db:authority:status` | 04:25:07–04:25:09 | Exact owned target; manifest-head-ready; no incomplete attempts; schema-congruent; application ready. |

Reference/scenario status is not evaluated by this final status command; the
governed local preparation and full-suite evidence above remain distinct from
hosted provider verification. Both browser suites also passed preliminary
portability smoke runs; those do not substitute for the frozen-candidate run.

### Local evidence integrity

Raw logs and browser artifacts remain local because they may contain private
fixture data or temporary tokens. The stage logs use the prefix
`/tmp/mvp-senior-d61eb2c3-` and these SHA-256 digests:

| Log suffix | SHA-256 |
| --- | --- |
| `verification.log` | `af8c7850f9c0132eebdb7c251a7b590ed1833e4bf73455b60d846e272e1683fb` |
| `full.log` | `58c06b86219f5b59c996d6a0fb1d2258fa1c78fa47130c2b47612fb89be77bd7` |
| `typecheck.log` | `46a37aa38fcae9d7caf79924c5e85b28263712cef9bc282d976671c0e1e6b35d` |
| `lint.log` | `c5118f4e75bfb9c57879b9778e9a47c7d26c5797bbe95bfa2ed17d605837e1a7` |
| `build.log` | `3a16f5105b46611203ee46e5dada6079a22b5f7a9657afcc4139386a2172e54c` |
| `authority.log` | `6dc88a3587a7a90ee38b9556c7137f2a98f99abeebc486635ef67942779f8834` |
| `prepayment.log` | `921ae1b3b696e6ccdd62ae9054f4f90908ddbb296bcff78e53fc58678768803d` |
| `agency.log` | `ab25a924a535842ae412289082ef47fa143adcb985b7e706cdefc4359e842020` |
| `status.log` | `137d1fd60f9e7db4b72654bb244eccd5ad6d94f908f9dbac2af18edfd3c42a3f` |

The evidence-only follow-up changes this record and the review-packet
supersession note only. Its comparison against the tested SHA must contain no
executable, migration, schema, or runtime configuration change.

Senior disposition: the identified code defects and browser-harness portability
issue are corrected and locally verified. Approved to advance to draft PR,
hosted CI, and independent consolidated review, not to merge or launch. Edward
explicitly authorized pushing this branch and opening a draft PR after these
checks passed. No deployment, protected operation, or commercial activation was
performed or authorized by this review.
