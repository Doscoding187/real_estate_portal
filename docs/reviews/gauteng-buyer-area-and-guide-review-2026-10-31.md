# Gauteng buyer-area and guide review (draft)

**Status:** founder-editable draft, 2026-10-31. Local repo only; no cloud/production access, no merge, and no package, Place, eligibility, or runtime change. **Reference base:** release RC `68465f0e83c91fc826ea51da776be365a7cda5b4`.

## Current Place records

These are direct facts from the Gauteng v0.3 admission package and national URL projection. “Children” means direct `settlement_within` edges, not all descendants. All 13 records are provisional, search-eligible, publication-ineligible. The current administrative parents below are municipalities; the 13 have no settlement parent. The two `Midrand` identities are distinct.

| Query | Place ID | Current type | Current parent (`administratively_contains`) | Settlement children | Preferred label | Searchable aliases |
|---|---|---|---|---:|---|---|
| Sandton | `pl-place-01-dee61758ef3bda7cd1a258ad` | suburb | City of Johannesburg | 0 | Sandton | Sandton (duplicate name row; remove/reconcile) |
| Morningside | `pl-place-01-f61e9782f1f967a16994f74d` | locality | City of Johannesburg | 0 | Morningside | MORNINGSIDEAGRICULTURALHOLDINGS; Morningside Agricultural Holdings |
| Rivonia | `pl-place-01-5a2e67d0ccaa58bb14099450` | suburb | City of Johannesburg | 0 | Rivonia | — |
| Sandown | `pl-place-01-0ece5d327ba275607224eeab` | locality | City of Johannesburg | 0 | Sandown | — |
| Bryanston | `pl-place-01-f175328139bb845a4645b9d4` | suburb | City of Johannesburg | 0 | Bryanston | — |
| Sunninghill | `pl-place-01-34ec79c64c78c64c042529ad` | suburb | City of Johannesburg | 0 | Sunninghill | — |
| Fourways | `pl-place-01-bbe8dbb14d11d1383a3a8d54` | suburb | City of Johannesburg | 0 | Fourways | Four Ways |
| Midrand (City of Johannesburg) | `pl-place-01-0614f47352b29b431aee83fd` | town | City of Johannesburg | 16 | Midrand | — |
| Midrand (Ekurhuleni) | `pl-place-01-0c25cd961d354fd187d0329c` | locality | Ekurhuleni | 0 | Midrand | — |
| Centurion / Lyttelton | `pl-place-01-1a30ae4d635ef747d6c987df` | town | City of Tshwane | 0 | **Lyttelton** | Centurion; Verwoerdburg |
| Irene | `pl-place-01-7499ebba5c098030f9f2f56d` | town | City of Tshwane | 0 | Irene | — |
| Roodepoort | `pl-place-01-de64523ea374afb6295fcdc6` | town | City of Johannesburg | 48 | Roodepoort | ROODEPORTMARAISBURG; Rodeportas; Rodipoto; Roodeport-Maraisburg; Rudepurt; Rūdeporta |
| Soweto | `pl-place-01-99b91be60755ea1f09bf6349` | town | City of Johannesburg | 45 | Soweto | Mpanzaville; Soueto; Sovetas; Soveto; Soweto (duplicate name row) |

The current Randburg anchor is `pl-place-01-7e92e438655b8d2b97c1a395`, type `city`, parent City of Johannesburg, with **88** direct settlement children. It is the existing example of a broad Place guide with exact-area links.

## Smallest buyer-area model

Use the already defined **Search Area** identity plus `search_area_member` membership for buyer-market groups. These IDs are separate from factual `place_id`s; the same factual suburb may belong to multiple Search Areas. Six Search Area definitions currently exist in the Gauteng candidate pack (Johannesburg North/South, East Rand, Pretoria East, Midrand, Centurion); 13 additional names below are research-only, not admitted or live. This draft creates no ID.

Do not encode overlapping buyer markets as `settlement_within`: that is factual settlement context, feeds canonical URL context, and the URL projection refuses more than one settlement parent. `market_association` is explicitly non-expanding and does not substitute for the governed `search_area_member` authority. The current Randburg guide’s settlement edges remain suitable for Randburg’s factual child list, but not for overlapping market boundaries.

For Sandton, keep the small factual Place’s ID, type `suburb`, preferred name, and current slug unchanged. Show that Place as **“Sandton Central”** in the buyer-area/picker context, while the separate buyer-area result is **“Sandton area guide.”** Do not store that contextual label as a new preferred Place name. The current `search_area_member` schema has no per-member display label, so the smallest implementation is a presentation override keyed by this existing Place ID in the frozen guide/picker package, consumed only for display; selection still stores the Place ID. This distinguishes the exact locality from the buyer guide without changing the Place ID or `/gauteng/city-of-johannesburg/sandton` URL. The buyer-area result is navigation only; it never searches or counts all member listings.

