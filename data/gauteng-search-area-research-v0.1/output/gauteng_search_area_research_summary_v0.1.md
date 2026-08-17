# Gauteng property Search Area research v0.1

Research date: 2026-08-15.

This is a research authority projection. It does not create production Search Areas, database records, routes, polygons, or search configuration.

## Decision

YES — the evidence is strong enough for a bounded Gauteng Search Area v0.1 candidate-definition workstream, provided launch is restricted to the launch-critical candidates below and unresolved factual gaps remain blocked.

## Recommended MVP candidate set

Launch-critical: **Johannesburg North**, **Johannesburg South**, **East Rand**, **Pretoria East**, **Midrand**, **Centurion**.

Useful post-launch: West Rand, Greater Sandton, Fourways, Pretoria Old East, Pretoria Moot, Pretoria North, Vaal.

Research further: Johannesburg East, Johannesburg West, Pretoria Far East, Pretoria North East. Avoid as Search Areas for this cycle: Pretoria West, Pretoria Central; direct factual intent is more useful than a broad market grouping on current evidence.

## Candidate findings

| Candidate | Evidence | Core / strongly supported resolved members | Priority | Recommendation |
|---|---:|---:|---|---|
| Johannesburg North | strong / 5 independent | 12 | launch-critical | Carry the bounded consensus core into candidate definition; do not copy any portal's full northern list. |
| Johannesburg South | strong / 6 independent | 12 | launch-critical | Launch with the consensus southern suburb core and explicitly permit Alberton overlap. |
| East Rand | strong / 3 independent | 9 | launch-critical | Carry the six-town consensus core and a cautious supported ring into candidate definition. |
| Pretoria East | very_strong / 8 independent | 11 | launch-critical | Launch with a consensus/core and strongly supported membership set; hold outer-east gaps for controlled follow-up. |
| Midrand | strong / 3 independent | 9 | launch-critical | Carry as a launch-critical Search Area with explicit same-name disambiguation and factual-gap blocking. |
| Centurion | strong / 2 independent | 9 | launch-critical | Carry as launch-critical, with explicit type disambiguation and no new factual parent geography. |
| West Rand | strong_but_scope_conflicted / 5 independent | 4 | useful-post-launch | Defer until the product decides whether its value exceeds direct town search and how to govern Johannesburg West overlap. |
| Greater Sandton | strong / 3 independent | 5 | useful-post-launch | Keep as a post-launch candidate; do not add to launch until overlap and SEO/query-result policy is settled. |
| Fourways | strong / 3 independent | 4 | useful-post-launch | Defer as a separate Search Area until launch query volume justifies a narrower overlapping market. |
| Pretoria Old East | strong / 4 independent | 5 | useful-post-launch | Useful post-launch as a governed narrower overlap, not a separate factual geography. |
| Pretoria Moot | moderate_to_strong / 3 independent | 6 | useful-post-launch | Useful post-launch after northern Pretoria membership review. |
| Pretoria North | moderate / 2 independent | 5 | useful-post-launch | Useful post-launch once the northern Pretoria result UX and membership boundary are defined. |
| Vaal | strong_but_scope_conflicted / 3 independent | 5 | useful-post-launch | Useful post-launch with a Gauteng-only membership policy and explicit cross-province limitation. |
| Johannesburg East | conflicted / 3 independent | 0 | research-further | Do not launch. Ask one bounded founder decision only if product demand later justifies choosing a meaning. |
| Johannesburg West | moderate_but_overlapping / 5 independent | 2 | research-further | Research further; do not launch separately from West Rand. |
| Pretoria Far East | moderate / 3 independent | 0 | research-further | Research further after candidate-catalogue follow-up. |
| Pretoria North East | weak_to_moderate / 2 independent | 0 | research-further | Avoid launch; retain only as research evidence. |

The detailed membership authority is in `gauteng_search_area_membership_evidence_v0.1.jsonl`; this report intentionally does not enumerate every suburb.

## Counts

- Search Area candidates: 19 (6 launch-critical).
- Membership assertions: 188; resolved: 156.
- Resolved core: 69; strongly supported: 29; supported: 48; disputed: 9; fringe: 1; unresolved: 31; excluded: 1.
- Overlap: 24 factual canonical locations have membership in more than one candidate, representing 50 assertions. Overlap is retained rather than forced into one market.
- Factual-geography gap candidates: 23. None are promoted by this workstream.

## Authority rules

- Factual canonical IDs are read-only references to checkpoint `bd39aa38e4f7158164f3572b62db827fbf01c1a7`; a same-name Search Area receives its own `sa-gp-v01-*` identity.
- Core means multiple independent market sources converge on the location. Strongly supported means consistent evidence exists but the term is narrower, less independent, or overlaps a neighbouring market. Supported and fringe assertions are retained for review, not automatically launched.
- Missing factual names are emitted as `factual_geography_gap_candidate` records. Kyalami remains blocked by the factual evidence/licensing gate; it is not absorbed into Midrand or any other Search Area.
- Portal and agency taxonomies are observations only. No source IDs, proprietary taxonomy, or source hierarchy is reused as Property Listify authority.
- A market term and an identically named factual location may both be valid results. Candidate IDs and canonical IDs are intentionally different namespaces.

## Main findings

Johannesburg North is a useful market concept but collides with the factual suburb of the same name. The market should be a separate identity with a consensus core around northern Johannesburg, Randburg/Sandton/Fourways-related suburbs; Greater Sandton and Fourways are useful narrower overlaps, not reasons to copy a portal hierarchy.

Johannesburg East is not launch-safe: Lightstone uses a narrow inner-east basket while other property sources use the label for an East Rand-wide basket. The conflict is substantive, not a fringe-boundary disagreement.

Pretoria East has the strongest Pretoria supra-suburb evidence. Old East is a recognisable narrower overlap; Pretoria Moot and Pretoria North are useful separate post-launch concepts. Broad portal lists that mix Pretoria East with North/West areas are preserved as conflicting evidence and not adopted wholesale.

East Rand is a strong cross-town property-market term. Alberton is intentionally allowed to overlap with Johannesburg South; the evidence does not support a forced exclusive boundary.

Midrand and Centurion operate both as factual identities and as consumer-facing multi-suburb property markets. They need type-aware disambiguation, not aliasing one identity into the other.

## Sources and limitations

The source manifest contains 62 current or recent observations across portals, established agencies, market analytics, property publications, and official/administrative context. Access date is recorded per source.

Limitations: property portals expose changing listing inventories and editorial groupings rather than licensed reusable market authorities; agency pages may be promotional or SEO-oriented; membership evidence is a market interpretation, not statutory geography; exact boundaries require later product governance; province-crossing Vaal usage requires a later scope decision.

## Founder review

The bounded review CSV contains only decisions that cannot be settled safely by evidence alone: whether to carry overlapping/narrower concepts at launch, how to treat the ambiguous Johannesburg East label, and whether Vaal should launch as a Gauteng-scoped Search Area despite a cross-province market concept.
