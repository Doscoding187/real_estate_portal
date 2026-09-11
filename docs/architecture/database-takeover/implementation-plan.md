# Database takeover implementation and review plan

Status: planning handoff, 2026-09-09. Owner of architectural decisions and final review: the senior reviewing agent. Implementer: the junior agent assigned an individual packet by Edward.

Current execution state: P0 is complete and P1 is accepted after senior
review. The scoped P6 offer-acceptance race is accepted, while P2 remains
review-open, P3 has an incomplete-evidence senior review, P4 has a scoped
senior acceptance, P5 has an incomplete senior review, P7 has an incomplete
senior review, and P8 has an incomplete senior review; broader P6 lifecycle
coverage remains open and P9 is in closure audit. The task-owned disposable target is at
manifest head `0081_explore_analytics_query_index.sql`, with matching
physical/model digest
`3ee40c54f68e8d30f4498743f12ff7429d2a601434d989557fbb1e27f56ce370`.
The relational lead-delivery cutover, consumer changes, seven physical
delivery tests, service-lead request idempotency, and atomic demand routing
are implemented. Current authority verification passes 33 static suites and
272 tests, plus utility, schema sanity, inventory, and lifecycle gates.

P9 currently has fresh-establishment evidence, rebuilt-target P1–P8 packet
runs, and a passing authority-injected Desktop Chrome consumer-activity
journey. Provider admission, packet review, and broader public/private journey
coverage remain open.

Outstanding review work includes independent provider crash/replay,
reconciliation and authorization evidence for P2; completion of the P3–P8
findings (including implementation of the recorded billing-owner decision,
remaining marketing-authority work, and remaining domain-lifecycle decisions);
and the full P9 closure audit. The
starting-point facts below are
intentionally historical and are retained to make the handoff auditable.

## Mandate and working arrangement

Read the original takeover brief:
`/home/edwardspc/.codex/attachments/3cce6e75-d73d-47cb-a770-1afbce73ff0d/pasted-text-1.txt`.

The objective remains a full investigation and correction of the database and all dependent application code. Optimize for correctness, integrity, security, clear ownership, reliable concurrency, maintainability, and demonstrated query performance. Existing documents and green tests are evidence, not proof of sound architecture.

Edward changed this conversation to planning and subsequent review. Creating this plan does not start implementation or launch another agent. The junior implements assigned packets; the senior reviews the actual diff and independently reproduces evidence after implementation. Routine implementation choices belong to the implementer. A newly discovered domain ambiguity must be written down with alternatives and a recommendation; do not silently invent product semantics to finish a packet.

Pre-launch legacy data preservation is not a requirement. Replace bad structures and remove obsolete consumers. Do not build dual reads, schema guessing, migration aliases, or legacy backfills merely to preserve test data. Disposable fixtures can be replaced. Target selection and repository isolation still matter: execute against the exact task-owned database, not another workstream's database. A hosted deployment is a separate, explicitly targeted action.

## Verified starting point and limits

The starting implementation commit is `a14fec15` on `feat/database-architecture-takeover`, in:
`/home/edwardspc/Desktop/Dev/worktrees/property-listify-database-architecture`.

At planning time the worktree was clean. This commit contains:

- Protected desired-state saved-property writes and canonical listing-based recent views.
- Transactional guest transfer with explicit public projection-to-listing resolution.
- Uniqueness migrations 0066–0071.
- Removal of disconnected prospect UI, helpers, router, and unused relations.
- Retirement of `prospect_favorites`, `scheduled_viewings`, and `prospects` through 0074.

Recorded prior execution evidence: 213 canonical tables, 75 active SQL files, matching physical/model digest, fresh establishment through 0074, search-to-lead fixture verification, and 271 static authority tests. These results apply to that commit and target, not to later implementation. The previous lint invocation's terminal exit was not retained in the conversation; rerun it before claiming lint passes.

`assessment.md` is an earlier working notebook with contradictory historical statements. Do not use its old counts, “not admitted,” or “no database changes” statements as current truth. Packet P0 reconciles it. Current metadata, code, and physical evidence take precedence.

The worktree list also contains a delivery-authority release-convergence branch. Its name is not evidence of its contents. P0 must inspect relevant overlapping work read-only before commissioning a competing delivery redesign.

