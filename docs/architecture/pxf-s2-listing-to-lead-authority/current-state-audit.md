# PXF-S2 Listing-to-Lead Authority — Current-State Audit

**Programme:** Property Listify Product Experience Foundation
**Workstream:** PXF-S2 Listing-to-Lead Authority
**Audit worktree:** `/home/edwardspc/Desktop/Dev/listify-pxf-s2-listing-to-lead-audit`
**Audit branch:** `audit/pxf-s2-listing-to-lead-authority`
**Verified baseline:** `1373ce7c540a4d3941d2080cdb940fed36e5e971`
**Control worktree:** `/home/edwardspc/Desktop/Dev/property-listify-main`
**Audit date:** 2026-07-31
**Final verdict:** **Proceed with containment**

---

## 1. Executive verdict

Property Listify has a substantial listing-to-lead foundation on current `main`, but the launch-critical journey is not yet safe enough to treat as closed.

The strongest current authority is split across:

- the canonical single-property listing lifecycle in `server/listingRouter.ts` and `server/db.ts`;
- publication entitlement in `server/services/listingPublicationEntitlementService.ts`;
- public lead capture in `server/leadsRouter.ts` and `server/services/publicLeadCaptureService.ts`;
- agency lead, viewing, follow-up and My Day operations in `server/agencyRouter.ts`;
- still-active independent-agent lead and showing operations in `server/agentRouter.ts`;
- the current launch wizard at `/listings/create`.

The downstream public-enquiry-to-agency-workspace journey is materially stronger than the authoring entry point. Canonical recipient resolution, anti-spoofing behaviour, agency tenancy, viewing operations and My Day all have meaningful contract or integration evidence.

The listing-authoring boundary contains one verified destructive-operation P0 and multiple P1 defects involving role gating, ownership checks, lifecycle atomicity, attribution, retry identity and false draft-save guarantees.

A substantial historical Intelligent Listing Engine V2 exists and contains useful draft-persistence and workflow-contract work. It is not merged, is hundreds of commits behind current `main`, lacks current create/edit/submit parity and must not be activated or merged wholesale. Its safe value is as a reference source for selective reimplementation.

The correct launch strategy is:

1. contain current listing safety and lifecycle defects;
2. converge lead and viewing transition authority;
3. add durable server draft authority through the current database process;
4. connect the current wizard to that durable authority;
5. converge the workflow shell only after parity is demonstrated;
6. defer rich UX, media and SEO refinement until the foundation is safe.

---

## 2. Audit scope and verified repository state

### 2.1 Scope

The audit covered the end-to-end journey:

```text
authorized access
→ listing authoring
→ draft and resume
→ readiness
→ submit, review and publication
→ public discovery and detail
→ prospect enquiry
→ canonical agent or agency recipient
→ lead workspace and action
→ viewing
→ follow-up and My Day
```

It also covered:

- historical worktree and branch reconciliation;
- current-main versus historical V2 lineage;
- current-main versus Listing Wizard Overhaul lineage;
- migration and draft-portability boundaries;
- agency and agent operating authority;
- public lead delivery truth;
- destructive-operation safety;
- test and evidence maturity.

### 2.2 Verified authority state

At the time the evidence bundle was created:

- audit worktree branch: `audit/pxf-s2-listing-to-lead-authority`;
- audit HEAD: `1373ce7c540a4d3941d2080cdb940fed36e5e971`;
- control worktree branch: `main`;
- control HEAD: `1373ce7c540a4d3941d2080cdb940fed36e5e971`;
- `origin/main`: `1373ce7c540a4d3941d2080cdb940fed36e5e971`;
- audit worktree: clean;
- control worktree: clean.

No merge, cherry-pick, checkout, reset, migration execution, deletion, commit or repository write was performed during the evidence collection.

### 2.3 Evidence set

The canonical evidence bundle contains:

1. `pxf-s2-worktree-reconciliation-01.txt`;
2. `pxf-s2-reconciliation-02-agency-agent-proof.txt`;
3. `pxf-s2-reconciliation-03-v2-lineage.txt`;
4. `pxf-s2-reconciliation-04-draft-portability.txt`;
5. `pxf-s2-audit-05-current-listing-authority.txt`;
6. `pxf-s2-audit-06-enquiry-lead-viewing-my-day.txt`.

The evidence bundle SHA-256 is:

```text
351f34017c1f311be9c872086c4a4a515326d7327ece5cdab3dd3f283875a7cd
```

---

## 3. End-to-end current journey verdict

