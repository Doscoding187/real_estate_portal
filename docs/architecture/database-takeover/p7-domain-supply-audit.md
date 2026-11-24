# P7 domain supply and geography audit

The governed Land boundary is explicit: a public request has exactly one
geography authority (typed city/province, one canonical location, same-level
sibling locations, or one authorised Search Area). The Land public and
authoring routers validate `LAND_PUBLIC_CLASSIFICATIONS`; public services
also apply the allow-list at query time. Mixed geography and authoring-only
classifications fail closed in the focused suites.

The authority-run development publication lifecycle currently passes 21
physical tests. It covers owner-scoped publication, review transitions,
Launch Access expiry, public withdrawal, external availability updates,
ownership isolation, concurrent review decisions, and atomic rejection of
invalid auction terms. Unit availability updates lock both the development and
active unit-type rows before validating and writing the counters.

Focused Land and geography suites pass 47 tests across the public service,
projection, router, Search Area authority, and geography contract surfaces.

The Commercial office contract suite now passes 20 tests, including ordered
availability provenance and strict UTC microsecond timestamp normalization.
The authority-run Shared Living integration passes 6 tests covering private
owner and practitioner authoring, current mandate and membership checks,
moderation publication, private-address protection, durable enquiry inbox
delivery, retry idempotency, and scoped replies.
This packet is not closed. A complete P7 acceptance still needs independent
physical evidence for mixed-authority Land requests against the running public
journey and a broader Commercial economics proof. The current evidence
supports retaining the existing canonical geography and domain tables while
those tests are added.

The focused Land run was repeated on the current branch:
`pnpm vitest run server/__tests__/landPublicRouter.test.ts
server/__tests__/landSearchGeography.test.ts server/__tests__/landRouter.test.ts`
passed 24 tests. These are boundary and geography contract tests; they do not
substitute for the still-required running public-journey mixed-authority
exercise.

Those same three suites were rerun through the authority wrapper after the
empty-target rebuild and passed all 24 tests on the disposable schema.

## Shared Living MVP candidate evidence, 2026-11-24

The Shared Living MVP candidate now has a separate database-backed provider to
seeker journey in
`server/services/__tests__/sharedLivingJourney.integration.test.ts`. It ran
through the authority test wrapper against the verified task-owned disposable
database and passed one end-to-end API/database test. The journey covers a
reviewed residence mandate, independent student spaces and prices, ownership
isolation, typed photo upload/review, separate parent/space approval, public
search/detail privacy, canonical lead capture and inbox delivery, and mandate
revocation with historical lead retention.

The run also found and corrected a lead inbox predicate mismatch: canonical
lead custody uses `primary_custody`, while the Shared Living inbox query had
looked for the retired `primary` purpose. This candidate evidence is limited
to the isolated database and the Shared Living path. It does not verify a
shared or production database and does not close P7. Independent P7 evidence
for mixed-authority Land public journeys, broader Commercial economics, and
the remaining domain-supply coverage is still required.

The final full authority-suite result on this candidate was 862 passed, 13
skipped, and 37 failed across 13 files. Failures include the reviewed 0197
grant/rehearsal source bindings rejecting the 0210 candidate, legal-consent
fixtures and existing disposable-database authority rows. These are recorded
as verification blockers; no production/shared grant, rehearsal, database, or
P7 authority was changed to make the suite pass.

## Provider decision, 2026-09-11

The current TiDB audit is intentionally admission-blocked for 12
foreign-key/CHECK interactions. The recommended decision is to retain the
strong relational constraints for the canonical MySQL launch authority and
require a reviewed TiDB DDL-action/provenance record before any TiDB release
plan can be admitted. No constraint is weakened and no alternate schema is
introduced to make the audit green. The open provider item is deployment
evidence, not a runtime fallback requirement.