## Execution order

| Packet | Outcome                                                                      | Depends on                                       |
| ------ | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| P0     | Current coverage register and reconciled baseline                            | Starting commit                                  |
| P1     | Physical concurrency proof for implemented consumer activity                 | P0                                               |
| P2     | Relational lead delivery, truthful delivery state, recoverable notifications | P0 and overlap reconciliation                    |
| P3     | Inventory source/projection ownership and lifecycle correction               | P0; coordinate lead references with P2           |
| P4     | Account, organisation, membership, and tenant boundaries                     | P0                                               |
| P5     | Billing and entitlements with verified monetary transitions                  | P4                                               |
| P6     | Agency workflow, deals, distribution, and referrals                          | P3–P5 as relevant                                |
| P7     | Development, geography, Land, Commercial, Shared Living                      | P3–P4 as relevant                                |
| P8     | Explore, media, services, marketplace, demand, analytics                     | Relevant upstream identity and inventory packets |
| P9     | Whole-system validation and final takeover review                            | All packets                                      |

Work one coherent packet at a time. P4–P8 are mandatory coverage areas, not permission to redesign their tables without evidence. Split a packet into named subpackets when one review cannot cover it; record dependencies and retain every original requirement. Each independently deliverable change includes schema, runtime readers/writers, fixtures, and verification. Do not hand off a schema-only cutover with broken consumers.

## P0 — establish current truth

1. Inspect `git worktree list`, status, branch, and HEAD. Read applicable `AGENTS.md`, the database entry/policy/exception documents, and relevant domain contracts. Use the database skill as an operating guide, not as a claim that the current model is correct.
2. Inspect integration and overlapping branches read-only. In particular compare the delivery-authority release-convergence work with this branch. Record which fixes are already incorporated, superseded, or conflicting. Do not copy, revert, or stage another workstream's uncommitted files.
3. Resolve the selected target using `pnpm db:authority:context` and `pnpm db:authority:status`. Record sanitized fingerprint, provider, migration head, model digest, and actual schema state.
4. Reconcile `assessment.md`: mark completed consumer fixes, remove contradictory current-status claims, retain useful unresolved findings, and distinguish historical execution from fresh verification.
5. Create `coverage-register.md` beside this plan. Enumerate EVERY exported physical table/view, active query/service/router, fixture/seed writer, job, and migration execution surface. Start with `drizzle/schema/index.ts` and generated inventory; search imports, raw SQL, dynamic loaders, and scripts. Zero direct imports alone never proves a table is unused.
6. Each table row records: product purpose, fact owner, key/subject, tenant owner, write entrypoints, readers, relationships/cardinality, deletion/retention, transaction boundary, access pattern/index, authorization, decision (keep/change/remove), evidence paths, packet, and review status.
7. Produce `architecture-decisions.md` with a domain relationship diagram and unresolved decisions. Identify credentials/control tables separately from application facts. Reconcile the inventory against the database, not just source regex matches.

Acceptance: every current table has a register entry; every “remove” decision has reachability evidence; every unresolved decision has an owning packet. Missing evidence is explicitly incomplete.

## P1 — close consumer integrity proof

Use the existing implementation; do not recreate retired APIs or tables.

Inspect `server/db.ts`, `server/guestMigrationRouter.ts`, the properties procedures in `server/routers.ts`, `publicPropertyEligibilityService.ts`, and live favorite/view clients.

Add real-database tests using independent connections and controlled barriers:

- Concurrent identical saves leave exactly one authenticated user/property fact.
- Concurrent recent views leave one user/listing row; ordering and timestamps have defined UTC behavior.
- Concurrent guest transfers are idempotent. Inject a later write failure and prove that earlier writes roll back and the client retains transferable data.
- Property and listing IDs intentionally differ; ambiguous or unavailable projections are rejected.
- Removal of a favorite works after inventory becomes unavailable.
- Another user cannot observe or mutate these facts.
- Save/remove race results correspond to committed command ordering; no claim of network-order guarantees.
- Determine whether public withdrawal racing activity insertion can leave an acceptable private fact. Document and test the chosen rule.

Acceptance: database state assertions prove cardinality, isolation, and rollback; mocks alone are insufficient. Review actual UI save/reload and guest-to-account behavior.