| Journey segment | Current authority | Verdict |
|---|---|---|
| Access to `/listings/create` | `client/src/App.tsx` | Authenticated route exists, but no role guard |
| Listing create/update | `server/listingRouter.ts`, `server/db.ts` | Substantial, but over-broad procedure gating and lifecycle defects |
| Local wizard state | `client/src/hooks/useListingWizard.ts` | Working browser-state foundation |
| Durable draft | No current canonical router/schema authority | Missing |
| Readiness | `client/src/lib/workflows/listing/*`, server readiness functions | Stronger than route wiring |
| Submit/review/publish | `server/listingRouter.ts`, `server/db.ts`, entitlement service | Exists, but transition atomicity and published-edit defects remain |
| Public property projection | `properties` mirror linked through `sourceListingId` | Material foundation exists |
| Public lead capture | `server/leadsRouter.ts`, `publicLeadCaptureService.ts` | Strong canonical routing and anti-spoofing foundation |
| Agency lead workspace | `server/agencyRouter.ts`, agency frontend | Substantial |
| Independent-agent workspace | `server/agentRouter.ts`, agent frontend | Active but overlapping authority |
| Viewing | `server/agencyRouter.ts`, `showings` | Substantial; mutation scope requires containment |
| My Day | `server/agencyRouter.ts:getMyDay` | Strong operating aggregation |
| External delivery | Settings imply more than code proves | CRM persistence and workspace visibility proven; email/WhatsApp delivery not proven |

Overall journey verdict:

> The platform has enough current capability to justify bounded correction rather than replacement. The route, lifecycle and downstream operating foundations should be preserved. Launch should be blocked only by the P0 and launch-required P1 findings, not by V2 completeness or historical cleanup.

---

## 4. Worktree and historical-lineage reconciliation

### 4.1 Current `main` remains launch authority

`origin/main` is the only acceptable implementation baseline for the next workstream.

Historical branches may supply design, contract and test evidence, but they do not supersede current authentication, agency membership, publication, migration or lead-routing authority.

### 4.2 AALC and agency workstreams are contained in `main`

The following branches were proven fully contained in `origin/main`, with zero branch-only commits:

- `aalc-s1-canonical-listing-publication-entitlement`;
- `aalc-s2-retire-legacy-property-create`;
- `aalc-s3-principal-bootstrap-authority`;
- `feat/agency-operating-core`;
- `feat/agency-canvassing-mvp`;
- `feat/agency-mandate-conversion-mvp`;
- `feat/agency-offers-transactions`;
- `feat/agency-listing-performance-mvp`;
- `feat/agency-pain-point-loop-closure`;
- `feature/agent-lead-visibility-followup`;
- `feature/mvp-canonical-property-lead-ownership`.

Their committed work must be audited and corrected on current `main`, not revived from their old branches.

### 4.3 Intelligent Listing Engine V2 exists

The clean worktree:

```text
/home/edwardspc/Desktop/Dev/listify-intelligent-listing-engine-v2
```

on:

```text
feature/ile-phase3d-draft-ui
```

contains eight commits absent from current `main`.

Its material capabilities include:

- guarded `/listings/create-v2` route;
- `ListingWizardV2.tsx`;
- `ListingWizardEngine.tsx`;
- dedicated wizard context;
- sale, rent and auction workflow contracts;
- payload, validation and readiness contracts;
- server draft procedures;
- server draft identity and hydration;
- manual draft save UI;
- draft-save state hardening;
- dedicated draft contract tests.

It is approximately 358 commits behind current `main` and must not be merged wholesale.

### 4.4 V2 and Listing Wizard Overhaul are sibling lineages

The V2 and overhaul branches share merge base:

```text
d775fad02918c722e16049107b68192d83fa0c31
```

Neither is an ancestor of the other.

The overhaul contributes:

- workflow shell and navigation concepts;
- step validation;
- Action and Property Type redesign;
- Basic Information redesign;
- Additional Information redesign;
- uncommitted media and preview incubation.

The overhaul does not provide the stronger server-draft authority found in ILE V2.

### 4.5 Historical recovery branches

`recovery/lead-routing-verification-2026-06-02` and related DLE recovery branches contain useful behavioural evidence for:

- manual save and resume;
- one stable draft identity;
- truthful failure state;
- review readiness;
- public publication;
- lead-context preservation;
- no false success;
- published-edit field ownership.

Most of that implementation concerns the Development Listing Engine. It is behavioural and acceptance-test evidence, not a current single-property merge source.

### 4.6 Development lead-routing branch

`codex/lead-routing-engine` contains a substantial development matching and routing engine with schema, migration, services and tests.

It is adjacent to, but not the canonical public property enquiry-to-agency workflow audited here. It is deferred from PXF-S2 launch containment.

---

## 5. Canonical and competing authorities

### 5.1 Canonical current authorities

