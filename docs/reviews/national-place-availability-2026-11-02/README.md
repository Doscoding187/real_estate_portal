# National Place availability — 2026-11-02
**Basis:** GitHub `main` at `0b7ae664e3d0`; package versions named by its national registry. No production database read.
**Columns:** all Places / active listing-search eligible / public-page eligible (flag + verified + active).
Gauteng 1,465/1,433/68; Western Cape 1,862/1,102/418; KwaZulu-Natal 2,090/1,570/276.
Eastern Cape 5,084/4,634/290; Free State 1,544/1,297/105; Mpumalanga 1,045/795/52.
Limpopo 1,669/1,493/71; North West 1,352/1,162/60; Northern Cape 1,552/1,321/686.
**National totals:** 17,663 / 14,807 / 2,026; 2,856 not search-eligible; 12,781 searchable without a public page.
**Search exclusions:** 2,556 facility/spot sources without area evidence; 300 municipalities kept as context; other: 0.
**Public-page blockers overlap:** provisional promotion 12,159; provisional type 11,270; medium/moderate identity confidence 10,816/1,087.
**OSM:** 720 OSM-only Places are search-eligible under policy v2; public-page eligible: 0. This report does not decide legal characterization or claim a production release.
**Meaning:** these are package facts, not current production availability; the listing form queries the database.
The 16,944 count in older records is a historical protected subset, not a current production count.
**Files:** [row-level CSV](./national-place-availability.csv); [province counts, blockers, and source hashes](./summary.json).
**Method:** follow the registry package paths, preserve each Place ID, and report the coded search/page reasons. No Place IDs or eligibility flags were changed.
