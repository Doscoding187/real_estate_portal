# Private-owner MVP — ordered implementation batches

**Version:** 0.1 — 13 October 2026, aligned to `origin/main` at `c475ed7249c3cc263a7554deb274e8d5bfd76dd0`. Companion: [validated contract](mvp-product-architecture-contract.md), [capability and lifecycle mapping](capability-and-lifecycle-mapping.md), [decision record](founder-decision-record.md).

**Status:** planning only. No batch below is authorised to begin by this document; each requires its named decisions resolved (decision record "Immediate decision list") and its own reviewable implementation workstream. Batches are ordered by verified dependency: owner commercial context must exist before entitlement (mapping §2.4), entitlement before publication (mapping §2.3), publication before enquiry custody of public inventory (mapping §2.6), and enquiry/publication before sold marketing fulfilment evidence (mapping §1). Owner-specific requirements are kept separate from the existing professional-launch gates: the three professional Launch Access product keys (`shared/commercialActivation.ts:1-6`) and their activation state (`:46-52`) are not modified by owner work; an owner product is a separate key and a separate release decision.

Each batch is small enough to review, test and land independently. Schema-bearing work inside any batch follows the Database Authority workflow (dedicated branch/worktree, policy/exception register read, model + migration + inventory + consumers authored together) — "necessary data changes" below are design requirements, not prescriptions.

## Batch 1 — Owner context, permissions and private preparation

**Customer outcome:** an authenticated private owner can open an owner surface, author/edit their own private draft (fields, media, location), see preparation guidance, submit a right-to-advertise declaration with private evidence, and safely switch accounts — with zero payment or publication capability.

**Likely files and reusable components/services:**

- Reuse as-is: `server/services/listingContentCustody.ts` (personal-draft custody already resolves for unattributed listings, `:69-72`); `server/listingRouter.ts` create/edit procedures (role-agnostic, `:510-514`); `server/services/listingMediaAuthority.ts` media tokens; `client/src/hooks/useListingWizard.ts` (owner-scoped persistence and account-change clearing, `:122-168, 822-837`).
- Extend: an owner entry route/surface (client), reusing the wizard shell; the preparation `/advertise` owner panel (`client/src/pages/AdvertiseWithUs.tsx:320-350`) becomes the honest entry point as routes open.
- Add: explicit private-owner commercial-context resolution (the design output approved after D01/D04) so later gates can resolve an owner commercial owner distinct from `agency`/`independent_agent` (`server/services/listingPublicationEntitlementService.ts:69-71` is the extension point); declaration/evidence storage reusing the private-document pattern (`server/services/billingProofStorage.ts` precedent; `billing_payment_documents` visibility model at `drizzle/schema/billing.ts:278-310`).

**Necessary data or permission changes:** minimal canonical representation of owner commercial context + right-to-advertise evidence linkage (Database Authority workstream). No new user role; no change to `users.role` usage; no publication or billing paths enabled.

**Dependencies and unresolved decisions:** D01 (pilot cohort and multi-persona eligibility), D04 (evidence checklist, declaration wording, privacy of evidence). Independently startable with a placeholder cohort per the decision packet.

**Focused acceptance criteria and tests:** owner A creates/edits/reloads a draft with media; owner B cannot read/edit A's draft (404/403, not leaked existence); an `agent` account's personal draft stays private and agency inventory is untouched; account switch clears hydrated draft state; media reservation belongs to the authorised owner; declaration/evidence stored privately and never exposed in any public DTO; no payment/publication route becomes reachable.

**Risk and estimated effort:** low–medium risk (reuses proven custody; the new context resolution is the only design-heavy piece). Roughly 2–4 engineering days including focused tests in an owned disposable database target.

## Batch 2 — Approved commercial package and payment/entitlement lifecycle

**Customer outcome:** an entitled owner can request the approved starter package, receive a correct invoice with payment instructions, upload proof, and have finance verification establish exactly the scoped commercial right — with duplicate/partial/unmatched handled by recorded dispositions.

**Likely files and reusable components/services:**