| Concern | Canonical current authority |
|---|---|
| Listing route | `client/src/App.tsx` |
| Active wizard | `client/src/components/listing-wizard/ListingWizard.tsx` |
| Wizard state | `client/src/hooks/useListingWizard.ts` |
| Listing procedures | `server/listingRouter.ts` |
| Listing persistence | `server/db.ts` |
| Listing schema | `drizzle/schema/listings.ts` |
| Publication entitlement | `server/services/listingPublicationEntitlementService.ts` |
| Public lead endpoint | `server/leadsRouter.ts` |
| Canonical public lead routing | `server/services/publicLeadCaptureService.ts` |
| Listing-to-public identity | `server/services/inventoryLinkResolver.ts` |
| Agency operating workspace | `server/agencyRouter.ts` |
| Independent-agent legacy/current workspace | `server/agentRouter.ts` |
| Agency frontend data composition | `client/src/features/agency/workspace/useAgencyWorkspaceData.ts` |
| Agency leads UI | `client/src/features/agency/leads/AgencyLeadsWorkspace.tsx` |
| Agency viewings UI | `client/src/features/agency/viewings/AgencyViewingsWorkspace.tsx` |

### 5.2 Competing authority requiring convergence

`server/agencyRouter.ts` and `server/agentRouter.ts` both expose actively used lead, follow-up and viewing/showing mutations.

This is not harmless duplication. It creates two transition authorities over the same commercial records.

The target is one canonical service layer with:

- shared transition rules;
- shared idempotency;
- shared activity-history semantics;
- shared first-response handling;
- shared viewing state machine;
- separate agency and independent-agent access scopes at router boundaries.

### 5.3 Historical reference authorities

| Historical source | Safe use |
|---|---|
| ILE V2 | Draft behaviour, server identity, hydration, workflow contracts, tests |
| Listing Wizard Overhaul | Selective step UX and validation ideas |
| DLE recovery evidence | Behavioural acceptance scenarios |
| Development lead-routing engine | Later development-matching workstream |
| Dirty overhaul media/preview | Design incubation only |

---

## 6. Access, roles and authoring entitlement

### 6.1 Current role middleware exists

`server/_core/trpc.ts` defines:

- `superAdminProcedure`;
- `agencyAdminProcedure`;
- `agentProcedure`.

`agentProcedure` uses the current `requireAgent` middleware and is therefore available as a stronger authoring boundary.

### 6.2 Listing router uses only authentication

`server/listingRouter.ts` imports and uses `protectedProcedure` for all major listing procedures, including:

- `create`;
- `update`;
- `getById`;
- `myListings`;
- `archive`;
- `delete`;
- `uploadMedia`;
- `getAnalytics`;
- `getLeads`;
- `getSubmissionPreflight`;
- `submitForReview`.

Authentication alone does not establish that the user is an agent, agency administrator or super administrator.

### 6.3 Frontend route is not role guarded

`client/src/App.tsx` mounts:

```tsx
<Route path="/listings/create" component={ListingWizard} />
```

without the `RequireRole` pattern used for agency routes.

### 6.4 Preflight does not prove authoring entitlement

`server/listingRouter.ts:getSubmissionPreflight` checks for a WhatsApp-capable contact number and returns `canStartListing` based on blockers.

It does not establish current user role, agency membership, approved agent profile or supported independent-agent authority.

### 6.5 Required invariant

Only the following should enter canonical single-property authoring:

- approved independent agent;
- approved agency agent;
- agency administrator acting within their agency;
- super administrator through explicit administrative authority.

A property developer or ordinary prospect must not gain listing-authoring authority merely by being authenticated and having a phone number.

---

## 7. Draft persistence and resume truth

### 7.1 Current launch wizard is not durably saving

The active wizard presents a Save Draft operation but uses simulated/browser-local persistence.

The user-facing states imply durable server saving even when:

- no canonical `listing.saveDraft` procedure exists;
- no canonical `listing.getDraft` procedure exists;
- `drizzle/schema/listings.ts` has no `draftData` or `draft_data` field;
- current `server/listingRouter.ts` has no draft procedure implementation.

### 7.2 Orphaned payload adapter exists

`client/src/lib/workflows/listing/listingDraftPayload.ts` contains:

- `buildSaveDraftPayloadFromWizardState`;
- `hydrateStateFromDraftResponse`;
- a stable `serverDraftId`;
- assumptions about `draftData`.

The adapter is not proof of a working backend. It targets an authority absent from current router and schema.

### 7.3 Historical V2 portability

ILE V2 added:

```ts
draftData: json('draft_data')
```

and a migration equivalent to:

```sql
ALTER TABLE `listings`
  ADD COLUMN `draft_data` json NULL;
```

It also contains save, retrieve, list and delete draft operations and frontend hydration.

The concept is portable. The historical implementation is not.

### 7.4 Historical implementation gaps

The old V2 draft implementation must be reworked because it predates current:

