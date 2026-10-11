# PR #599: server draft restoration and preview build correction

Date: 11 October 2026. Correction owner and reviewer: senior Codex through Edward.

Decision: the previous source's passing CI did not cover the reported P1 restoration case. This packet supersedes the restoration acceptance boundary of the [earlier senior review](../private-draft-senior-review-2026-10-11/README.md). Historical evidence is preserved. Accept the correction for publication to the existing PR and normal hosted CI; merge and production release remain held until the revised source is verified.

## Source and correction

The starting PR head is `48b4d6511e194b2655f0cf8d6795f1cb96387a20`; integration and production base remain `c927351b2a0db4972b8cbc244102c795e2588d3c`. The correction uses the existing clean senior worktree and branch `fix/private-draft-request-isolation-senior-20261011`. The final SHA and tree are recorded after commit in the private candidate receipt and senior management record.

The [P1 review](https://github.com/Doscoding187/real_estate_portal/pull/599#discussion_r4241070122) was valid. The wizard verified a stored account draft ID, then activated it without hydrating its content outside edit mode. Missing or stale device fields could subsequently replace the server draft.

A full authenticated server read now carries its draft ID and current account/route generation into hydration. Both explicit edit routes and stored pointers restore content, location, pricing and confirmed media before the ID becomes active and save/submit become available. A refused read exposes the access error and permits no save. A sparse new-create acknowledgement cannot hydrate or reset the newly entered form. Existing owner, route, pending-operation and upload guards remain in place.

Two new missing/stale-device regressions failed on the starting implementation. Both now prove restoration, confirmed image references, the same ID on update, no duplicate create, no review submission, and a second reload/save after device form data is discarded. Refused reads are covered for both stored pointers and edit routes. These are UI tests with mocked APIs, not a production persistence certificate.

## Preview diagnosis and bounded configuration correction

The failed deployment was `dpl_96cj7UZvL94hmaV816RChCq1patz`. Retrieved provider build events show an eight-millisecond build failure followed by `ENOENT` from `closeBundle()` writing `/vercel/path0/dist/public/version.json`. The hook attempted output even after build validation failed, obscuring the primary failure.

Fresh provider configuration inspection found no preview `VITE_DEPLOY_ENV`; the inherited development/preview API input pointed at the production API. The existing build guard requires an explicit preview environment and staging API. Static diagnosis and the build regression confirm why this configuration fails; the original provider log did not retain the underlying guard message.

Version metadata and staging crawler files now use `generateBundle()` asset emission. They follow the actual configured output directory, exist after successful builds, and cannot mask an earlier build failure. Production/staging origin checks, explicit environment selection and source identity requirements are retained.

Only two public settings were created for this exact PR branch on project `prj_Xf9Sfzemo9c0Bfq6cgzRb5PGHTtN`, team `team_wGNClVbXptfEtznBC5p1YfO2`, target `preview`:

| Setting | Value | Created ID |
| --- | --- | --- |
| `VITE_DEPLOY_ENV` | `preview` | `65osO6DAVdgUGbfN` |
| `VITE_API_URL` | `https://api-staging.propertylistifysa.co.za` | `JhjMJMrhPV9wAlGy` |

The provider creation response reports both created and no failures; fresh branch-filtered readback verifies both values and bindings. Production/shared settings were not edited. Removing these two branch-specific IDs restores the previous preview configuration if recovery is necessary. No preview failure exception or environment-check bypass is granted.

## Validation and evidence boundaries

- The two P1 regressions failed before correction; the failure log is retained.
- Final wizard suite: 20 passing cases, including stored-pointer refusal and the prior first-create, navigation, account and uncertain-response regressions.
- Related upload, payload mapper, owner and canonical-location cases remain covered in the affected five-file client run.
- Nine real minimal Vite builds prove successful preview/production metadata emission, actual output-directory behavior, preservation of hosted guards, and no version file on validation or compilation failure.
- Supported application typecheck passes. Explicit compilation of the touched tests and Vite configuration passes; its first run identified one missing required fixture `displayOrder`, which was corrected without loosening types.
- Client/test lint reports zero errors and 33 existing wizard warnings. The root Vite configuration is outside the repository ESLint file patterns, so it is separately linted using the existing Node/script rules through stdin.
- A complete local frontend build passes using preview settings. Its sample metadata intentionally uses the starting PR SHA; this is build validation of the working source, not a deployable artifact for the revised commit.
- No database schema/query/fixture changes were made. Unchanged local database suites were not repeated; the prior database and HTTP proof has its original boundary.

Private evidence: `/home/edwardspc/.local/state/property-listify/private-draft-restoration-599-20261011/`. It contains command logs, provider responses, final validation results, source/evidence hashes and the committed candidate receipt. Credentials and private provider configuration are not committed or printed.

## Release boundary and next action

Push the single reviewed correction to PR #599. Required hosted CI and the branch preview must validate its new SHA; the previous green run does not cover it. Resolve the P1 conversation with the correction and regression evidence after publication. The senior retains final merge and release responsibility.

Production private save, confirmed image persistence and fresh authenticated reload remain required after separately accepted deployment. Public traffic, workers, automatic production deployments and payments remain held. No migration, permission replay, runner provisioning, production deployment or reopening occurred here. Runner service deletion remains a separate dashboard two-factor task under its existing custody record.
