# National geography review queue — 2026-11-02
**Basis:** GitHub `main` at `0b7ae664e3d0748bfab2b571c9488b4abf174eb2`; package evidence only, no production database read.
**National rows:** the existing [row-level report](./national-place-availability.csv) has 15,637 Places needing a disposition; 2,026 pass the package public-page gate and are outside that queue.
**Action rules:** [national action map](./national-action-map.csv) assigns every queue row to one of four groups; blocker counts overlap inside each row but action groups do not.
**Action-group counts:** 12,061 qualify for public-page review; 720 need OSM policy reconciliation; 2,556 need independent area evidence; 300 remain municipality context.
**Gauteng review set:** [founder sheet](./gauteng-founder-review.csv) has 84 rows: 68 package gate-pass candidates, 15 existing founder/user-raised Places, and one Kyalami candidate-only record.
**Priority areas:** [area sheet](./gauteng-search-area-review.csv) covers eight area names and nine existing-ID candidates because Midrand has two records; membership fields are left for founder editing.
**Kyalami:** the source-authority candidate exists but is not an admitted Place; its evidence misses the independent-identity threshold, so this sheet assigns no Place ID.
**Other mismatches:** Centurion is still preferred as Lyttelton; Midrand has two IDs; Ekurhuleni is context-only for search.
**Search Area rule:** membership is a separate post-Places decision. The sheets do not infer members from parent relationships or write to `search_area_member`.
**OSM rule mismatch:** the founder accepts OSM with attribution, while current package page flags and geography-contract text disagree; no flags or policy files were changed.
**Recorded source systems** come from existing package evidence links; they are not a fresh verification or proof that sources agree.
**Founder fields:** check the map, enter approve/hold and approval date. OSM attribution is included where recorded; no Google Maps data or source links are included.
**Limits:** no Place IDs were created, no eligibility flags changed, no production state was checked, and no page is declared founder-approved by this review.