- role middleware;
- agency membership authority;
- AALC publication authority;
- current migration authority;
- current ownership and attribution contracts;
- current listing lifecycle tests.

The old contract test mocks database operations and does not prove current production-database behaviour.

### 7.5 Target draft model

Server draft becomes source of truth.

Browser storage may remain only as:

- short-lived crash recovery;
- unsynced-change recovery;
- a warning surface when server persistence fails.

It must never be described as durable server saving.

---

## 8. Readiness, submission, review and publication state machine

### 8.1 Existing strengths

Current `main` includes:

- listing readiness calculations;
- listing quality calculations;
- server submission checks;
- publication entitlement service;
- listing approval queue;
- listing-to-public property projection;
- lifecycle contract and database tests;
- entitlement tests;
- agency attribution tests.

### 8.2 Published-edit contradiction

`server/listingRouter.ts:update` treats `published` or `approved` listings as requiring review.

It:

1. verifies republish entitlement;
2. writes listing changes;
3. may replace media;
4. calls `db.submitListingForReview`.

`server/db.ts:submitListingForReview` allows submission only from `draft` or `rejected`.

The result can be:

- persisted canonical changes;
- failed submission;
- no valid pending-review transition;
- stale public projection;
- error returned after partial mutation.

This is a verified P1 lifecycle-integrity defect.

### 8.3 Submission is not atomic

`server/db.ts:submitListingForReview`:

1. updates listing status to `pending_review`;
2. retrieves the listing;
3. inserts the approval queue row.

These operations are not shown inside one transaction.

A queue insertion failure can strand a pending listing without a review item.

### 8.4 Approval and rejection boundaries

The evidence indicates multiple state-changing steps around:

- canonical listing status;
- approval queue;
- public property projection;
- public media projection;
- review metadata.

These transitions require explicit transactional boundaries or compensating containment.

### 8.5 Create then submit retry identity

The current browser flow performs:

```text
listing.create
→ listing.submitForReview
```

as two operations.

If create succeeds and submit fails, retry can execute create again because the server listing ID is not retained as the active draft identity.

The target invariant is:

> Once a server listing ID exists, every subsequent save, retry or submit operates on that same ID.

---

## 9. Listing ownership, agency attribution and cross-agency containment

### 9.1 Existing ownership strengths

Current `main` includes checks for:

- listing owner access;
- seller-prospect agency consistency;
- approved assigned agent;
- agency membership;
- public property source-listing identity;
- agency listing attribution;
- lead visibility;
- media reconciliation.

### 9.2 Effective-agent persistence defect

`server/db.ts:createListing` calculates:

```ts
const effectiveAgentId =
  sellerProspectConversion?.assignedAgentId ?? agentId;
```

It validates and logs `effectiveAgentId`, but inserts:

```ts
agentId: agentId
```

instead of the validated effective assignment.

This can discard the responsible agent when an agency administrator converts a seller prospect.

Impact:

- incorrect listing attribution;
- incorrect enquiry recipient;
- broken agent inventory;
- broken lead ownership and follow-up;
- inaccurate agency performance.

### 9.3 Cross-agency invariant

No listing, media, lead, viewing or seller-prospect conversion may cross agency boundaries because of:

- a client-supplied agent ID;
- an optional listing ID;
- an inherited user role;
- an outdated seller assignment;
- an agency administrator acting outside their agency.

---

## 10. Public enquiry capture and canonical recipient resolution

### 10.1 Current public endpoint

`server/leadsRouter.ts:create` is a public procedure with:

- schema validation;
- honeypot containment;
- process-local IP rate limiting;
- request metadata;
- canonical handoff to `capturePublicLead`.

### 10.2 Canonical ownership resolution

`server/services/publicLeadCaptureService.ts` and related resolver authority derive ownership from canonical inventory rather than trusting client-supplied agent or agency identity.

Evidence covers:

- canonical property ownership;
- canonical development ownership;
- rejection of unavailable inventory;
- agency attribution;
- source and UTM context;
- affordability context;
- unit context;
- anti-spoofing behaviour.

### 10.3 Delivery truth

What is proven:

- durable CRM lead persistence;
- canonical recipient fields;
- agency and agent workspace visibility;
- downstream viewing and My Day operations.

What is not proven:

- immediate email delivery;
- immediate SMS delivery;
- immediate WhatsApp delivery;
- real-time push notification delivery for ordinary property enquiries.

Product copy and settings must not imply those channels until they are implemented and verified.

---

## 11. Lead workspace, follow-up, viewing and My Day closure

### 11.1 Agency lead workspace

`server/agencyRouter.ts` includes:

- `getLeads`;
- `updateLeadStatus`;
- `getLeadDetail`;
- `addLeadNote`;
- `recordLeadContactAttempt`;
- `setLeadFollowUp`;
- `completeLeadFollowUp`;
- `scheduleLeadViewing`.