## P2 — normalize lead delivery and recovery

### Current evidence and entrypoints

Read in full:

- `server/services/leadDeliveryService.ts`
- `server/services/publicLeadCaptureService.ts`
- `server/services/publisherLeadService.ts`
- `server/services/leadRoutingCorrectionService.ts`
- `server/services/publicLeadCustodyService.ts`
- `server/services/leadRoutingAuditService.ts`
- `server/services/leadRoutingConversionReportService.ts`
- `server/services/developerFunnelService.ts`
- `server/agentRouter.ts`, `server/superAdminPublisherRouter.ts`
- Their tests and the search-to-lead scenario adapter.

Current implementation puts retry history and recipient/custody evidence in `leads.deliveryAttempts`. Lead summaries often depend on the final array element. Claim expiry parses MySQL timestamp text with `new Date(text)`; record creation uses time plus Math.random. Publisher retry sends an email outside the claim transaction and updates a separate brand status. Trace initial delivery as well as retry; do not assume those flows agree.

### Required target semantics

Separate these facts:

1. Lead capture and consent.
2. Current custody/routing decision and routing revision.
3. Delivery obligation to one recipient via one channel.
4. Individual execution attempts against that obligation.
5. Optional awareness notifications, whose success does not define CRM custody.

Use relational delivery and attempt tables. Suggested conceptual names are `lead_deliveries` and `lead_delivery_attempts`; final physical names must be recorded in the packet design.

A delivery has a stable ID, lead FK, routing revision, purpose, channel, explicit recipient identity, destination snapshot, idempotency key, lifecycle state, due time, retry budget, and timestamps. Represent recipients with real typed FKs or a justified existing recipient entity; do not leave an unenforced integer whose meaning changes with a string. Platform manual custody is an explicit valid case. Destination snapshots preserve what was attempted while authorization uses current ownership.

An attempt has an ID, delivery FK, unique attempt number per delivery, state, lease token/generation, claim/expiry/completion times, provider reference, and bounded error information. Completed evidence is immutable; a retry creates a new attempt. Unique obligation keys must distinguish routing revision and purpose so a notification cannot overwrite primary delivery state.

Define state transitions in a table before implementing. Distinguish queued, claimed, accepted/completed, retryable failure, exhausted, unknown provider outcome, and cancelled/superseded as needed. Provider acceptance is not proof of recipient reading or mailbox delivery. Name API acknowledgements accordingly. Lead-level summaries must describe the current primary custody obligation; old recipients or optional notifications cannot overwrite them.

### Implementation steps

1. Complete a consumer map and schema/state-transition design in the packet report. Include deletion behavior, route supersession, provider uncertainty, timezone semantics, and indexes for due work.
2. Add the relational model and one admitted migration lineage. Determine sequence from the current integration manifest; do not reserve 0075 based on this plan.
3. Persist lead, consent, custody, and required delivery intent atomically in the existing capture transaction. Repeated capture keys must return the same durable result; changed payloads conflict.
4. Implement claim using row locking or conditional update with an ownership token. Commit claims before external provider calls. Completion verifies the active attempt/token and routing revision. An expired worker cannot overwrite a newer result.
5. Implement bounded retry scheduling and a runnable, tested worker path. Prove queued work survives process restart; an uncalled helper or fire-and-forget promise is not a worker.
6. Pass a stable obligation idempotency key to providers that support it. For unsupported providers, explicitly handle the crash-after-acceptance uncertainty window; do not claim exactly-once external delivery. Document when automatic retry is allowed versus operations reconciliation.
7. Update every reader and writer listed above, including correction/manual review, agent/developer views, super-admin filters, and reports. Remove final-JSON-element logic.
8. Replace the JSON delivery authority and obsolete summary columns once all consumers use the new model. If a summary remains, define its single writer and atomic relationship to current custody. No permanent dual authority.
9. Replace old fixtures with canonical relational fixtures. Pre-launch data can be discarded under the chosen target plan; a legacy-preserving backfill is not required merely because the column once existed.
10. Document worker startup/shutdown, due-work limits, exhausted/uncertain queues, observable failures, and operational reconciliation. Reuse existing operational infrastructure when sound.

