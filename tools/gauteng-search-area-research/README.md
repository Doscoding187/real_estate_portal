# Gauteng Search Area Research v0.1

This is a standalone research projection for Property Listify's Gauteng
property-market geography. It is not production Search configuration and it
does not create database records.

The builder consumes the accepted factual-geography JSONL projection from the
completed worktree and a reviewable research seed containing source
observations. The dated supplement adds current-source observations, the
expanded candidate memberships, the 20-query intent review, and read-only
links to retained factual candidates. It writes candidate Search Areas,
membership evidence, source provenance, geography-gap candidates, a bounded
founder review CSV, a machine-readable intent review, and a concise summary.

Run from the repository root:

```text
python3 tools/gauteng-search-area-research/run_search_area_research.py \
  --canonical-geography /home/edwardspc/Desktop/Dev/listify-gauteng-factual-canonical-v0-1/data/gauteng-factual-canonical-v0.1/output/gauteng_factual_canonical_geography_v0.1.jsonl
```

The seed is an observation log, not a copied portal taxonomy. Portal and
agency pages are cited as market evidence only. Property Listify-owned IDs are
derived deterministically from names and namespaces and never reuse source
IDs.

The output is deliberately membership-based: an unresolved market term is
retained as evidence or a geography-gap candidate and is never promoted to a
factual canonical location by this tool.

Focused tests:

```text
python3 -m unittest discover \
  -s tools/gauteng-search-area-research/tests -p 'test_*.py' -v
```