Agency lead queries are tenant scoped. Ordinary agency agents are filtered to their assigned records, while manager authority is broader.

### 11.2 Structured contact and next action

The newer agency flow includes:

- first-response timestamps;
- activity history;
- structured contact attempts;
- next-action expectations;
- follow-up scheduling;
- escalation and overdue signals.

Some operations already use transactions; others still update current state and history separately.

### 11.3 Viewing authority

`server/agencyRouter.ts` includes:

- `getViewings`;
- `getViewingDetail`;
- `createViewing`;
- `updateViewingStatus`;
- `rescheduleViewing`;
- `reassignViewing`;
- `submitViewingFeedback`.

The newer workflow uses the canonical `showings` table and includes transition validation, activity records and deduplicated in-app viewing notifications.

### 11.4 Viewing mutation containment

The shown mutation boundary proves agency tenancy but does not clearly prove that every mutation is restricted to:

- the assigned agent; or
- an agency manager.

Required launch rule:

```text
agency manager
  may manage all agency viewings

assigned agent
  may manage their assigned viewings

other agency agents
  no mutation authority
```

Agency-wide read visibility can remain a separate product decision.

### 11.5 My Day

`server/agencyRouter.ts:getMyDay` aggregates:

- overdue lead follow-ups;
- due-today follow-ups;
- first-response breaches;
- urgent and unassigned leads;
- today’s viewings;
- upcoming viewings;
- unconfirmed viewings;
- viewing feedback required;
- incomplete listings;
- offer and transaction deadlines;
- seller-prospect follow-ups.

This is a substantial operating foundation and should be preserved.

---

## 12. Navigation and workspace convergence

### 12.1 Active routes

Current frontend routes include both:

- agency operating workspaces;
- independent-agent lead and showing pages.

### 12.2 Active frontend usage

The agency frontend calls `trpc.agency.*`.

Older and independent-agent pages call `trpc.agent.*`, including lead pipeline, follow-up, lead activity and showing operations.

### 12.3 Convergence rule

Do not delete the independent-agent experience.

Converge authority below the routers:

```text
canonical lead service
canonical viewing service
canonical activity/history service
canonical next-action rules
canonical state transitions
         ↑
agency router access scope
independent-agent router access scope
```

Frontend migration can be incremental after service authority is unified.

---

## 13. Database and migration implications

### 13.1 Draft schema change is required

Current canonical `drizzle/schema/listings.ts` has no `draft_data` field.

Durable draft work therefore requires:

- canonical schema decision;
- migration allocation;
- database-backed tests;
- rollback or containment plan;
- staging verification before production.

### 13.2 Historical migration cannot be reused directly

The old V2 migration identity and sequence are not current authority.

Do not copy:

```text
drizzle/migrations/0008_30009_add_listings_draft_data.sql
```

as a current migration.

### 13.3 Migration collision exists

Another active worktree contains an uncommitted:

```text
server/migrations/0001_fixed_term_billing_authority.sql
```

PXF-S2 must not independently invent `0001` or any other migration identity.

The database-authority process must allocate and reconcile the migration.

### 13.4 Transaction boundaries required

The following need transaction review or explicit compensation:

- submit plus queue insertion;
- approve plus public projection;
- reject plus queue update;
- hard deletion;
- archive plus public mirror archive;
- lead status plus activity history;
- follow-up update plus history;
- viewing state plus activity and notification;
- durable draft create/update plus media association.

### 13.5 No destructive migration in audit worktree

The audit worktree is documentation authority only.

Implementation must occur in a new dedicated worktree from latest `origin/main`.

---

## 14. Test and acceptance-evidence inventory

### 14.1 Current-main strengths

Material current tests include:

- `server/__tests__/contract.listing-lifecycle.test.ts`;
- `server/__tests__/contract.listing-lifecycle-db.test.ts`;
- `server/__tests__/integration.agency-listing-attribution.test.ts`;
- `server/services/__tests__/listingPublicationEntitlementService.test.ts`;
- `server/__tests__/contract.listing-publication-entitlement.test.ts`;
- `server/__tests__/contract.agency-listing-inventory.test.ts`;
- `server/services/__tests__/publicLeadCaptureService.contract.test.ts`;
- `server/__tests__/contract.property-search-detail-lead-ownership.test.ts`;
- `server/__tests__/contract.agency-lead-visibility-followup.test.ts`;
- `server/__tests__/contract.agency-viewings-workflow.test.ts`;
- `server/__tests__/integration.agency-viewings-workflow.test.ts`;
- `server/__tests__/agent.showings-compatibility.test.ts`;
- `server/__tests__/agent.dashboard-showings.smoke.test.ts`;
- `server/__tests__/integration.listing-media-reconciliation.test.ts`.