### Required tests

- Two workers race for one obligation: one valid claim and one provider invocation.
- Capture transaction failure: neither orphan intent nor partially committed lead.
- Process termination after capture and before claim: work remains discoverable.
- Termination after claim: expiry permits controlled recovery.
- Provider acceptance followed by process termination: stable provider key or explicit uncertain state; no false exactly-once claim.
- Expired worker completion cannot overwrite a retry or routing correction.
- Retry budget and due time are enforced in storage, including UTC and non-UTC process environments.
- Two recipients/channels do not overwrite each other's results.
- Route correction preserves history and makes only the current custody readable by the new recipient.
- Anonymous/unrelated users cannot claim, retry, reroute, inspect, or acknowledge another party's delivery.
- Provider errors do not become successful acknowledgements.
- Existing agent, agency, platform, developer, rental, Commercial, and Shared Living enquiry flows retain correct ownership.

Acceptance: fresh schema, incremental transition, runtime workflow, independent-connection races, crash recovery, and consumer results all pass. JSON metadata may hold optional provider details; operational relationships and scheduling must be relational.

## P3–P8 — required domain packets

For EACH row below, use the P0 register to produce a specific change list before implementation. Every retained model needs positive justification; every changed model needs migrated consumers; every removed model needs reachability and replacement evidence.

| Packet and schema coverage                                                                            | Decisions and implementation obligations                                                                                                                                                                                                                                                 | Required behavior evidence                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3: listings.ts                                                                                       | Authored listing vs public projection identity, one-to-one mapping where appropriate, publication/revision/archive, rebuildability, price/media ownership. Inspect inventoryLinkResolver and projection writers. Do not enforce non-null source links until all supply types are mapped. | Differing IDs; duplicate projection prevention; concurrent publish; withdrawn source disappears from public surfaces; rebuild produces equivalent public facts.                                      |
| P4: core.ts, agencies.ts, developerIdentity.ts                                                        | User/account lifecycle; credential/session ownership; organisation membership and roles; exact tenant scope. Trace agencyListingScopeCondition and owner/agent fallback predicates; replace stale authority where unjustified.                                                           | Cross-tenant denial; membership revocation; reassignment; concurrent membership edits; no orphan owned records; bounded token lifecycle.                                                             |
| P5: billing.ts and subscription/entitlement consumers                                                 | Identify actual product and subscription authorities. Define money units/currency/precision, invoice/payment identity, webhook idempotency, entitlement start/end/revocation. Do not merge similarly named tables without lifecycle proof.                                               | Duplicate/out-of-order provider events; renewal/cancellation races; exact monetary totals; expired entitlement denies gated publication; no duplicate grants.                                        |
| P6: agencyDeals.ts, distribution.ts, referrals.ts, canvassing.ts, listingPerformance.ts               | Lead/showing/deal relationships, state machines, assignments, commission attribution and ownership. Remove competing workflow tables only after full call-path analysis.                                                                                                                 | Invalid transitions rejected; concurrent assignment/booking; deal/commission consistency; tenant-scoped reports; cancellation and reassignment history.                                              |
| P7: developments.ts, locations.ts, googlePlacesMonitoring.ts, land.ts, commercial.ts, sharedLiving.ts | Development/unit/phase identity and availability; canonical geography vs provider/display metadata; domain-specific marketing links, provenance, evidence, and freshness. Read each applicable domain contract, including land-consumer-journey-contract.md.                             | Mixed Land geography rejected; public classification allow-list; unit availability races; Commercial economics states; Shared Living ownership/moderation; precision and private-address protection. |
| P8: explore.ts, media.ts, marketplace.ts, partners.ts, servicesEngine.ts, demand.ts, analytics.ts     | Content/media ownership; relationship integrity; job and service-request lifecycle; engagement dedupe/abuse; analytic facts vs rebuildable aggregates; indexes and retention.                                                                                                            | Cross-tenant media denial; duplicate event handling; durable service requests; correct aggregate rebuild; bounded feeds/reports with query plans.                                                    |

Deliverables per domain: updated coverage register, decision record, schema/runtime/fixture changes, targeted tests, physical evidence, and review packet. If there is nothing to change, show actual traces, constraints, negative tests, and query evidence supporting “keep.”