- Reuse: the manual-EFT loop in `server/services/billingFoundationService.ts` (typed principal admission `:423-470`, invoice issuance with activation/sales gates `:1072-1092`, once-off non-renewing term enforcement `:1031-1065`); private proof documents (`server/services/billingProofStorage.ts`); payment state machine and idempotency (`drizzle/schema/billing.ts:224-276`); finance-role checks (`billingFoundationService.ts:143, 224-226`); blocked review decisions (`:137-142`).
- Extend: owner principal resolution (the Batch 1 context) into the billing owner allow-list (`billingFoundationService.ts:49-64`) and `resolveLaunchBillingOwner` (`:913-987`) as a distinct owner product path; an owner product key added to the commercial activation allow-list as a **separate** key (`shared/commercialActivation.ts:1-6` pattern) — professional keys and their state stay untouched.

**Necessary data or permission changes:** owner billable principal representation (Database Authority workstream; must preserve the exactly-one-owner invariant intent of `billable_accounts`' CHECK at `billing.ts:116-121` for the new kind rather than weakening it); per-property owner package entitlement model; owner product plan/catalog entry.

**Dependencies and unresolved decisions:** D03 (price, term, payment timing, remedies), D06 (viability), plus Batch 1 context. Nothing may be invoiced before D03; engineering can proceed against a disabled owner key (the activation gate pattern supports a disabled product, `shared/commercialActivation.ts:37-52`).

**Focused acceptance criteria and tests:** owner invoice requested/issued with exact terms; wrong-owner proof rejected; finance `super_admin` verification transitions `submitted → under_review → verified`; duplicate payment idempotent; partial/unmatched produce recorded dispositions without entitlement; paid-but-rejected inventory remains private with the D03 remedy available; professional Launch Access journeys regression-tested and unchanged.

**Risk and estimated effort:** medium (money path; multi-persona principal design must not break `uq_billable_accounts_user` uniqueness semantics). Roughly 3–5 engineering days with focused tests; requires the architecture reviewer's approved principal design first.

## Batch 3 — Reviewed publication, public identity and enquiry custody

**Customer outcome:** an entitled, reviewed owner listing publishes through the governed command path with a truthful owner public identity, appears in search/PDP, receives buyer enquiries into the owner's own custody/inbox with verified delivery, and withdraws/expires safely.

**Likely files and reusable components/services:**

- Reuse: entitlement assertion hook (`server/services/listingPublicationEntitlementService.ts:737-789` — extend the commercial-owner resolution to the owner kind); review queue (`drizzle/schema/listings.ts:166-182`); public eligibility pipeline (`server/services/publicPropertyEligibilityService.ts:185-424, 768-829`); lead capture (`server/services/publicLeadCaptureService.ts`) and delivery (`server/services/leadDeliveryService.ts`) including worker primitives; Shared Living owner-inbox precedent (`recipientUserId` + `manual` recipient + durable context boundary — `publicLeadCaptureService.ts:744-771`; `leadDeliveryService.ts:226-257`); session revocation for inbox access (`server/_core/auth.ts:224`).
- Extend: owner public-identity shape (provenance/contact representation — no owner shape exists today, mapping §1); owner recipient resolution in `server/services/publicLeadCustodyService.ts` (an owner outcome alongside agent/agency/platform); owner-scoped inbox reads.
- Keep: expiry enforced at public-read time (`publicPropertyEligibilityService.ts:768-829`) so a stopped scheduler cannot preserve visibility.

**Necessary data or permission changes:** owner recipient/purpose/source semantics in the lead-delivery authority (Database Authority workstream for any enum/typing change; `lead_deliveries.recipientType` today has no owner value, `drizzle/schema/leads.ts:160`); owner public-identity fields on the eligible supply DTO; owner package term evaluated at read.

**Dependencies and unresolved decisions:** Batches 1–2; D01 (public identity honesty rules), D04 (public contact exposure — WhatsApp/address). No owner publication before the owner product key is enabled as its own release decision.

**Focused acceptance criteria and tests:** consumer-owned listing publishes only through the governed path with entitlement + review passed; rejected/unpaid/expired/withdrawn variants stay out of search/PDP/enquiry acquisition; owner identity shown truthfully (no agency misattribution); enquiry reaches exactly the owner's inbox; duplicate retry returns the same obligation; worker restart/lease expiry yields `unknown` + reconciliation (never auto-resend); wrong-owner inbox read rejected; revoked session loses access; existing professional enquiry journeys regression-tested.

**Risk and estimated effort:** medium–high (touches the shared public pipeline; fail-closed behaviour must be preserved). Roughly 4–6 engineering days with focused tests and professional-journey regression.

## Batch 4 — Manual marketing fulfilment and attended pilot proof

**Customer outcome:** a consented pilot owner buys the disclosed starter package and receives the exact D02 marketing deliverables, evidenced in an access-controlled operations register; complaints/pauses have a staffed path.

**Likely files and reusable components/services:**

- Add: access-controlled manual marketing operations register (order/listing/revision reference, deliverables, approvals, operator, channel, due/status, delivery evidence link, cost/time, withdrawal action, acceptance/complaint/remedy — contract §5). Non-runtime register: it grants no publication/payment permissions.
- Reuse: notifications for owner milestones (`notifications` — `drizzle/schema/core.ts:137-154`; billing notification precedents at `billingFoundationService.ts:592-713`); transactional email (`server/_core/emailService.ts`) for delivery notices.
- Operational, not code-heavy: named operator, channel capacity, working hours, pause/escalation (D05).

**Necessary data or permission changes:** none to existing runtime permissions; the register is a governed internal surface with scoped access only.

**Dependencies and unresolved decisions:** Batches 1–3 live; D02 (exact deliverables, channel, evidence format), D05 (staffing, hours, pause path), D03 (undelivered-work remedy), D06 (cost model), D07 before any paid activation or referral promise.

**Focused acceptance criteria and tests:** purchased deliverable recorded with operator, channel, rights and approval; completion evidence captured (link/archive); withdrawal invalidates future promotion tasks; complaint path exercises; register access is scoped (no cross-owner reads); no reach/leads promise is displayed anywhere.

**Risk and estimated effort:** low code risk, high operational dependency (staffing). Roughly 1–2 engineering days for the register plus pilot-operation support.

## Batch 5 — Later reporting, enhanced marketing and optional assistance (post-pilot)

**Customer outcome:** owners see sourced reporting (status, term, recorded enquiry/delivery counts, fulfilled marketing tasks with dates/definitions); enhanced marketing packages and optional assisted services become available only with real suppliers and separate approvals.

**Likely files and reusable components/services:** lead delivery outcomes (`leads` delivery projection — `drizzle/schema/leads.ts:132-143`; `leadDeliveryService.ts:527-548`); consent-captured enquiry facts (`leads.ts:124-131`); a future analytics pipeline replacing the non-persisting tracker (`server/routes/analytics.ts:34-60` — do not present its console logs as data); Services V1 directory for optional supplier requests (`drizzle/schema/servicesEngine.ts:246-301`).

**Necessary data or permission changes:** reporting needs event definitions, purpose/consent, identity/bot policy, aggregation and owner-scope checks first (contract §7) — a separate design decision, not a silent extension.

**Dependencies and unresolved decisions:** pilot demand/cost/capacity evidence (D06), enhanced supplier contracts, assisted-service operating and regulatory approval (D07). Not part of the first pilot.

**Focused acceptance criteria and tests:** owner-visible numbers are sourced and defined with "unavailable" where absent; no conversion-rate or guaranteed-lead claims; enhanced packages appear only with evidenced suppliers; assisted promises only after D07-approved process.

**Risk and estimated effort:** deferred; estimate at pilot review.

## Ordering justification and launch separation

The recommended order is preserved because the verified dependencies run strictly forward: publication entitlement cannot resolve an owner before Batch 1's context exists (`listingPublicationEntitlementService.ts:636-730`); billing principals gate invoices (`billingFoundationService.ts:49-64`); public eligibility requires an actionable recipient before enquiries can be owner-delivered (`publicLeadCustodyService.ts:286-418`); and sold marketing deliverables presuppose a published listing (contract §5). Every batch keeps the existing professional launch on its own gate register: professional product keys, prices, entitlement logic and journeys are regression-tested, never modified for owner convenience (contract §10; mapping §2.2 negative cases).