For Centurion, the right existing town is the Lyttelton record above: make **Centurion** its preferred public name and retain **Lyttelton** as an alias on that same Place ID. Type stays `town`; no new Place ID. The current canonical path is `/gauteng/lyttelton`; the v0.1 URL projection says legacy aliases are `none`, so changing the preferred label would produce `/gauteng/centurion` and the old path would not redirect automatically. Add and verify a permanent 308 redirect before publishing the changed label. A Centurion Search Area must remain a separate search-area identity and be shown as “Centurion area guide” beside “Centurion · town.”

**Page anchors and listing ownership:** the Sandton area guide uses Place ID `pl-place-01-dee61758ef3bda7cd1a258ad` and the existing URL `/gauteng/city-of-johannesburg/sandton`. An anchor mapping connects its separate Greater Sandton Search Area to that Place route; it creates or changes no Place. The page lists member Places and shows listings assigned to the Sandton Place ID only in a separate exact-place section labelled **“Sandton Central.”** No member listings appear in that section or its count. The Centurion guide uses its existing town Place ID at `/gauteng/centurion` after the preferred-name change and redirect; listings assigned to that ID appear in an exact “Centurion town” section. Member suburbs remain separate Place links, and Lyttelton remains an alias rather than a child Place.

## Founder-editable Gauteng membership table

The attached [membership draft CSV](gauteng-buyer-area-membership-draft-2026-10-31.csv) has one row per candidate membership (plus every current direct settlement child for Johannesburg, Randburg, Roodepoort, and Soweto). It includes candidate/current ID resolution, type, municipality, evidence state, confidence, ambiguity, source references, and a blank founder decision column. It contains **23 area concepts**: 19 market candidates already in repo research plus four existing factual guide anchors. Only six market candidates have a current Search Area definition; do not activate the other 13 from this draft alone.

**Sandton founder check:** the current Greater Sandton research list has five core rows: Sandton, Bryanston, Morningside, Rivonia, and Sandown. Sunninghill, Wendywood, Inanda, Hurlingham, and Parkmore are not in that list. Illovo is present only as `supported` and held. The five missing names have exact Gauteng Place rows, but membership is a founder decision; mark each in the CSV rather than treating the name match as approval.

| Buyer-area candidate | Draft member Places from current repo evidence | Confidence / ambiguity for founder |
|---|---|---|
| Johannesburg North | Broadacres, Bryanston, Craigavon, Douglasdale, Fourways, Magaliessig, North Riding, Northgate, Olivedale, Randburg, Sandton; Johannesburg North itself is a name collision, not a member | Mixed core/high; 3 geographic gaps; overlap with Greater Sandton/Fourways |
| Johannesburg South | Alberton, Bassonia, Brackenhurst, Glenvista, Kibler Park, Mondeor, Mulbarton, Oakdene, Raceview, Randhart, Rosettenville, Winchester Hills | Mixed core/high; overlaps East Rand; check municipality/market boundary |
| East Rand | Alberton, Bedfordview, Benoni, Boksburg, Brakpan, Edenvale, Germiston, Kempton Park, Springs | Six core and three strong; East Rand remains excluded as a buyer search term per founder decision; content-only later |
| Pretoria East | Brooklyn, Faerie Glen, Garsfontein, Lynnwood, Menlyn, Mooikloof, Muckleneuk, The Hills, Wapadrand, Waterkloof, Waterkloof Ridge | Mixed core/high; six geography gaps; overlaps Old East |
| Midrand | Barbeque Downs, Blue Hills, Carlswald, Glen Austin, Halfway House, Midrand, Noordwyk, Vorna Valley | Mixed core/high; two distinct current Midrand Place IDs and two gaps require exact-ID review |
| Centurion | Centurion, Doringkloof, Eldoraigne, Irene, Midstream Estate, Rooihuiskraal, The Reeds, Wierdapark, Zwartkop | Mixed core/high; one gap; Centurion town vs Centurion Search Area must stay distinct |
| West Rand | Krugersdorp, Randfontein, Roodepoort, Westonaria | Mixed core/high; Roodepoort is strongly associated but is in City of Johannesburg |
| Greater Sandton | Bryanston, Morningside, Rivonia, Sandown, Sandton | Five core; “Sandton” is also the exact suburb Place, display as Sandton Central there |
| Fourways | Broadacres, Craigavon, Fourways, Magaliessig | Four core; four further rows unresolved; overlap with Johannesburg North |
| Pretoria Old East | Brooklyn, Hazelwood, Lynnwood, Muckleneuk, Waterkloof | Mixed core/strong; overlaps Pretoria East |
| Pretoria Moot | Gezina, Kilner Park, Queenswood, Rietondale, Villieria, Wonderboom | Mixed core/strong; additional supported/unresolved candidates remain held |
| Pretoria North | Annlin, Florauna, Pretoria North, Theresapark, Wonderboom | Mixed core/strong; supported additions held |
| Vaal | Evaton, Meyerton, Sebokeng, Vanderbijlpark, Vereeniging | Core/strong; Evaton/Sebokeng etc. need province boundary check; Sasolburg is Free State |
| Johannesburg East | No member list approved | All six evidence rows disputed; hold |
| Johannesburg West | Roodepoort, Soweto | Limited evidence; wider West Rand overlaps; hold for boundary review |
| Pretoria Far East | No member list approved | Evidence unresolved/supported only; source places include geography gaps; hold |
| Pretoria North East | No member list approved | Disputed/unresolved and overlaps Moot/North; hold |
| Pretoria West | No stable member list | Direct Place usage only; hold |
| Pretoria Central | No stable member list | Direct Place usage only; hold |
| Johannesburg (existing factual guide) | Current 146 direct settlement children; exact IDs/names in CSV | Existing factual edges, not a market Search Area |
| Randburg (existing factual guide) | Current 88 direct settlement children; exact IDs/names in CSV | Existing factual edges, not a market Search Area |
| Roodepoort (existing factual guide) | Current 48 direct settlement children; exact IDs/names in CSV | Existing factual edges, not a market Search Area |
| Soweto (existing factual guide) | Current 45 direct settlement children; exact IDs/names in CSV | Existing factual edges, not a market Search Area |

