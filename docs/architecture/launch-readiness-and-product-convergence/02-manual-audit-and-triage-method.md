# Manual Audit and Triage Method

| Field | Authority |
| --- | --- |
| Status | **Accepted method; operational use begins when a canonical candidate exists** |
| Verified current state | No canonical candidate currently exists. |
| Not yet implemented | Exact-SHA local acceptance workflow and production verification sequence. |

## Audit method

Edward audits pages as parts of complete user journeys, rather than as isolated screenshots. Each supported journey is reviewed on desktop and mobile. Once candidate authority exists, every finding must record the exact candidate SHA before observations begin.

Each finding records its URL or journey, user role, viewport/device, expected result, actual result, and evidence reference. Evidence may be a reproducible test note, screenshot, video, console/network capture, or other durable sanitized record.

### Evidence contract for material findings

The [Evidence Sequence and Provenance Contract](06-evidence-sequence-and-provenance-contract.md) applies to every material technical finding. Use the [authority claim record](07-authority-evidence-record-templates.md#authority-claim-record) and [audit finding record](07-authority-evidence-record-templates.md#audit-finding-record), or an equivalent structured record, to make all five fields explicit and traceable:

1. Claim/Finding.
2. Mechanism.
3. Sequence.
4. Evidence.
5. Boundary.

Surrounding prose may satisfy a field only when the field remains explicit, identifiable, and traceable to the same finding. A genuinely non-sequential claim records `Sequence: Not applicable` and explains why. A material finding missing any field must not enter the [central launch register](03-launch-register.md), receive a launch decision, or authorize implementation.

## Severity

| Level | Meaning |
| --- | --- |
| **L0 — launch blocker** | Safety, data integrity, security, legal/trust, or core journey failure that prevents launch approval. |
| **L1 — launch critical** | Material journey, conversion, or operability defect that needs an explicit correction before approval. |
| **L2 — launch acceptable** | Real quality issue that may be accepted only with a recorded launch decision and owner. |
| **L3 — future enhancement** | Valuable improvement outside the bounded launch requirement. |

## Permitted launch decisions

- Fix now.
- Simplify for launch.
- Hide for launch.
- Honest placeholder.
- Manual operational fallback.
- Defer.

Every issue is assigned to an owning engine or platform authority. No issue enters implementation until ChatGPT has approved a bounded implementation slice. Isolated-worktree success is insufficient: completion requires integrated verification and, where the issue reaches release scope, later production verification.

## Reusable finding template

```text
Issue ID:
Date observed:
Candidate SHA: (required once candidate authority exists)
Page or journey:
URL:
User role:
Viewport or device:
Claim/Finding:
Mechanism:
Sequence: (or `Not applicable` with reason)
Expected result:
Actual result:
Evidence: (source identity, sanitized reference, and freshness where material)
Boundary: (what this evidence does not prove or authorize)
Impact:
Severity: L0 | L1 | L2 | L3
Owning engine or platform authority:
Decision/status:
Required correction:
Validation method:
Approved bounded implementation slice:
Integrated verification:
Production verification:
Notes:
```
