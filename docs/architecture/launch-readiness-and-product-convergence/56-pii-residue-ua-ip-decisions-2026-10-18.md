# PII residue closure: engagement-adjacent UA/IP storage decisions

18 October 2026. Closes the last open question from the packet 52 audit residue:
the three remaining sites that stored user-agent / IP outside the engagement
path. Edward gave a posture decision for each on 18 October 2026. One site is
changed (agent OS analytics); two are kept with recorded rationale. No schema
change, no behavior change beyond the removed insert columns.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `PII-RESIDUE-UA-IP-2026-10-18` (launch-readiness packet 56) |
| Base | `main` at `b798c94ae` (contains packet 55 via PR #648) |
| Worktree / branch | `property-listify-agentos-metadata-20261018` / `fix/agentos-event-metadata-20261018` |
| Governing text | Packet 52 "Residue" table; founder decision in session 18 October 2026 |
| Boundary | One insert payload (analyticsEvents via agentOsEventService) plus a focused test. No table columns dropped; historical rows untouched. |
| Reviewer action | Confirm the insert no longer carries UA/IP, the test asserts key absence for both write paths, and the two "keep" decisions match the recorded rationale. |

## Decisions

### 1. `server/_core/auditLog.ts` — KEEP raw UA/IP (no code change)

Sensitive-action audit trail: impersonation, role changes, deletions, data
exports, subscription changes. Raw IP/UA is standard forensic evidence for
super-admin and agency-admin actions, and audit rows are written only for
sensitive operations, not per request. Retention/correction handling, not
removal, is the privacy control. Rationale recorded here for the privacy
posture pack (B15 input).

### 2. `server/services/agentOsEventService.ts` — STOP storing UA/IP (changed)

Every agent OS analytics event wrote `userAgent` and `ipAddress` into
`analyticsEvents`, matching the posture already applied to engagement metadata
(packet 54). The two insert fields and the now-dead `getIpAddress` helper are
removed; `userId`, `sessionId`, `eventType`, `eventData`, `url` and `referrer`
remain. `RequestLike` keeps its IP-shaped fields because existing callers pass
full request objects and the type is structural.

### 3. `server/services/googlePlacesApiMonitoring.ts` — KEEP `ip_address`
(no code change)

`google_places_api_logs` feeds the Places quota/abuse alert thresholds
(userId + sessionToken + IP). Raw IP supports abuse forensics and the table is
an operational monitoring surface, not an analytics corpus. Rationale recorded
for the privacy posture pack (B15 input).

## Regression protection

`server/services/__tests__/agentOsEventService.test.ts`: both write paths
(direct userId, explicit session id) assert the captured insert payload has no
`userAgent`/`ipAddress` keys and that neither the raw UA string nor the raw IP
appears anywhere in the serialized row; explicit session ids pass through and
the null-db path skips the insert.

## Validation

- `pnpm exec vitest run --no-cache --config vitest.server.config.ts server/services/__tests__/agentOsEventService.test.ts` → 2/2 pass.
- Agent/analytics contract suites (7 files) → 130 pass, 2 pre-existing skips.
- `pnpm exec eslint` on both touched files → clean.
- `pnpm run typecheck` → 290 pre-existing errors, 0 in touched files.
- No code reads `analyticsEvents.userAgent` / `.ipAddress` (grep clean), so
  removal breaks no consumer.

## Register effect

None. Hardening close-out; the two keep decisions are inputs for the privacy
posture pack, not launch-register changes.