City of Johannesburg Regions A–G are **administrative cross-checks only**, not buyer-area borders: the reviewed city-guide record places Diepsloot/Midrand in A; Rosebank/Randburg/Northcliff/Emmarentia in B; Roodepoort in C; Soweto in D; Sandton/Alexandra in E; inner-city/Johannesburg South in F; and Lenasia/deep south in G. The repo notes that the City's public region pages contain errors; do not mechanically turn a region into market membership. Existing supporting record: `docs/reviews/guide-pilot-copy-signoff.md` and `docs/reviews/guide-pilot-copy-review-2026-10-20.md`.

## Evidence and OSM decision record

The attached [place evidence review CSV](gauteng-place-founder-evidence-review-2026-10-31.csv) contains the 13 named Place IDs, current source providers and record/link IDs, map-check and approval blanks, and the existing canonical path. The committed package stores provider IDs but does not provide a per-row source permalink in a separate URL field. Do not invent or infer a source URL: place the exact reviewed source and URL in the existing evidence-note field only. A Google Maps visual inspection may set `founder_checked_on_map=Y`; do not save Google-derived names, coordinates, screenshots, excerpts, or links.

The full Gauteng v0.3 names artifact currently contains **17 Google Maps URL aliases**; the nine current admission packages contain **103** (`google.com/maps`) aliases altogether. Remove these alias rows from the frozen package and confirm there are zero Google Maps names or citations in the output. The source authority remains the existing non-Google package evidence. An OSM-only row may establish existence/identity under the founder decision; where the product displays OSM-derived place data, show **“© OpenStreetMap contributors”** with a link to `https://www.openstreetmap.org/copyright` on place search/picker results and place/area guides. The decision sheet must record `founder checked on map (Y/N)` and only after an actual founder decision, `reviewed and approved by founder on 2026-10-31` (or the actual later date).

No explicit founder-approved publication-ID list was supplied in this RC package or this request. Keep the approval-ID column blank until that list and dated decision record are supplied. This draft changes no `publication_eligible` or `search_eligible` flag.

## Freeze and release boundaries

Do not freeze until the founder edits the membership CSV and approves the exact IDs and evidence. Keep two reviewable data artifacts: freeze the Place package (names/types/factual edges, Google URL alias removals, already reviewed 48 and 2,556 exact-state changes, and any approved publication decision) with its current Places digest; freeze Search Area definitions/memberships and Place-page anchors as a separate version and digest. Do not mix the member digest into the Places digest. No row or membership may be inferred or widened. Pin both digests and the migration head in the fourth-restore checklist only after founder approval, then rehearse the new post-Places step on the disposable copy.

