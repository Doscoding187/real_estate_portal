# Central Launch Register

| Field | Authority |
| --- | --- |
| Status | **Established by Stage 1; no findings are recorded in this initial register** |
| Scope | Central launch disposition and verification register. It is not an implementation backlog. |
| Candidate status | No canonical candidate exists yet; SHA fields remain mandatory once one exists. |
| Evidence method | [Evidence Sequence and Provenance Contract](06-evidence-sequence-and-provenance-contract.md) governs material technical claims and their boundaries; this register remains the sole launch-disposition authority. |

## Stable issue identifiers

Use `LRC-<SURFACE>-<NUMBER>`, where `<SURFACE>` is a stable short surface or journey code and `<NUMBER>` is a zero-padded sequence within that surface. Example form only: `LRC-SEARCH-001`.

Do not reuse identifiers. A corrected finding retains its original ID and gains updated evidence/status fields.

## Required fields

| Field | Required record |
| --- | --- |
| Issue ID | Stable `LRC-<SURFACE>-<NUMBER>` identifier |
| Date observed | ISO date |
| Exact Git SHA | Candidate SHA once candidate authority exists |
| Page or journey | Journey name |
| URL | Exact observed URL where applicable |
| User role | Anonymous, buyer, agent, administrator, or applicable role |
| Viewport or device | Desktop/mobile device and viewport |
| Current behaviour | Observed behaviour |
| Expected behaviour | Approved launch expectation |
| Evidence reference | Sanitized screenshot, video, test note, or other durable reference |
| Severity | L0, L1, L2, or L3 |
| Owning engine | Product engine or platform authority |
| Launch decision | Fix now, simplify, hide, honest placeholder, manual operational fallback, or defer |
| Approved implementation branch/worktree | Blank until an approved bounded slice exists |
| Pull request or commit | Blank until implementation evidence exists |
| Integrated verification | Candidate-level result and SHA |
| Production verification | Post-deploy result and deployed SHA |
| Status | Open, authorised, in progress, integrated verified, production verified, deferred, or closed |
| Notes | Decision rationale, dependencies, and expiry/removal condition where relevant |

## Compact register index

This index is for navigation and programme oversight. Its **Full record** column must link to the matching complete record in this document once a real finding exists; the expected anchor form is `#lrc-search-001`.

| Issue ID | Date observed | Page or journey | Severity | Owning engine | Launch decision | Status | Full record |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _No findings recorded_ | — | — | — | — | — | — | — |

## Complete per-finding record

The compact index does not replace the complete issue record. Add one complete record under a heading using the stable issue ID when a genuine finding is first registered.

### LRC-<SURFACE>-<NUMBER>

| Field | Record |
| --- | --- |
| Issue ID |  |
| Date observed |  |
| Exact Git SHA |  |
| Page or journey |  |
| URL |  |
| User role |  |
| Viewport or device |  |
| Current behaviour |  |
| Expected behaviour |  |
| Evidence reference |  |
| Severity |  |
| Owning engine |  |
| Launch decision |  |
| Approved implementation branch or worktree |  |
| Pull request or commit |  |
| Integrated verification |  |
| Production verification |  |
| Status |  |
| Notes |  |

## Register integrity rules

- Every compact-index row must link to one complete record in this document.
- A finding is not registered until all fields applicable to its current lifecycle stage are present. Fields that are not yet applicable must remain explicitly blank or be marked `Pending`; they must not be omitted.
- Evidence references must be sanitized and durable.
- Status changes must update both the compact index and the complete issue record.
- No real finding may exist only in informal chat, an engine backlog, or an isolated implementation branch.
- Engine-backlog linkage does not replace the central finding record or its launch disposition.
- A material technical assertion referenced by a finding must use the [authority claim record](07-authority-evidence-record-templates.md#authority-claim-record) or an equivalent record that preserves its mechanism, sequence, evidence, and boundary.
- Do not invent a finding merely to demonstrate this structure.
