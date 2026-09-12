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

## Provider decision, 2026-09-11

The current TiDB audit is intentionally admission-blocked for 12
foreign-key/CHECK interactions. The recommended decision is to retain the
strong relational constraints for the canonical MySQL launch authority and
require a reviewed TiDB DDL-action/provenance record before any TiDB release
plan can be admitted. No constraint is weakened and no alternate schema is
introduced to make the audit green. The open provider item is deployment
evidence, not a runtime fallback requirement.