## Verification procedure for every implementation packet

Use current command definitions and repository operating documentation. Record command, working directory, HEAD, sanitized target, exit status, test count/skips, and evidence file path. Never infer success from an empty intermediate output or an unpolled process.

1. Run targeted behavioral and integration tests for the packet.
2. Run `pnpm check` and `pnpm lint:check`; capture terminal completion.
3. For schema changes, regenerate inventory with `pnpm schema:inventory:generate`; validate `pnpm schema:inventory:check`, `pnpm schema:sanity`, and `pnpm db:authority:check`.
4. Inspect `pnpm db:migrate:plan`. Apply with the exact observed old head and reviewed new head, using the canonical runner on the task-owned disposable target.
5. Verify `pnpm db:schema:congruency` and the appropriate `pnpm db:readiness -- --purpose=...`.
6. Prove establishment from an empty owned database with `pnpm db:authority:consumer-contract`. Disposal removes the database: recreate it before the fresh contract. Re-resolve the exact acknowledgement; never copy this plan's historical target or acknowledgement.
7. Use independent database connections for concurrency tests. Fresh-schema smoke does not substitute for packet-specific races or failure injection.
8. Capture provider-specific validation for the actual deployment dialect. MySQL acceptance alone does not prove TiDB semantics. Include `pnpm db:schema:tidb-audit` where relevant and record any unverified provider behavior.
9. Check changed user journeys in the running application. Record what was actually exercised and what remains unverified.

Do not suppress failing tests, loosen business assertions to match defective code, or add broad schema fallbacks. Update exact inventory expectations only when the intended model and independent evidence justify the change.

## Junior handoff and senior review

Create `reviews/P<N>-implementation.md` for each packet:

- Base and final commit SHA; branch/worktree; packet scope.
- Problem, concrete before/after behavior, design decisions and unresolved questions.
- All changed writers/readers/jobs/fixtures; removed paths and replacement ownership.
- Migration files, parent/checksums/head, expected data loss, selected target/provider.
- Verification commands with terminal results and artifact paths; skipped/unrun tests.
- Failure/retry/concurrency behavior; known limitations and any plan deviations.
- Coverage-register rows closed and rows still open.

Senior review occurs AFTER implementation, on that exact commit. The reviewer:

1. Reads the diff and relevant unchanged call paths.
2. Re-derives invariants from the product flow, rather than trusting the handoff.
3. Checks SQL/Drizzle/runtime/fixture agreement and migration membership.
4. Reproduces decisive negative, race, and recovery tests independently.
5. Reviews query plans, authorization, timestamps, provider semantics, and API acknowledgements.
6. Reports findings by severity with file/line and a reproduction.
7. Records “accepted,” “changes requested,” or “incomplete evidence.”

The junior fixes findings in a subsequent commit and returns for re-review. Dependent packets proceed from the accepted result. A junior's successful test report is not senior acceptance. The senior does not silently implement the junior's corrections in this planning conversation.

## P9 — completion audit

Publish a final architecture/data-flow diagram, completed coverage register, decision log, and reproducible verification report. Every schema module listed above and any newly discovered module must be accounted for.

Prove: one intended authority per fact; valid cardinalities and foreign keys; explicit tenant ownership; atomic commands; idempotent replay; crash-safe asynchronous work; truthful UI acknowledgements; defined money/time semantics; justified deletion and retention; bounded access patterns; removed dead authorities; accurate fixtures; reproducible fresh establishment and forward migration; deployment-provider semantics; tested public and private product journeys.

Review all packet findings and deferred items. A missing runtime trace, skipped critical test, unresolved domain decision, or unverified provider guarantee keeps the full takeover incomplete. Do not equate a clean schema inventory or a passing narrow consumer suite with the entire objective.

## Copyable first assignment

Read this plan and the original takeover brief. Execute P0 in an isolated task-owned worktree based on the agreed takeover lineage. Produce coverage-register.md, architecture-decisions.md, and an accurate assessment.md. Inspect overlapping delivery work before proposing P2 changes. Do not modify application code or database schema in P0. Return the commit SHA and review packet for senior review. After P0 acceptance, implement P1, then P2, using the acceptance criteria above.
