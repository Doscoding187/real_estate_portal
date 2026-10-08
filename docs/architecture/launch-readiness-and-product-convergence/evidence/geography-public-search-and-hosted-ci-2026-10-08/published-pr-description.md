This geography integration introduces canonical Place authoring and its governed reference/release capability while preserving the accepted founder, logout and Developer corrections. The reviewed CI correction fixes stale residential fixtures, requires the admitted Gauteng identities explicitly, and runs the 18 mocked Place-command tests in their own database-free project. Missing geography cannot silently skip dependent tests or be replaced with invented legacy handles.

Published candidate: **499cab892902ba1bd4fd6ff7524b8e0e042d17d5**. Integration base remains **7756376c9ec604b352595b4e4ba8ced73f18562b**. Hosted checkout **d2581f356bfd83b724c147d540f6bb7cab3aa9a0** merges those two commits and has the identical candidate tree **6805082360ddbd4df338b90dde674e25116fbfa1**. A fresh fetch confirmed no integration drift.

Hosted validation passed on **attempt 1**, with no manual dispatch or rerun:

- [CI Pipeline run 37755969972](https://github.com/Doscoding187/real_estate_portal/actions/runs/37755969972): database contracts, location authority, lint/typecheck, unit/integration tests and application build all succeeded. The test step passed 18 Place-command tests, 2,002 client tests and 3,082 server tests; 66 server tests remain explicitly skipped.
- [Frontend Build Guard run 37755969978](https://github.com/Doscoding187/real_estate_portal/actions/runs/37755969978): succeeded.

The separate automatic Vercel preview status still reports failure. Preview acceptance is not claimed; no deployment repair, production application or payment activation was performed.

The governed protected release remains 16,944 Places with 720 OSM-only Places and their dependants excluded. All 97 released migration entries and source pins are preserved; the additive candidate head remains 0111. The disposable Gauteng CI fixture is independent of that protected release.

Public-search continuation is prepared locally in **b3fad5cfb1dde7c514425b56f199565da72c2507** on `fix/geography-ci-senior-20261008`; it has not been pushed into this reviewed candidate. It carries canonical Place selection through URL/API/filter/card labels and proves the North Riding publication → exact search → unrelated-locality exclusion → property-detail browser journey. Province containment and exact city membership have separate coverage. Hosted results above do **not** apply to that later source commit. Keeping it local preserves the requested single hosted run and the review boundary.

Review/evidence:

- [Integration review](docs/architecture/geography-integration-review-2026-10-08.md)
- [Reviewed CI correction and local validation](docs/architecture/launch-readiness-and-product-convergence/evidence/geography-ci-senior-2026-10-08/README.md)
- [Initial integration packet](docs/architecture/launch-readiness-and-product-convergence/evidence/geography-integration-2026-10-08/README.md)
- [Release-path correction packet](docs/architecture/launch-readiness-and-product-convergence/evidence/geography-integration-corrections-2026-10-08/README.md)
- [Command-boundary packet](docs/architecture/launch-readiness-and-product-convergence/evidence/geography-place-command-boundary-2026-10-08/README.md)
- [Target-specific release plan](docs/database-authority/canonical-place-reference-release-2026-10-08.md)

This review accepts the CI repair. Merge, deployment, protected schema/reference application, payment activation and national launch acceptance remain separate decisions. The new search continuation requires its own review and hosted validation before its results can be attributed to a PR candidate.
