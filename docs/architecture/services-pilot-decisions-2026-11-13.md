# Services pilot decisions (architect, 2026-11-13; authority delegated by Edward: "take over as our senior product architect and implement the best recommended decisions")

These settle the open items in services-launch-readiness-plan-2026-11-12.md §4, §5 stage 0 and §8 items 1-2.
Merges, production changes and irreversible steps still need Edward's written GO.

| # | Decision | How it is enforced |
|---|---|---|
| D1 | **Admission route: public provider applications.** Anyone can register as `service_provider` and complete a private profile. Registering never publishes anything; every profile stays private until a super-admin publication review approves it. | S2 PR (registration allow-list plus copy). The existing reviewed publication gate is unchanged. |
| D2 | **Consumer directory held until stocked.** All consumer `/services*` routes and every consumer entry point (nav, footer, landing CTAs, listing service actions, dashboard injections, agent referral) are held through the existing `LAUNCH_HELD_JOURNEYS` mechanism. Provider-facing pages (`/advertise/services`, registration, onboarding, provider workspace) stay open. | S3 PR (card 71). Release means removing `services` from `LAUNCH_HELD_JOURNEYS` in a PR that Edward merges once D3 and the release checks are met. |
| D3 | **Supply bar:** at least 2 independent, approved, contactable providers with an active service and valid coverage per advertised category × Place cell. Single-provider cells are not advertised in the pilot. | Operational: checked at publication review and before the D2 release. No code. |
| D4 | **Initial pilot market (recruitment target, revisable at the cohort review):** categories conveyancing, inspection/compliance certificates and moving; Places City of Johannesburg and City of Tshwane (Gauteng). | Guides recruitment and the D2 release decision. The canonical category keys and Place ids are recorded by the S0 builder. |
| D5 | **Owners:** Edward covers provider admission, publication review, new-request monitoring, review/report triage and customer support. Cadence: one daily check of new applications, new requests and review reports. | Ops runbook section in S0. |
| D6 | **Provider response expectation: 1 business day.** This is told privately to providers (onboarding/workspace copy and the admission message). It is never shown to consumers as a claim. | S2 copy where a natural provider-facing spot exists, plus the runbook. |
| D7 | **No automated provider alerts in the pilot.** Edward checks new requests daily and contacts the provider directly if a request is unanswered after 1 business day. DELTA-8 (a new-request email to the provider with no requester PII; the retired phase-0 system is not revived) is the first post-pilot workstream. It is pulled forward if any request goes 2 business days unanswered. | Runbook, plus the register queue order. |
| D8 | **Out of scope for the pilot:** payments, bookings, scheduling, quotes, paid placement, subscriptions, lead fees, campaigns, export (V2 §3.1). | Register. |
| D9 | **The homepage Services depth work** (worktree services-homepage-depth-20261113) is parked until the D2 release. | Not merged before D2. |
| D10 | **Withdrawal path:** unpublish a provider through the admin action. Re-hold the whole consumer journey by re-adding `services` to `LAUNCH_HELD_JOURNEYS`. | Runbook. |

Release order: S3 hold -> S0 docs -> S1 editor (after a local preview for Edward) -> S2 applications (after the Stage-3 rehearsal on a fresh disposable DB) -> recruit and publish the cohort -> release PR removing `services` from the held list (Edward GO).

## D4 reference: canonical keys and Place ids (recorded from source on `origin/main` 14696b8e2)

### Service category keys

The category enum is `SERVICE_CATEGORY_VALUES` at `drizzle/schema/servicesEngine.ts:34-41`, mirrored by
`serviceCategorySchema` at `server/servicesEngineRouter.ts:30-37`:
`home_improvement`, `finance_legal`, `moving`, `inspection_compliance`, `insurance`, `media_marketing`.

| D4 label | Canonical category key | Evidence |
|---|---|---|
| Conveyancing | `finance_legal` | No standalone conveyancing category exists. The directory category card maps `conveyanc` to `finance_legal` (`client/src/features/services/media.ts:176-186`, keyword at line 185). Conveyancing is a service within `finance_legal`, identified by the provider-entered `service_code` (free text, `drizzle/schema/servicesEngine.ts:178`, unique per provider at line 189). |
| Inspection / compliance certificates | `inspection_compliance` | `drizzle/schema/servicesEngine.ts:38`; category card at `client/src/features/services/media.ts:165-175`. |
| Moving | `moving` | `drizzle/schema/servicesEngine.ts:37`; category card at `client/src/features/services/media.ts:154-164`. |

Consequence: the D3 supply bar for "conveyancing" is measured on the `finance_legal` category with a conveyancing service,
because the category key alone also covers bond and home-finance providers.

### Place ids

Provider coverage uses `service_provider_locations.canonical_place_id` (`drizzle/schema/servicesEngine.ts:154`; format check
`isCanonicalPlaceId`, `shared/placeAuthority.ts:60`). The two metros appear in the source as the city-guide extent mapping at
`server/services/publicPropertyGuideService.ts:25-30`:

| Place | Id | Evidence |
|---|---|---|
| Johannesburg city guide place | `pl-place-01-21f154cd5d0954c29ec7525f` | `publicPropertyGuideService.ts:27` |
| City of Johannesburg (local municipality) | `pl-place-01-503de72cc29aa712c0e5a597` | `publicPropertyGuideService.ts:27` (mapped target) |
| Pretoria city guide place | `pl-place-01-d0401eba0f556a60bb02e528` | `publicPropertyGuideService.ts:29` |
| City of Tshwane (local municipality) | `pl-place-01-b903aa4e24582a26d57c7e2e` | `publicPropertyGuideService.ts:29` (mapped target) |

Metropolitan municipalities are contract-defined as context Places (`docs/architecture/geography-coverage-contract.md:1085`,
`:1112`). The ids above are read from source only; no database was contacted. Whether a given id is currently active and
selectable as provider coverage is unverified and must be confirmed in the isolated rehearsal (plan Stage 3) before recruitment
uses these ids.

### Rehearsal check: pilot trial entitlement

Public eligibility requires a provider to be verified, directory-active, and on an active trial or active subscription
(`server/services/servicesEngineService.ts:548-560`). The pilot is free (D8). The Stage 3 rehearsal must therefore show the exact,
audited step that gives an approved pilot provider its active trial (or confirm that publication does this). It must also record
that step in the operations runbook. If no supported path exists, stop: decide on a trial-grant path before recruitment.
Never use direct SQL.
