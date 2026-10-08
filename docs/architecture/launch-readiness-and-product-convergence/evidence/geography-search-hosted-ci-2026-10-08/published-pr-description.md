This geography integration introduces canonical Place authoring and its governed reference/release capability while preserving the accepted founder, logout and Developer corrections. The reviewed CI correction fixes stale residential fixtures, requires the admitted Gauteng identities explicitly, and runs the 18 mocked Place-command tests in their own database-free project. Missing geography cannot silently skip dependent tests or be replaced with invented legacy handles.

Published candidate: **0760bbf412eb7b0773949ca069160b0ddcfaa86e**. This includes canonical Place public search plus the bounded senior-review corrections. Required hosted [CI Pipeline 37763446694](https://github.com/Doscoding187/real_estate_portal/actions/runs/37763446694) passed on attempt 1 for this exact source. All five jobs passed. The tested PR merge commit `895b649fd06aa2b5e5097c55220026139bf34c54` and candidate have the identical tree `9839a1d085edd6fcdc4786125cba54e4c29fd4ef`; base `7756376c9ec604b352595b4e4ba8ced73f18562b` is unchanged, so no integration changes require reconciliation. Both automatic Frontend Build Guard runs also passed. The separate Vercel preview deployment remains failed, and the PR remains draft.

The preceding candidate 499cab892902ba1bd4fd6ff7524b8e0e042d17d5 passed [CI Pipeline 37755969972](https://github.com/Doscoding187/real_estate_portal/actions/runs/37755969972) on its first attempt. Those results do not cover this revised source. The separate Vercel preview exception is unchanged.

The governed protected release remains 16,944 Places with 720 OSM-only Places and their dependants excluded. All 97 released migration entries and source pins are preserved; the additive candidate head remains 0111. The disposable Gauteng CI fixture is independent of that protected release.

Public Buy/Rent search carries canonical Place selection through URL, API, scope filtering, saved-search evaluation and card labels. Local HTTP/browser evidence proves North Riding publication, exact search, Bryanston exclusion, the North Riding/Gauteng label and property detail. Province containment and exact city membership have separate coverage.

The review correction rejects invalid raw Place identities and competing geography before notification criteria normalization, preventing a saved location search from widening or falling back. It also restores account/sign-in and advertising links on the canonical results header.

Correction validation: 12 mocked server tests, 25 client tests, production typecheck, touched-file lint (zero errors), and build passed. Built-app Chromium checks proved signed-in/signed-out navigation at 375px and 1280px using intercepted API fixtures. No database was initialized for this correction.

[Search correction evidence](docs/architecture/launch-readiness-and-product-convergence/evidence/geography-search-review-corrections-2026-10-08/README.md) and [local search outcome evidence](docs/architecture/launch-readiness-and-product-convergence/evidence/geography-public-search-and-hosted-ci-2026-10-08/README.md) record the separate proof boundaries.

Review/evidence:

- [Integration review](docs/architecture/geography-integration-review-2026-10-08.md)
- [Reviewed CI correction and local validation](docs/architecture/launch-readiness-and-product-convergence/evidence/geography-ci-senior-2026-10-08/README.md)
- [Initial integration packet](docs/architecture/launch-readiness-and-product-convergence/evidence/geography-integration-2026-10-08/README.md)
- [Release-path correction packet](docs/architecture/launch-readiness-and-product-convergence/evidence/geography-integration-corrections-2026-10-08/README.md)
- [Command-boundary packet](docs/architecture/launch-readiness-and-product-convergence/evidence/geography-place-command-boundary-2026-10-08/README.md)
- [Target-specific release plan](docs/database-authority/canonical-place-reference-release-2026-10-08.md)

Merge, deployment, protected schema/reference application, payment activation and national launch acceptance remain held. National-dataset search performance still requires measurement before production acceptance. Homepage legacy selection and other domain-specific geography migrations are not certified by this results-page change.