**Current pipeline gap:** `db:release:reference:apply --adapter=places` does not load `search_area` or `search_area_member`. The schema already has those tables (migrations 0102–0103), but the Place adapter is not an area-member loader. Keep the Places adapter and its digest unchanged; a separate reviewed seed/verify operation is needed after Places. No tooling was changed here. This buyer-area scope is not in RC #716 and must not be added to the fourth-restore candidate without review and a new rehearsal.

### Adapter versus separate post-Places release step

| Option | Effort estimate | What changes | Rehearsal and freeze effect | Main risk |
|---|---|---|---|---|
| (a) Extend the governed Places adapter | **M: about 3–5 engineering days** | Add Search Area/member planning, exact-state apply/verify, digest coverage, and focused tests to the shared reference-data path. | Freeze Place and member artifacts together; the existing `places` plan/digest changes. Repeat the full 0112–0197 + reconciliation + Places rehearsal with the new adapter step. | Editorial membership edits become part of the protected Place digest and stop conditions; expands the path being reviewed. |
| (b) Separate post-Places membership release | **M: about 2–4 engineering days** | Leave the Places adapter/digests unchanged; seed and verify membership separately after Places. Freeze the member file and digest separately. | Rehearse the current Place sequence unchanged, then rehearse one extra member seed/verify step. If an anchor table is approved, migrate through the new head and include it in the full migration rehearsal. | A new membership table would duplicate the existing `search_area_member` authority. A separate seed operation still needs target binding, plan/apply/verify, and tests. |

**Recommendation:** choose the separation in (b), but do **not** create a second membership table such as `place_buyer_area_member`. `search_area` and `search_area_member` are already the canonical, separate market-identity and membership tables in migrations 0102–0103; they match overlapping editorial choices without changing factual Place relationships or search scope. If the area page must live at an existing Place URL, the schema gap is only an optional one-row-per-area `search_area_place_anchor` mapping from `search_area_id` to the existing Place ID. That is a normal additive migration, not a Places-adapter change. Seed reviewed members after the Places load in a separate plan/apply/verify operation with its own digest. No code, migration, table, or tool is created in this draft. This remains outside RC #716 and requires its own rehearsal before release.

Not included: new factual Place IDs; changes to Place types except a separately approved correction; eligibility-flag changes; automatic search expansion; broad-area listing aggregation; Google Maps storage/citation; production access; indexing unreviewed long-tail pages; Land activation; or new facts/amenities.

## Broad guide behavior

A buyer-area guide reads its `search_area_member` rows and lists exact member Places with their own links and labels. Selecting a member opens a search for that one `place_id`. The guide does **not** query listings at the parent, add child listings to a parent count, or treat market membership as a search boundary. City and factual Place guides can continue using their existing `settlement_within` children where appropriate. The Sale/Rent guide work in #707 remains held until the guide shows the reviewed membership list and the exact-area/no-rollup behavior is verified.

## SEO audit and page copy drafts

The current canonical projection is authoritative for route paths; old editorial notes can be stale. The five Place rows below are all provisional and `publication_eligible=0`, so their canonical Place pages are noindex today. Publish/index only after their separate review gate passes. Membership alone does not change a Place URL. An area page anchored to an existing Place reuses that canonical Place URL; a standalone Search Area would need its own public route and should stay noindex until membership and copy are approved.

### SEO headline from committed serving paths

1. **Place pages:** Not complete HTML on Vercel. The route falls back to generic `/index.html` with generic head tags and an empty `#root`; title, description, canonical, H1 and body are populated client-side. The API server's fallback injects head metadata, but Vercel does not route public Place paths through it.
2. **Listing pages:** Also client-rendered on Vercel. Property data supplies the H1/body after the client fetch; `MetaControl` changes title, description and canonical in `useEffect`. Initial HTML has no listing-specific metadata or content.
3. **Sitemap:** Yes. Vercel proxies `/sitemap.xml` and child sitemaps to the API. The index includes Places and listings; Place entries require verified + publication-eligible state. There is no separate guide sitemap today.
4. **robots.txt:** Yes. Vercel proxies to the API; a committed static copy also exists. It permits public crawling and disallows admin, dashboard, API and auth paths.
5. **Smallest fix:** Add route-aware prerender/SSR for canonical Place and public listing pages so title, description, H1, canonical and body exist in initial HTML. Keep current sitemap/robots; same-URL buyer-area content reuses the Place sitemap entry, and remains noindex until approved.

