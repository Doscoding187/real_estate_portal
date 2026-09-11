# P3 senior review

Status: incomplete evidence; partial controls accepted for continued work.

Reviewed current projection authority and the physical evidence recorded in
`p3-listing-projection-audit.md`.

The review confirms that `listings` is the authored source and `properties` is
the public projection. Public eligibility fails closed when the source link is
missing, duplicated, withdrawn, or inconsistent. The active projection writer
rejects duplicate source mirrors rather than selecting one, and the retired
direct property writers have no active callers. The authority-run lifecycle
suite passed 25 physical tests covering publication, withdrawal, attribution,
and revision identity preservation.

P3 cannot yet be accepted. The packet still lacks an exhaustive duplicate
projection writer census and an explicit rebuild comparison over every mapped
supply family. The nullable/non-unique source link remains an intentional
deferred decision until development, Commercial, and Shared Living mappings
are proven. No schema change is authorized by this review.

Finding: incomplete evidence, severity medium. Required follow-up is a
writer-by-writer trace and a physical rebuild-equivalence test that records
row identity, public fields, and withdrawal behavior for each supported supply
family.
