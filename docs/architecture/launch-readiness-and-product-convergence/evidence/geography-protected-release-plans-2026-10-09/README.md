# PR #595 source integration and fresh geography release plans

Edward explicitly accepted **fcf17987b2ce3b2eefded0e3a7e729c041785e5a** for source integration. PR #595 was marked ready and merged through GitHub's normal protected merge, with an exact-head guard and no administrator bypass, at **2026-10-09 14:12:01 UTC**.

| Source identity | Recorded value |
| --- | --- |
| Final main merge | `49a48572c24d1b122fcf17b025a76e5ab77f03a8` |
| Accepted candidate and merge tree | `f0db8b4f4b964346f28282f9616d0e59d3e673e0` |
| Merge parents | B12 main `1ead53cd5857fc84b846d3d5e4f420f77f824936`; accepted candidate `fcf17987b2ce3b2eefded0e3a7e729c041785e5a` |
| Existing hosted CI | [37932882443](https://github.com/Doscoding187/real_estate_portal/actions/runs/37932882443), attempt 1, all five jobs successful for accepted candidate |

The complete tree matches byte for byte. No unchanged performance work, local test suite, typecheck or build was repeated. See [source integration](source-integration.json) and the accepted [senior reconciliation and release packet](../pr595-reconciliation-release-review-2026-10-09/README.md). The prior local performance evidence still applies to the identical measured search code; it does not establish production launch capacity.

## Fresh protected read-only results

Classification: protected release preparation, **inspect → plan → senior review**. Edward's current instruction authorizes dedicated-inspector read-only planning; it does not authorize schema/data application, grant changes, deployment or payment activation.

Target: registered **Azure MySQL production**, fingerprint **b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced**. Inspection at **2026-10-09 14:21:08.469 UTC** verified MySQL `8.4.9-azure`, the dedicated inspector identity and exactly USAGE + SELECT grants. All 97 released filename/checksum entries match the merged manifest through `0096_user_founder_authority_unique.sql`. There are no incomplete attempts, no seven Place/Search Area tables, no three canonical consumer columns, and 23 existing CHECK constraints, all enforced.

The three named repository commands executed from an exact Git archive of merged source **49a48572**, using the established Railway SSH transport and an in-memory inspector credential. The installed dependency lock matched the merged source. Temporary source files were removed; deployed files and service variables were untouched. Runtime artifact identity remains separately recorded as `68f2c679eb423dd0da8cb2b5115a85d4620a10aa`, deployment `93b7b423-91ac-4855-b8a7-e8fb53a0f112`; using that container as transport did not deploy the planning source. No private listing/customer records were queried.

The initial source bundle lacked an import-only script dependency. It stopped before opening a database connection and was removed. The complete merged-source script set was then included; inspection and both planning commands succeeded. This is preserved in [source preparation failure](source-preparation-failure.json), [successful provenance](read-only-provenance.json), [source archive inventory](source-archive-inventory.json) and [transport source](read-only-transport.source.txt).

| Fresh evidence | Result |
| --- | --- |
| [Protected inspection](protected-inspect.json) | Verified target/identity/grants, complete released history, no incomplete attempts; connection closed |
| [Schema plan](protected-schema-plan.json) | 15 single-statement DDL migrations, 0097–0111; no lock acquired or migration applied |
| [Reference-data plan](protected-reference-plan.json) | Governed national subset verified; `readyForDataRelease=false`, `planDigest=null`, `pendingRows=null`; connection closed |
| [Plan reconciliation](plan-reconciliation.json) | Released prefix, manifest, pins, desired/held counts and digests match canonical/accepted evidence |
| [Hosting holds](hosting-holds-readback.json) | No production Railway repository triggers; accepted Vercel `main` Git deployment remains disabled; no settings changed |

## Schema proposal for senior review

Fresh schema plan ID: **d8dfd9120ee8499e4da0c19f**.

Fresh schema digest: **d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d**.

Manifest digest: **600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c**.

The schema digest equals the October 8 comparison because the canonical transitions and observed target state remain identical. This packet contains a new named-runner plan from merged source and a new live inspection, rather than reusing the historical output.

The [ordered migration inventory](migration-inventory.md) includes exact filenames, checksums and SQL from merge 49a48572. The sequence creates seven authority tables, then adds canonical references, indexes and foreign keys to saved searches, listings and properties. It preserves the 97 released prefix entries and contains no geography backfill or invented legacy mapping.

Before application, senior review and Edward's separate approval must bind this source, exact target, old/new heads and schema digest. The attended release window must also identify the operator/incident owner, verified preservation evidence, writer containment, execution budget and a recovery artifact compatible with schema 0111. Those operational prerequisites and an execution window have not been supplied or approved by this packet. A changed target/head/attempt/source/manifest requires fresh reconciliation; do not force the old plan to fit.

## Reference-data proposal and current gate

Policy: **admitted-national-non-osm-only-v1**. All nine package pins are preserved in the fresh reference plan.

| Authority assertions | Desired | Held |
| --- | ---: | ---: |
| Places | 16,944 | 720 |
| Names | 25,618 | 807 |
| Relationships | 16,935 | 720 |
| Evidence | 79,189 | 736 |
| External mappings | 19,042 | 750 |

Desired digest: `3c8f2e80908b8d6d7d565e83f7c1cafe6b10fea7a53fc757ec01650b02be2728`.

Held digest: `d9fa78e371be33ada65362b3b1ce8b848fb4212a9518e4bc06da4f18ff5dc5e2`.

Adapter digest: `d8d2725fd93a6c4d2de9fb95b59c07e4dbe826f53f8faaf449b3e579ade9943a`.

The 720 OSM-only Places and their dependants remain excluded under the existing D3 gate. The reference plan cannot supply an applicable digest before physical schema 0111 exists. Senior review can assess its desired rows/pins/holds now; this result cannot authorize reference application. After a separately approved schema application and verification, generate the applicable plan and return its exact digest/pending rows for separate review and approval. Never substitute the broader disposable national fixture.

## Concrete continuation, with separate approval boundaries

1. **Schema:** review this fresh plan and operational prerequisites; after explicit schema approval, use the named release runner once with its reviewed digest and ephemeral distinct same-target migration credential. Verify head 0111, no pending/incomplete attempts, congruency, indexes/foreign keys and 39 enforced CHECK constraints. Failed or ambiguous DDL stops with preserved attempt evidence; no silent retry or destructive rollback.
2. **Reference data:** run `pnpm db:release:reference:plan -- --adapter=places` against verified schema 0111. Return the applicable source/target/digest and observed/pending assertions for separate approval. Only after approval, apply through the named Place adapter, preserve confirmed commit/cleanup outcomes, and verify zero pending assertions and unchanged exclusions. Its existing transaction limits remain 250 rows, 4,096 parameters and 262,144 estimated bytes per statement. Verify the application/worker identities have the canonical required access to new objects; a privilege defect requires its own reviewed named grant process, without improvised broad grants. No commercial reference-data application is included.
3. **Compatible deployment:** after separate approval, deploy exact merged source **49a48572** in order API → matching workers → matching manual frontend. Keep all automatic deployment/payment holds. Strict congruency means the old artifact may become unready during schema expansion; the approved window requires maintenance/write containment and a compatible recovery artifact. Read back current hosting identities at execution; do not deploy moving main. Require terminal provider success and fresh layered readiness, including B12 assessment/source/deployment/replica/target correlation and its existing 30-second freshness gate. Run established actual-release checks once and the affected consumer smoke checks.
4. **North Riding customer outcome:** after successful approved release, select canonical North Riding `pl-place-01-6a145c6d642ba208a2c12de7`; save the private server house draft and reload; upload the three prepared images through the normal confirmed-upload flow; save ordering/primary image/details; reload again and prove persisted contents/associations/order/property facts. Browser-local save is insufficient, and the three-image private test is not publication approval. Continue affected Developer checks while preserving IKaya's existing organisation and pending-review status. Use the genuine customer entry point for eligible public-property discovery, correct locality/card, detail and durable enquiry; keep the private test absent from public search. The accepted [customer continuation](../pr595-reconciliation-release-review-2026-10-09/customer-continuation.md) provides the existing custody and workflow boundaries. Do not reopen founder login, logout or Developer registration without regression evidence.

No schema/reference application, deployment, grant change, customer mutation or payment activation occurred. Next decision: senior review of these plans, followed by Edward's separately scoped release approval. The merged code alone has not resolved the live draft/image blocker.

Canonical authorities used: repository `AGENTS.md`, registered database-authority skill, Database Authority Agent Entry Contract, operating playbook, operation policy, database-authority policy/compatibility register, migration manifest/runner, Drizzle models, Place adapter/inspection and accepted release packet. Planning was isolated on branch `docs/geography-protected-release-plans-20261009` in the task-owned worktree. [SHA256SUMS](SHA256SUMS) covers this packet; no credentials or complete credential-bearing URLs are included.