### 14.2 Historical V2 evidence

Historical V2 provides useful tests for:

- wizard context;
- workflow engine;
- payload contracts;
- validation;
- readiness;
- draft payload;
- draft router contract;
- draft status and hydration.

These are references for porting, not proof against current schema and roles.

### 14.3 DLE behavioural evidence

Historical DLE evidence provides acceptance scenarios for:

- login to create;
- manual save;
- resume;
- one draft identity;
- review readiness;
- publication;
- public rendering;
- lead context;
- no false success after failed operations.

These scenarios should be translated into current single-property tests where relevant.

### 14.4 Missing closure evidence

Before launch closure, add evidence for:

- unsupported-role rejection;
- route guard behaviour;
- analytics cross-user denial;
- media upload cross-user denial;
- draft cross-user and cross-agency denial;
- draft database persistence;
- create/submit retry idempotency;
- transactional submit plus queue;
- published edit revision behaviour;
- effective assigned-agent persistence;
- assigned-agent viewing mutation boundaries;
- truthful new-lead in-app delivery;
- hard-delete containment.

---

## 15. P0–P3 finding register

### 15.1 P0

| ID | Finding | Evidence | Why it matters | Smallest safe correction |
|---|---|---|---|---|
| P0-01 | Ordinary owner can invoke non-transactional hard deletion | **Verified** — `server/listingRouter.ts:delete`; `server/db.ts:deleteListing` | Can destroy listing media, review records, analytics, leads and viewings with partial-failure risk | Remove ordinary-owner hard delete; use archive for customers; restrict hard delete to draft-only transactional deletion or super-admin break-glass |

### 15.2 P1

| ID | Finding | Evidence | Why it matters | Smallest safe correction |
|---|---|---|---|---|
| P1-01 | Unsupported authenticated roles can enter listing authoring APIs | **Verified** — `server/listingRouter.ts` uses `protectedProcedure`; `client/src/App.tsx` route has no role guard | Unauthorized product access and invalid ownership records | Use current role-aware procedure and matching route guard |
| P1-02 | Listing analytics lacks ownership verification | **Verified** — `server/listingRouter.ts:getAnalytics` | Cross-customer analytics disclosure | Require owner, assigned agent, agency manager or super admin |
| P1-03 | Media upload lacks listing ownership verification | **Verified** — `server/listingRouter.ts:uploadMedia` | Storage abuse and cross-listing namespace risk | Validate role, listing existence, ownership/agency scope and upload intent |
| P1-04 | Seller-conversion effective agent is validated but not persisted | **Verified** — `server/db.ts:createListing` | Breaks listing attribution, enquiry delivery and agent inventory | Persist `effectiveAgentId` and add regression tests |
| P1-05 | Published edits write before an invalid review transition | **Verified** — `listing.update`; `submitListingForReview` | Partial write, stale public mirror, no review item | Introduce explicit revision/pending-change model or transactional review-safe update |
| P1-06 | Create/submit retry can duplicate listings | **Verified design risk** — active wizard uses separate create and submit without retaining server identity | Duplicate records and stranded drafts | Retain server listing ID and make retry update/resubmit the same listing |
| P1-07 | Listing lifecycle transitions are non-atomic | **Verified** — submit then queue insert and other multi-write helpers | Stranded or contradictory lifecycle records | Transactional state transitions with idempotent queue/projection handling |
| P1-08 | Save Draft messaging falsely implies durable persistence | **Verified** — active wizard and absent backend/schema | User data-loss risk and false success | Add server draft authority; make states truthful; local storage only recovery |
| P1-09 | `agencyRouter` and `agentRouter` both own lead/viewing transitions | **Verified** — both actively used | Divergent rules, duplicate fixes and inconsistent My Day | Extract shared canonical service layer |
| P1-10 | Viewing mutations are not clearly assigned-agent/manager scoped | **Verified gap / containment required** — agency tenancy is proven, actor-specific mutation scope is not | One agency agent may alter another agent’s appointment | Manager-or-assigned-agent mutation rule |
| P1-11 | New-lead delivery claims exceed proven implementation | **Verified gap** — CRM/workspace persistence proven; external delivery not proven | Leads may be captured without prompt operational awareness | Create truthful in-app notification or attention item; remove unsupported channel claims |

### 15.3 P2

