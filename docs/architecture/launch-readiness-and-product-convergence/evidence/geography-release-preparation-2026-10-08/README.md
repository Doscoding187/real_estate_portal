# Geography release preparation — 8 October 2026

**Decision recommendation: hold production release pending a focused search-performance correction.** Release preparation and the national diagnostic are complete. No production schema/reference application, deployment, customer draft/image/organisation write or payment activation was performed. The live draft-and-image blocker remains unresolved.

## Exact source and proof boundary

This packet evaluates merged source **04821fe7ae6401e781925adce099a93ead08490a**, tree **9839a1d085edd6fcdc4786125cba54e4c29fd4ef**, identical to the accepted PR #594 candidate **0760bbf412eb7b0773949ca069160b0ddcfaa86e**. The merged-source CI Pipeline run **37768993494**, attempt 1, and Frontend Build Guard run **37768993546** passed. No unchanged local suite or hosted CI was rerun for this preparation. [CI record](merged-source-ci.json), [source and release identity](release-identity.json).

These results bind that exact source, not an advancing branch. A revised performance candidate or another integration change needs source reconciliation and fresh target-specific release plans before its evidence can be used for release approval.

## National search diagnostic

The task-owned disposable database contains the governed protected subset: **16,944 Places**, 25,618 names, 16,935 relationships, 79,189 evidence rows and 19,042 mappings. The **720 OSM-only Places and their dependants remain excluded**. The diagnostic uses 120 published synthetic listings, created through the normal create/review/publication lifecycle with completed media, across all nine provinces: 72 Buy and 48 Rent. It uses admitted exact Johannesburg membership; the earlier disposable Gauteng fixture's held Soweto identity was not substituted into this release. The physical query environment also includes archived setup rows: 333 listing and 333 property rows in total, including 205 archived synthetic sources and 204 archived synthetic projections. Final reference verification and postflight passed; the entire owned database was disposed and the shared service preserved.

All **220 HTTP calls** completed without unexpected errors. Correctness checks passed North Riding inclusion, Bryanston exclusion, canonical card label and successful detail opening, exact city membership, evidenced province containment, Buy/Rent, pagination, empty results and mixed-authority rejection. This is local API outcome evidence; it does not prove the live browser entry, image upload or enquiry journey.

| Concurrent requests | Read p95 | Read p99 | Connection acquisition p95 | Comparison |
|---|---:|---:|---:|---|
| 1 | 703.04 ms | 828.45 ms | 12.51 ms | Pass |
| 5 | 2,545.79 ms | 2,893.74 ms | 179.31 ms | Read latency fails |
| 20 | 10,355.47 ms | 10,449.13 ms | 1,134.44 ms | Read and acquisition fail |

The agreed [B17 read limits](../../24-paid-mvp-launch-closure-execution-plan.md) are p95 ≤750 ms, p99 ≤2,000 ms, acquisition p95 ≤250 ms, no exhaustion and unexpected errors <0.1%. The proposed 200 ms geography-discovery target is not treated as an agreed gate. No limit was waived.

This is a closed-loop local diagnostic with 54 successful read observations per concurrency window, on MySQL 8.0.46 and a four-core Ryzen workstation. It is not the separate B17 10,000-listing, 24-hour/peak-load production-capacity acceptance. Engine/OS caches were not reset after fixture preparation. Process RSS reached approximately 1.99 GB; that is not a production capacity conclusion. Graph reads, inventory/coherence work and connection queueing all contribute under concurrency; the evidence does not establish one exclusive cause. [Summary](performance-summary.json), [full measurement and disposal evidence](../national-place-search-measurement-2026-10-08/).

The next engineering work should remain bounded to the measured search cost and preserve canonical identity, scope policy, mixed-input rejection and licensing exclusions. No geography redesign or runtime optimisation was added to this preparation.

## Fresh protected plans

Target: registered Azure MySQL production fingerprint **b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced**. The dedicated SELECT-only inspection at **2026-10-08 14:11:12.785 UTC** observed MySQL 8.4.9-azure, the 97 released migration entries through `0096_user_founder_authority_unique.sql`, no incomplete attempts, no canonical Place/Search Area tables or consumer columns, and 23 enforced CHECKs. Connections closed after read-only planning; the temporary reviewed-source directory was removed. [Inspection](protected-inspect.json), [read-only provenance](read-only-provenance.json).

- **Schema:** 15 additive migrations `0097–0111`, preserving the released prefix. Expected head `0111_properties_canonical_place_reference_fk.sql`. Fresh plan digest **d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d**. [Plan](protected-schema-plan.json), [migration inventory and checksums](migration-inventory.md).
- **Reference data:** policy `admitted-national-non-osm-only-v1`, desired digest **3c8f2e80908b8d6d7d565e83f7c1cafe6b10fea7a53fc757ec01650b02be2728**, immutable nine-province source pins and the protected exclusions. **The current reference plan is not applicable:** `readyForDataRelease=false`, `planDigest=null`, because the schema remains at 0096. A fresh applicable data plan can only be produced after separately approved schema application and physical verification. [Reference plan](protected-reference-plan.json).
- **Hosting:** API/email/lead deployments were observed pinned to prior source `7756376c9`; no staged source was present. The Vercel `main` automatic deployment hold remains unchanged; the previous preview failure remains unresolved. [Hosting observations](hosting-holds.json).

[The concrete release sequence](release-sequence.md) defines attended schema application and verification, fresh applicable Place-data planning and separate approval, bounded transactional reference application, then matching API/workers/manual frontend deployment and the established actual-release checks once. It identifies exact acknowledgements, stop/recovery boundaries and artifact recording. These are proposed operations for later approval, not operations authorised or performed by this packet.

## Customer continuation remains queued

[The focused continuation](customer-continuation.md) preserves the three prepared private-test images and IKaya's existing organisation and pending-review status. After an approved successful release, it resumes canonical North Riding selection, one private house server draft save/reload, three confirmed uploads, another reload proving image order/primary image and property facts, followed by the dependent Developer save/resume/media checks.

The active browser wizard's **Save progress on this device** action saves local recovery; the normal Listing API supports a private server draft. Those proof boundaries must stay explicit. Three private-test images do not satisfy the current five-completed-photo submission requirement. Geography deployment alone does not add a browser private server-save action.

Discovery must start from the actual customer homepage entry, proceed through canonical selection and search, then card, detail and enquiry on a genuinely eligible public property. The reachable **Browse homes for sale** path reaches the canonical results selector; the homepage hero still uses legacy discovery and remains a separate migration gap if it is the intended entry. A private draft remains absent from public search.

Completed founder-login, logout and Developer-registration corrections stay closed without regression evidence. Payments stay closed until separate commercial launch acceptance; controlled unpaid engineering remains permitted. No production customer journey was resumed during preparation.
