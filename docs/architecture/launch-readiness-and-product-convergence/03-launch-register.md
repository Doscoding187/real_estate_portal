# Central Launch Register

| Field | Authority |
| --- | --- |
| Status | **Established by Stage 1; no findings are recorded in this initial register** |
| Scope | Central launch disposition and verification register. It is not an implementation backlog. |
| Candidate status | No canonical candidate exists yet; SHA fields remain mandatory once one exists. |

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

## Register entries

| Issue ID | Date observed | Exact Git SHA | Page or journey | Role / viewport | Severity | Owning engine | Launch decision | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| _No findings recorded_ | — | — | — | — | — | — | — | — |

Add the full required fields for each real finding; do not invent findings to populate this table.