| ID | Finding | Evidence | Smallest safe correction |
|---|---|---|---|
| P2-01 | Public lead rate limiter is process local | **Verified** — in-memory map in `server/leadsRouter.ts` | Move to shared store when scaling or abuse warrants |
| P2-02 | Public lead submission lacks demonstrated idempotency/deduplication | **Unverified capability / likely gap** | Add request key or bounded duplicate suppression |
| P2-03 | Some lead state and activity-history writes are not atomic | **Verified in selected operations** | Use transactional service operations |
| P2-04 | V2 workflow shell lacks current create/edit/submit parity | **Verified** | Keep inactive until parity suite passes |
| P2-05 | Browser-local recovery and server-draft reconciliation policy is undefined | **Verified gap** | Define conflict and unsynced-change handling |
| P2-06 | Agency and independent-agent frontend convergence remains incomplete | **Verified** | Migrate incrementally after service convergence |

### 15.4 P3

| ID | Finding | Disposition |
|---|---|---|
| P3-01 | Rich media/cropping/preview incubation is incomplete | Post-foundation |
| P3-02 | SEO scoring and search-console concepts are unverified | Post-launch |
| P3-03 | Historical branch and worktree retirement | Deferred unless a demonstrated launch risk exists |
| P3-04 | Full V2 visual redesign | Customer-evidence-driven post-foundation work |
| P3-05 | Development lead-routing engine convergence | Separate workstream |

### 15.5 Severity count

- P0: **1**
- P1: **11**
- P2: **6**
- P3: **5**

---

## 16. Launch-critical correction scope

The launch-critical correction boundary is intentionally narrower than “finish V2.”

Must be corrected before a safe launch candidate:

- P0-01;
- P1-01 through P1-08;
- P1-10;
- a truthful minimum for P1-11.

P1-09 service convergence may be delivered in bounded stages if:

- both routers temporarily call the same canonical transition services;
- no frontend is removed prematurely;
- shared rules are covered by focused tests.

The P2 and P3 findings do not automatically block launch.

---

## 17. Smallest implementation sequence

### PXF-S2A0-1 — Listing safety and lifecycle containment

Outcome:

> Current `/listings/create` remains available only to supported publishers, destructive operations are contained, ownership gaps are closed and lifecycle retries/transitions preserve one canonical listing identity.

Required work:

1. authoring procedure and route role guard;
2. role-aware preflight;
3. analytics authorization;
4. media upload authorization;
5. hard-delete containment;
6. transactional deletion if retained;
7. `effectiveAgentId` persistence;
8. published-edit revision correction;
9. transactional submission and queue insertion;
10. stable listing ID after create;
11. retry-safe submit;
12. focused contract and database tests.

Do not add draft schema in this slice unless database authority explicitly combines it.

### PXF-S2A0-2 — Lead/viewing authority and delivery containment

Outcome:

> Agency and independent-agent surfaces use one lead/viewing transition authority, mutation scope is explicit and newly captured leads create truthful operational attention.

Required work:

1. extract canonical lead transition service;
2. extract canonical viewing transition service;
3. manager-or-assigned-agent mutation checks;
4. transactional lead state and activity history;
5. truthful in-app new-lead notification or attention item;
6. preserve current agency and independent-agent access scopes;
7. migrate router procedures incrementally;
8. focused compatibility tests.

### PXF-S2A — Durable draft authority

Outcome:

> Partial single-property listings are durably saved, owner scoped, agency contained and recoverable by stable server identity.

Required work:

1. database-authority migration allocation;
2. canonical draft representation;
3. create/update/get/list/delete procedures;
4. current role enforcement;
5. owner and agency boundaries;
6. draft-only mutation and deletion;
7. database-backed tests;
8. migration verification and rollback/containment evidence.

### PXF-S2B — Current wizard durable-draft wiring

Outcome:

> The existing launch wizard saves and resumes the canonical server draft without false success.

Required work:

1. stable server draft/listing ID;
2. manual save;
3. URL-based resume;
4. hydration;
5. truthful saving/saved/error states;
6. local recovery cache only;
7. unsynced-change warning;
8. logout and cross-user isolation;
9. retry-safe submit.

### PXF-S2C — Workflow-shell convergence

Outcome:

> The stronger workflow contracts are integrated without regressing current submission, publication, media, agency attribution or editing.

Required parity:

- create;
- edit;
- durable draft;
- submit;
- readiness;
- media;
- seller-prospect conversion;
- agency attribution;
- published-edit revision;
- route guards;
- failure recovery.

Keep behind a feature flag until acceptance evidence passes.

### PXF-S2D — Selective UX improvements

Evaluate and rebuild only the useful overhaul concepts:

- clearer Action and Property Type selection;
- improved Basic Information;
- improved Additional Information;
- validation presentation;
- step progress;
- media and preview against real current APIs.

Do not import simulated media, local-only virtual tours, placeholder cropping or unsupported performance claims.

---

## 18. Deferred post-launch work

Deferred unless new evidence raises severity:

