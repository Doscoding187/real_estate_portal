# Homepage city and metro scope audit

Date: 14 October 2026  
Branch: `feat/homepage-ux-review-20261013`  
Starting commit: `1ed2d6a0d`  
Local preview: http://localhost:3010  
Artifacts: `/home/edwardspc/Desktop/Dev/review-artifacts/home-metro-audit-20261014`

## Decision applies to every supported city

The founder clarified that the area-first journey applies across South Africa, not only Johannesburg and Cape Town. The rule is based on selected scope, not a list of city names:

- Homepage Buy/Rent with one city/town/province scope asks for an area before results.
- A selected suburb or eligible governed market area opens directly.
- Full selected scope requires an explicit Browse all choice.
- Location-only search retains the existing exploration journey.
- Administrative municipality context is not an executable city identity or a licence to expand geography.

The first implementation's exemption for factual towns was too broad: town classification does not prove that a shopping area is sufficiently precise. The exemption is removed. Factual labels and runtime IDs are preserved; a town can still use its existing city handle after explicit confirmation. This intentionally supersedes the direct-town behaviour recorded in the first local review.

## Local coverage evidence

Eighteen real, read-only discovery queries were checked on the existing owned local demo. These are local catalogue findings, not production or exhaustive national coverage claims.

| Input                                                                                   | Current local capability                                                                                                       | Homepage response                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pretoria                                                                                | Canonical city, eligible Pretoria East market area, factual locality suggestions including Pretoria Central and Pretoria North | Clarifies first. Pretoria East uses its Search Area ID; a selected suburb uses its canonical ID; Browse all Pretoria is a separate action.                                                                  |
| Johannesburg                                                                            | Canonical city and eligible North/South market areas                                                                           | Clarifies first. No northern-suburb inference or automatic municipality expansion.                                                                                                                          |
| Centurion / Midrand                                                                     | Factual towns with city runtime handles and separate, same-named market areas                                                  | Town scope also asks for clarification. Factual place and market area remain distinguishable identities.                                                                                                    |
| Cape Town / Durban / Bloemfontein / Gqeberha                                            | Canonical cities; no finer candidates in these local city lookups                                                              | Clarifies first, keeps specific-area search available, and offers explicit full scope. Does not repeat the current city as a non-progressing option or describe its presence as an empty lookup.            |
| Tshwane / Ekurhuleni                                                                    | Individual factual places matching municipality context; no selectable municipality-wide identity                              | Raw municipality text cannot submit a full-area search. Visitors must explicitly choose a supported place or market area. The current alphabetic context candidates are not a complete municipality picker. |
| East Rand / Pretoria East                                                               | Eligible governed Search Areas                                                                                                 | Explicit selection uses that area only. East Rand is not silently substituted for Ekurhuleni.                                                                                                               |
| eThekwini / Mangaung / Nelson Mandela Bay / Buffalo City / East London / Port Elizabeth | No selectable candidates returned by this local lookup                                                                         | Recorded coverage gaps. Do not manufacture aliases, query identities, nearby results or national completeness.                                                                                              |

The lookup limit is eight, so returned suggestions are not a directory or proof that other records do not exist in the wider source catalogue.

## Administrative distinction

Official first-party descriptions support treating municipality and settlement intent separately: [City of Tshwane, About Tshwane](https://www.tshwane.gov.za/?page_id=348) describes the integration of municipalities and surrounding areas; [City of Ekurhuleni, Our Journey](https://www.ekurhuleni.gov.za/about-the-city/our-journey/) describes the union of several towns and administrations. These sources provide context, not executable Property Listify membership or authority to treat a municipal name as a city alias.

Repository authority is more specific: `docs/architecture/geography-coverage-contract.md`, section 20, keeps municipalities as context-only Places and rejects retyping them to satisfy a city search ladder. Broad membership expansion requires its own governed authority. The frontend adapter now also rejects municipality factual types rather than interpreting them as cities.

## Changes and checks

- `homeAreaSelection.ts`: uniform city/town scope clarification and municipality-type rejection.
- `HomeAreaPicker.tsx`: removes the repeated current-city option and gives useful guidance where a city has no finer suggestions; town-wide copy retains the factual label.
- `HomeMetroJourney.test.tsx`: Buy/Rent behaviour across multiple provinces, factual town clarification, no-data refinement guidance and municipality-context selection boundaries.
- `homeAreaSelection.test.ts`: updated town expectation and municipality identity protection.
- Review records updated to distinguish the first implementation from this follow-up.

123 tests pass across ten relevant suites. Type checking, targeted lint and the build are recorded alongside browser results in the artifact directory. The build retains the existing large-chunk warning. No backend service, database query, schema, seed, listing membership, ranking, payment or publication change is introduced. Database authority status on the existing owned demo is ready and schema-congruent. No protected or remote database was accessed; public municipal websites were consulted read-only.

## National completion brief

The UI rule and geographic coverage are different deliverables. The next governed geography/discovery slice should satisfy these acceptance criteria:

1. A municipality name can open an area-choice surface using its canonical context identity, without making the municipality an executable listing scope.
2. Choices come from approved identity relationships and market memberships. Do not build a municipality directory from display text, keyword matches, handwritten city lists or assumed nearby areas.
3. City, town, suburb and market-area choices retain truthful labels and distinct IDs. Pretoria and Tshwane are not interchangeable; a market area and its namesake town are not interchangeable.
4. All eight metro contexts and their common settlement entry names have a reviewed coverage matrix: selectable identity, context-only entry, supported narrowing choices, and documented gaps. Aliases need governed identity evidence.
5. A broad-entry surface shows a small useful selection of supported market areas or towns, plus search. Do not replace a flat city feed with a long alphabetic suburb list.
6. No municipal Browse all action until executable membership is explicitly approved. No silent substitution of another area when coverage is incomplete.
7. Preserve journey, category and supported budget through area selection and results. Apply the same intent contract to results refinement and other transactional entry points in a connected follow-up; this commit changes the homepage only.
8. Decide any future fast path for small settlements using governed product-scope metadata. Do not infer it from the word town, display label, population guess or a client-side list of famous cities.
9. Verify broad names, municipal names, aliases, ambiguous place names, precise suburbs, zero matches and failed lookups with representative local data and mobile users. Measure clarity of scope and successful narrowing before claiming adoption or conversion gains.

This brief records the missing national work; it does not authorize ad hoc taxonomy, membership, seed or protected-reference changes.