| Page | Current path | Review finding / action |
|---|---|---|
| Sandton Place | `/gauteng/city-of-johannesburg/sandton` | Keep the Place path; contextual picker label “Sandton Central.” Separate broad guide title “Sandton area guide.” |
| Rosebank Place | `/gauteng/randburg/rosebank` | Current path context comes from a `settlement_within` Randburg edge; verify that this remains intended against the City Region B guide before indexing. |
| Johannesburg Place | `/gauteng/johannesburg` | Broad city guide should lead to exact suburb choices; never aggregate child listings. |
| Randburg Place | `/gauteng/randburg` | Existing city anchor with 88 children; member navigation only. |
| Centurion/Lyttelton Place | `/gauteng/lyttelton` | Proposed preferred name changes path to `/gauteng/centurion`; projection has no legacy alias redirects. Add permanent 308 and verify old/new route before indexing. |

Draft copy, using only package facts and reviewed membership; no live inventory or market claims:

- **Sandton area:** “Choose an exact area in the Sandton guide: Morningside, Rivonia, Sandown, Bryanston or Sunninghill. Each choice opens its own search; this guide does not combine listings across areas.”
- **Rosebank:** “Rosebank is a suburb in the City of Johannesburg, Gauteng. Choose Rosebank to search this exact place. Nearby suburbs remain separate searches.”
- **Johannesburg:** “Johannesburg is a city in Gauteng. Choose a suburb to narrow your search to an exact area; this guide does not combine listings from its suburbs.”
- **Randburg:** “Randburg is a city in the City of Johannesburg. Choose one of its listed suburbs to open an exact-area search; listings from other areas are not added.”
- **Centurion:** “Centurion is a town in the City of Tshwane, Gauteng. Choose a suburb or locality in the Centurion area to search that exact place. Lyttelton remains an alternate name for the same town.”

Available committed per-Place facts: Place ID, preferred and alternate names, type/classification, province and municipality context, verification/lifecycle/eligibility fields, source-provider record IDs, representative coordinates in source authority, and explicit relationships. Direct child edges are available. The admission package has no listing counts, wards, census figures, population totals or explicit nearest-place facts. Nearby-place distances could be derived from coordinates but are not membership evidence and should not appear in prose without a reviewed source. No source in the package supports school, safety, lifestyle, commute, price trend, yield or demand claims. AI may draft only from these structured fields; unknown facts should produce neutral copy, not a guess.

For national rollout, draft the first 100 page records, keep the long tail noindex until it has listings or reviewed content, and send the top 20–30 pages for founder review. The 20–30 must be chosen from a founder priority list; do not infer ranking from place counts or source count. OSM attribution goes on any page or picker surface displaying OSM-derived place data.

## Founder input needed before any data freeze

1. Edit the Sandton/Greater Sandton rows first: confirm the existing five, decide Sunninghill/Wendywood/Inanda/Hurlingham/Parkmore, and mark Illovo included, excluded, or disputed. Keep each decision tied to the exact `member_place_id`.
2. Review the remaining 22 area concepts and every ambiguous/unresolved member row in the attached CSV. Mark include/exclude/dispute; do not infer approval from the current research confidence.
3. In the evidence CSV, fill `founder_checked_on_map_Y_N` and approve/reject each of the 13 Places; record the actual review date. Use Google Maps only for visual checking; do not paste a Google URL, screenshot, coordinate, name or note into the repo.
4. Send the exact Place IDs approved for public pages and their dated decision. This list is currently absent; no eligibility flag changes are implied by a map check.
5. Confirm the separate post-Places route: use the existing `search_area_member` table, with only an anchor mapping migration if needed; do not add a parallel membership table. Then review that migration/seed diff and its rehearsal evidence before the two package digests are frozen.

## Source files checked

- Gauteng admission package v0.3: `data/gauteng-place-admission-v0.3/`.
- National URL projection: `data/place-url-projection-national-v0.1.json` (`legacy_aliases: none`).
- Gauteng Search Area research/definitions: `data/gauteng-search-area-research-v0.1/output/` and `data/gauteng-search-area-candidates-v0.1/output/`.
- Existing guide behavior: `server/services/landPublicService.ts`; it reads direct `settlement_within` children and returns exact Place links; it does not itself expand the search query.
- Canonical Search Area/Place distinction: `drizzle/schema/placeAuthority.ts`, migrations `0102`/`0103`, and `docs/architecture/geography-coverage-contract.md` sections 10 and 20.
- Editorial/region check: `docs/reviews/guide-pilot-copy-signoff.md`, `docs/reviews/guide-pilot-copy-review-2026-10-20.md`, and `docs/reviews/sandton-suburb-guide-discovery-2026-10-15.md`.
