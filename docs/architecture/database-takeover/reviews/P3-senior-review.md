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

P3 cannot yet be accepted. The packet now has an executable runtime-writer
census guard: the retirement contract passes 5 tests and asserts one
`insert(properties)` call behind the canonical source-linked writer. It still
lacks an explicit rebuild comparison over every mapped supply family. The
nullable/non-unique source link remains an intentional
deferred decision until development, Commercial, and Shared Living mappings
are proven. No schema change is authorized by this review.

The performance authority test now proves repeated canonical-listing rebuild
identity and public-field refresh; this does not cover every supply family.

Finding: incomplete evidence, severity medium. Required follow-up is a
cross-supply physical rebuild-equivalence test that records
row identity, public fields, and withdrawal behavior for each supported supply
family.
