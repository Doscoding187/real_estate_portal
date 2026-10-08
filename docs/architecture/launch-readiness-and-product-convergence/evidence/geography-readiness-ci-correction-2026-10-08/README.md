# Listing readiness hosted-CI correction

This candidate continues the existing geography integration branch for draft PR [#594](https://github.com/Doscoding187/real_estate_portal/pull/594), following Edward's instruction to fix and push again. Its parent is `e0164dd41b18de2ef15b322389776fafd67c6408`. The revised exact SHA is the commit containing this packet; resolve it with `git rev-parse HEAD`.

The first hosted Unit & Integration Tests run failed two readiness assertions because the test's supposedly complete location contained only legacy display/provider fields, with neither a canonical Place selection nor a coordinate source. The failure was independently reproduced locally. The fixture now supplies a canonical locality selection, private address, explicit map-coordinate source and confirmed state. Its synthetic Place identifier is a unit-test choice only; it creates no reference-data rows or provider-created suburbs.

Two regressions prove that provider evidence cannot replace the canonical selection and that coordinates without source evidence cannot build a ready payload. The focused readiness file passes all 30 tests. Runtime validation is unchanged; the correction does not weaken house validation, change geography classification/parentage, or introduce a fallback.

Repository type checking passes. Scoped lint reports zero errors and 35 warnings, exactly the same count as the unchanged parent. The complete client suite passes: **2,002 tests across 283 files**. Results and measured local duration are recorded separately in this packet. The client-only workspace has no database bootstrap and uses one worker. No native materialisation or production database operation is performed for this test-only correction.

The three preceding evidence manifests remain valid: 35 original integration files, 40 release-path correction files and 12 command-boundary files. All release commands, canonical Place runtime code, source pins, 97 released migration entries, additive migrations, admitted reference packages, 720 OSM-only exclusions, North Riding's admitted identity and founder/logout/Developer corrections remain byte-identical to the parent. The target-specific release plan remains [unchanged](../../../../database-authority/canonical-place-reference-release-2026-10-08.md).

Historical hosted results are bound to the parent SHA, not this revised candidate. New hosted checks must be bound to the revised exact head, including Build Frontend and the full Unit & Integration Tests job. The earlier test loop stopped at the failed readiness file; its later client files and full server suite were not exercised in that run.

The separate automatic Vercel preview failed while `closeBundle` attempted to write a missing `dist/public/version.json`; its initial build failure is not established by that terminal error. This correction does not change preview configuration or the strict hosted frontend environment contract, retry or promote a deployment, or claim preview acceptance.

Push and hosted CI are authorised for this correction. Merge, deployment, production schema/reference-data application and payment activation remain held pending separate acceptance. This candidate does not certify national public Listing search or a hosted browser journey.

`SHA256SUMS` covers every packet file except itself.