- complete V2 visual migration;
- advanced media editing;
- SEO scoring automation;
- Search Console indexing automation;
- development lead-matching engine;
- broad worktree cleanup;
- branch retirement;
- full router removal after compatibility migration;
- email, SMS or WhatsApp lead delivery;
- distributed rate limiting;
- sophisticated lead deduplication;
- predictive lead scoring.

---

## 19. Dependencies, collisions and prohibited actions

### 19.1 Dependencies

- Database Authority must allocate any draft migration.
- Current auth and role authority must remain canonical.
- Current publication entitlement must remain canonical.
- Agency membership and listing attribution contracts must remain canonical.
- Current public lead capture must remain canonical.
- Current migration ledger and execution authority must be respected.

### 19.2 Known collision

An active worktree contains an uncommitted fixed-term billing migration named `0001_fixed_term_billing_authority.sql`.

No PXF-S2 migration number may be invented independently.

### 19.3 Prohibited actions

Do not:

- implement in the control worktree;
- implement in the audit worktree;
- merge ILE V2 wholesale;
- merge Listing Wizard Overhaul wholesale;
- cherry-pick old migrations;
- activate `/listings/create-v2`;
- delete or clean dirty historical worktrees;
- rewrite Git history;
- delete branches or worktrees;
- execute a migration without explicit database-authority approval;
- remove independent-agent routes before compatibility evidence;
- claim external lead delivery without proof.

---

## 20. Acceptance evidence required for closure

### 20.1 PXF-S2A0-1

- unsupported prospect and developer roles denied;
- approved agent and agency administrator accepted;
- analytics IDOR test passes;
- media cross-owner test passes;
- published listing cannot be owner-hard-deleted;
- permitted deletion is transactional;
- effective assigned agent persists;
- published edit creates a coherent review state without partial public mutation;
- submit plus queue insertion is atomic;
- retry after submit failure creates no duplicate listing;
- current listing and publication test suite passes.

### 20.2 PXF-S2A0-2

- agency agent sees only permitted leads;
- manager sees agency scope;
- independent agent retains supported scope;
- non-assigned agency agent cannot mutate another agent’s viewing;
- manager can reassign;
- assigned agent can update;
- lead status and activity history commit together;
- new public lead produces a truthful in-app attention signal;
- agency and agent compatibility tests pass;
- My Day remains consistent.

### 20.3 PXF-S2A

- migration allocated and verified;
- partial draft inserts against real test database;
- update preserves same draft identity;
- cross-user access denied;
- cross-agency access denied;
- non-draft mutation denied;
- deletion rules enforced;
- draft list ownership correct;
- rollback or containment procedure recorded.

### 20.4 PXF-S2B

- manual save reaches server;
- resume restores the same draft;
- network failure never shows Saved;
- local cache is visibly unsynced;
- retry does not create another record;
- logout prevents another user from hydrating the draft;
- create/edit/submit parity remains intact.

### 20.5 PXF-S2C

- feature-flagged route only;
- full parity matrix passes;
- no attribution regression;
- no publication regression;
- no media regression;
- no lead-routing regression;
- browser acceptance evidence captured;
- rollback is immediate through feature flag.

---

## 21. Founder decisions and recommended defaults

| Decision | Recommended default |
|---|---|
| Customer hard deletion | No; archive only |
| Draft hard deletion | Allowed only while status is draft and inside a transaction |
| Super-admin hard deletion | Break-glass only with audit event |
| Supported listing authors | Agent, agency administrator, super administrator |
| Property developer access to single-property wizard | Denied unless explicitly granted a supported publisher role |
| Server draft source of truth | Yes |
| Browser local storage | Recovery cache only |
| V2 route activation | No |
| Historical branch merge | No |
| Lead delivery launch minimum | Durable CRM record plus truthful in-app attention |
| Email/WhatsApp launch promise | No until implemented and verified |
| Viewing mutation scope | Assigned agent or agency manager |
| Independent-agent support | Preserve |
| Router convergence | Shared services first, frontend migration later |
| Migration identity | Allocated by Database Authority |
| Audit expansion | Stop; move to bounded implementation |

---

## 22. Final verdict

### **Proceed with containment**

Property Listify should not replace the current listing engine or wait for a theoretically complete V2.

The current platform already contains:

- a meaningful listing lifecycle;
- publication entitlement;
- public property projection;
- canonical lead capture;
- anti-spoofing recipient resolution;
- agency lead operations;
- viewings;
- follow-up;
- My Day;
- substantial contract and integration tests.

The launch candidate is blocked by one destructive-operation P0 and the P1 findings required for safe authoring, lifecycle integrity, draft truth, attribution and viewing/lead containment.

The next implementation workstream is:

```text
PXF-S2A0-1 — Listing safety and lifecycle containment
```

It must start in a new dedicated worktree from the latest `origin/main`.

No further broad reconciliation is required before that workstream.
