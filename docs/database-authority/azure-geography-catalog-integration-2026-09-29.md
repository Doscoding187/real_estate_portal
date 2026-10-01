# Azure release: canonical geography catalog integration

Date: 2026-09-29. Principal direction: use the existing canonical geography
programme so new coverage remains connected to the application/database.

## Release integration

Source `4356c0f7` was integrated as `e01d6e16` on
`docs/retained-azure84-upgrade-packet`, after readiness commit `9b9aa86b`.
This is a review candidate, not a production deployment or database apply.
The full geography foundation is integrated as one coherent change: registry,
aggregate catalog, factual bridge, runtime resolution, reference adapter,
contracts and CI. No unrelated B08/B10 work is included.

Both application resolution and Database Authority now consume the same
registered territory catalog. The checked-in Gauteng projection/mapping bytes
are unchanged. The catalog contains 1,414 runtime rows, 1,480 factual entries
and 14 explicitly governed co-published natural keys. Catalog index SHA-256:
`ad32a26dbaa40d03f63545d5f9af0918cbea2e1d65c8166817b15c52e5d6f8c4`.

No schema or migration files changed. Head remains 0094. Existing factual IDs
and natural-key hierarchy remain stable; numeric database IDs remain local
handles. Search Areas remain a separate authority. Ambiguous co-publication
requires the selected factual member, not a guessed first match.

## Growth contract

A new approved territory joins by registering immutable digest-verified source
artifacts. The aggregate catalog and adapter consume it without introducing a
new provider-specific geography loader. Database provisioning must preserve
existing IDs and relationships, insert reviewed missing natural keys, and
reject conflicting or ambiguous identities before writes. Renames, reparenting,
retirements and identity changes require explicit reconciliation; they must not
be hidden as additive coverage.

Static foundation arrays remain explicitly transitional under the geography
contract. Do not expand them manually. A later generated foundation source
replaces them through the same authority rather than starting another dataset.

The earlier uncommitted empty-target-only release draft was preserved outside
Git and withdrawn before integration. It is not active or approved for apply.
The protected geography release extension still needs implementation and tests
against this integrated catalog, including repeat application and additive
coverage preservation. Generic local reference seeding remains prohibited on
Azure; no geography rows were written during this work.

## Source limitation

The two original Gauteng input JSONLs remain missing, as recorded in
`data/geography-coverage-v0.1/source-recovery.v0.1.json`. Existing frozen
projection and mapping integrity can be proved; full regeneration cannot.
Do not reconstruct those inputs from projections or silently replace their
expected digests. Current projection use and future source regeneration are
separate admission questions. No new territory was activated here.

## Evidence

- Catalog integrity: PASS.
- Checked-in geography probes: 1,705/1,705 PASS.
- Focused location authority contracts: 5 files, 44 tests PASS.
- Database Authority static suite: 44 files, 392 tests PASS.
- Typecheck: completed with no diagnostics. Production build: PASS (existing large-chunk warnings).
- Touched-source ESLint: zero errors, 19 warnings (including ignored config and existing style warnings).
- Full regeneration: expected refusal, exit 1, because the exact source inputs are absent.
- Synthetic second-territory catalog test: PASS; no actual territory added.
- Negative tests cover digest mismatch, duplicate source roots/factual IDs,
  namespace mismatch, malformed metadata and exact co-publication membership.
- Lint found missing Node globals in the integrated source-status utility;
  fixed with explicit `node:process` / `node:console` imports.

Physical Azure geography provisioning and browser journeys remain unproven;
static tests are not presented as database-backed acceptance. No database,
credential, firewall, engine, production URL or deployment change occurred.
