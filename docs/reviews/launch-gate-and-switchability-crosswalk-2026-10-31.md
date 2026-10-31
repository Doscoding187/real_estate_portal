# Launch gate and engine switch crosswalk

**Supporting review table · 2026-10-31.** This is a repository-based discovery aid, not an approval, release checklist, or switch change. No production, database, eligibility, or engine setting was changed.

## Launch surfaces mapped to release packages

I could not find a canonical artifact defining the requested “8-item launch gate.” These eight product/platform surfaces are an **inferred crosswalk**, not a verified substitute for the founder’s checklist. The release runbook uses B08–B18; each item remains open until fresh evidence closes it.

| Inferred launch surface | B08–B18 evidence it depends on | Gap in evidence checked here |
|---|---|---|
| Buyer loop: search, listing and enquiry | B08, B10, B12, B13, B14, B18 | API availability, email delivery/retries, staffed follow-up and final acceptance. |
| Place pages, guides and indexable SEO | B08, B12, B16, B18 | Initial HTML, canonical URLs, redirects and sitemap need Preview evidence. |
| Development search, detail and enquiry | B08, B10, B12, B13, B14, B18 | Approved public data and durable developer enquiry delivery are unproven. |
| Agent and agency pages/workspaces | B09, B10, B12, B13, B14, B15, B18 | Fresh-account boundary, email, follow-up, legal wording and staff cover. |
| Partner/referral journey | B09, B10, B12, B13, B14, B15, B18 | Invitations, referral custody, review queues, terms and operator handoff. |
| Explore | B08, B10, B12, B13, B14, B17, B18 | Content moderation and workload/recovery evidence; uploads stay hidden. |
| Shared Living, services and commercial | B08, B10, B11, B12, B13, B14, B17, B18 | Controlled cohort and media/enquiry operations need end-to-end proof. |
| Platform operations, payment/legal and recovery | B08–B18, especially B09, B11, B14–B18 | Exact target, account/storage controls, lawyer review, recovery and named GO. |

| Package | Status to carry forward |
|---|---|
| B08 database/app admission | Preserve exact target, migration head, runtime identity and worker grants; this review has no live database proof. |
| B09 fresh accounts/archive | Use fresh Azure MySQL accounts and no TiDB data reuse. Do not delete the TiDB cluster before launch. Account/grant evidence remains open. |
| B10 email | **UNCOVERED:** real mailbox, worker cadence, retry/bounce handling and delivery confirmation. |
| B11 media/proof storage | Keep private proof storage, encryption, access and recovery gates. AWS bucket settings were not checked. |
| B12 hosted runtime | **UNCOVERED:** founder reports Railway API down; #708 did not prove edge 503/noindex; web/API/worker origin and health evidence are missing. |
| B13 enquiries | **UNCOVERED:** worker cadence, routing, retry, backlog and named human follow-up. |
| B14 operational rehearsal | **UNCOVERED:** contacts, queues, weekend/absence cover and operator rehearsal. |
| B15 legal/copy | Keep Terms/Privacy and POPIA review open until a South African lawyer reviews actual data, cookies, retention and supplier facts. |
| B16 integration/artifact | #716 CI is green for its exact SHA; it remains a draft, with no live integration/cutover proof implied. |
| B17 capacity/recovery | **UNCOVERED:** representative 24-hour workload, alerts, restart, queue drain and recovery evidence. |
| B18 final acceptance | Open: no final evidence bundle or GO was verified. |

## Data sequence and rehearsal impact

- The #716 RC SHA and green CI remain valid for that exact code/data artifact. Its migration and Place load sequence remain useful for the reviewed runbook lineage. Neither proves current production schema, settings, worker health or launch readiness.
- The 103 Google Maps URL aliases (17 Gauteng) are removed in the one frozen Place package. Keep OSM attribution (“© OpenStreetMap contributors”) and do not save or cite Google Maps output. Land stays disabled under `LAND_VERTICAL_LAUNCH_STATE.enabled=false`; its tests remain unchanged.
- Search Area membership is not loaded by `db:release:reference:apply --adapter=places`. Keep the existing `search_area` and `search_area_member` authority and run a separate, reviewed post-Places seed/verify step with its own digest. This step is outside #716 and requires review plus a fresh rehearsal.
- The checked runbook calls its planned restore the fourth rehearsal, but that copy is still a draft and omits Search Area loading. Minimum added requirement: one complete disposable end-to-end rehearsal using the final Place package and post-Places area seed/verify. If a Place-only rehearsal already passed, this is one additional run. I could not verify that earlier pass or the historic total.

## Current engine controls and minimum usable depth

The owner decision is that every engine reaches useful, concept-proving depth and has an independent off switch. The registry marks some surfaces pilot/controlled; that is not a recommendation to reduce the MVP. “No switch found” below means no verified surface-wide server switch was identified in this source review.

| Engine | How it is switched off today | Minimum usable level for launch; gap |
|---|---|---|
| Sale/Rent core | No engine-wide server switch found. Maintenance is client-side and does not guarantee HTTP 503/noindex. Supply is controlled per listing. | Search, listing detail and enquiry; retain one exact Place authority. Verify a server-side vertical switch. |
| Land | `LAND_VERTICAL_LAUNCH_STATE.enabled=false`. | Remains off as directed; do not weaken tests. |
| Developments | Routes are mounted; commercial activation is preparation-only/off and publication is gated per development. No global public-read switch found. | Approved development, searchable units and enquiry to the right publisher; verify/add an approved vertical switch. |
| Agent pages | Routes are mounted and rely on approved profiles/web presence. Paid access is off, but that does not stop every public profile. | Approved profile, own listings, contact/enquiry and working delivery; needs a distinct public-page pause control. |
| Agency/partner referral | Per-program `isActive`/`isReferralEnabled` plus account/custody rules; no global partner switch found. | Referral application, terms, attribution, review, status and operator follow-up; global disable unverified. |
| Explore | One Option A pilot uses an environment allow-list. Upload and experiments are hidden; no one switch controls all feed types. | Mixed feed with real entity participation and working actions; keep uploads hidden until moderation/takedown works; add or verify one global pause. |
| Shared Living | Registry marks controlled pilot supply; routes exist; no global vertical switch found. | Search, detail, safe host contact/enquiry, moderation and response owner; verify server-side off control. |
| Services | Registry marks curated pilot; routes exist and manual operation is expected; no global switch found. | Request, provider assignment, contact/result, review and manual follow-up; verify server-side off control. |
| Commercial office | Registry marks controlled pilot; publication and terms gate individual offers; no global switch found. | One real search/detail/enquiry path with verified custody and response handling; verify global off control. |

Each missing engine switch is a product/code requirement for its own later workstream. This docs review did not implement or change any switch or launch flag.
