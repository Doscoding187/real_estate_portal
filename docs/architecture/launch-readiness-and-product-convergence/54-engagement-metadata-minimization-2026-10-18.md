# Engagement metadata minimization

18 October 2026. Records Edward's decision on the personal-data flag raised in
[packet 52](52-pii-log-minimization-2026-10-18.md) and implements it:
engagement writes no longer persist `userAgent` or `ipAddress` into
`exploreEngagements.metadata`, and the anonymous guest-session fallback is
keyed by a keyed hash instead of a raw network/agent composite. No schema
change: `metadata` is an existing JSON column and the session key remains a
string. B08–B18, LRC-SUPPORT-001 and the paid-opening NO-GO are unchanged.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `ENGAGEMENT-METADATA-MINIMIZATION-2026-10-18` (launch-readiness packet 54) |
| Base | `main` at `7706e93bc` (contains packet 52 via PR #645) |
| Worktree / branch | `property-listify-engagement-metadata-20261018` / `fix/engagement-metadata-minimization-20261018` |
| Governing text | Packet 52 "Flagged, not changed" section; founder decision recorded in session 18 October 2026 |
| Boundary | Server engagement write path only. No schema, migration, retention or product behavior change beyond the session-key representation. |
| Reviewer action | Confirm the two insert paths carry no `userAgent`/`ipAddress`, re-run the focused suites, and check the session-key format and stability assertions. |

## Recorded decision

Packet 52 flagged that `server/services/exploreInteractionService.ts:90-98`
persisted `userAgent` and `ipAddress` into `exploreEngagements.metadata` for
authenticated and anonymous public `discovery.engage` calls, and left it as a
founder/product retention decision. Edward decided on 18 October 2026:

**Stop storing `userAgent` and `ipAddress` in engagement metadata** (the
"stop storing" option, chosen over "keep" and "coarsen").

## What changed

| File | Change |
| --- | --- |
| `server/services/exploreInteractionService.ts` | Removed `userAgent`/`ipAddress` from `RecordInteractionOptions`; both insert paths (`recordInteraction`, `recordBatchInteractions`) no longer write them into `metadata`. The remaining metadata (`duration`, `feedType`, `feedContext`, `deviceType` plus caller metadata) is unchanged. |
| `server/domains/discovery/services/discoveryEngagementService.ts` | The `recordInteraction` call no longer passes `userAgent`/`ipAddress`; the request header/ip read for that purpose is removed. The anonymous guest-session fallback (`buildSessionId`) is now `guest-<32-hex>` where the 32 hex chars are the first 32 of `HMAC-SHA256(JWT_SECRET, "<ip>|<ua>")` over the same sanitized parts, preserving dedup grouping without storing the raw values. The explicit `x-session-id` path is unchanged. |
| `server/domains/discovery/services/__tests__/discoveryEngagementService.test.ts` | Fallback test now asserts the hashed format, stability across identical calls, and that neither the raw IP fragments nor the agent string appear in the session key. |
| `server/__tests__/piiLogMinimization.test.ts` | The engagement test constructs the interaction without the removed fields and additionally asserts the persisted `metadata` contains no `userAgent`/`ipAddress` keys. |

## Behavior notes

- **Dedup preserved**: identical sanitized `(ip, ua)` inputs produce the same
  hashed key, so `CONCAT('session:', sessionId)` unique-viewer counting keeps
  its meaning. `getSessionInteractionHistory` remains stable for repeat visits.
- **Corpus discontinuity**: rows written before this change carry legacy
  `guest-<ip parts>-<ua parts>` session ids. After deploy, the same anonymous
  visitor receives the hashed id, so unique-viewer counts can briefly
  double-count one visitor across the change. Pre-launch with a small corpus;
  recorded, not corrected retroactively.
- **Key rotation**: rotating `JWT_SECRET` splits anonymous sessions (new key
  family). Acceptable for a dedup heuristic; the explicit session-id path is
  unaffected.
- **Hash choice**: HMAC (not bare SHA-256) so the stored key is not a plain
  dictionary target for the small IPv4/UA space. The key never leaves the
  database and is not logged (packet 52 removed the only engagement log that
  carried user/session identifiers).

## Evidence and audit references

- Packet 52 findings: `server/services/exploreInteractionService.ts:90-98`
  (metadata persistence), `server/__tests__/piiLogMinimization.test.ts`
  (behavioral guard).
- The only live engagement writer is `discoveryEngagementService.handle`; the
  legacy `explore.recordInteraction` router procedure is retired and throws.
  `recordBatchInteractions` has no live caller; it was cleaned for
  consistency.

## Residue (deliberately out of scope)

| Site | State |
| --- | --- |
| `server/_core/auditLog.ts:28-29` | Audit log stores UA/IP — security/audit infrastructure with its own review, not part of this decision |
| `server/services/agentOsEventService.ts:94-95` | Agent OS events store UA/IP — separate subsystem, no decision taken |
| `server/services/googlePlacesApiMonitoring.ts:133` | Monitoring insert carries `ipAddress` — separate subsystem |
| `server/_core/mockData.ts:139-140` | Fixture fields only |

## Local validation

- Focused suites: 4 files, 19 tests passed
  (`discoveryEngagementService`, `piiLogMinimization`,
  `exploreInteractionService.contract`, `explore-legacy-capability-boundary`).
- ESLint on the four touched files: 0 errors; no warning on a changed line.
- `pnpm run typecheck`: 290 pre-existing errors, identical to base; zero
  reference a touched file.
- No schema or migration change; no runtime configuration change.

## Register effect

None. Product hardening; no launch-register row changes.
