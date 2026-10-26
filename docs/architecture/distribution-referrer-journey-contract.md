# Distribution Network: Referrer Journey Contract

**Status:** Approved product direction; implementation contract for the Distribution workstream  
**Updated:** 21 October 2026

## Product purpose

The Distribution Network helps an individual or property professional help someone find a suitable property opportunity, prepare an introduction, follow the resulting deal, and understand the referral payout recorded under that opportunity's terms. The referrer does not need property-sales experience.

Property Listify supports discovery, matching, the authorized introduction, and progress visibility. The developer owns development facts, images, phases, inventory, prices, partner-visible contacts, and sales resources. The developer handles its transaction and makes its own sales decisions. Distribution owns referrer identity and access, opportunity programs and terms, referral requirements, intake, assignment, progress, and payout records.

## Three connected records

Keep these concepts connected by identifiers and snapshots, but do not collapse them into one status or record:

1. **Assessment and shortlist:** the person's stated needs, search preferences, calculation assumptions if an approved assessment is available, matched opportunities, and the options presented.
2. **Referral and deal:** the selected opportunity, permission and identity evidence, submitted referral, handover, recorded milestones, responsible party, and outcome.
3. **Referral payout:** the applicable frozen terms, verified eligibility trigger, review and approval, payment reference, and confirmed payment.

Exploring or printing a shortlist is not a referral. Submitting a referral does not mean a viewing is booked, the buyer is approved, a deal is complete, or a payout is earned.

## Journey and acceptance criteria

### 1. Discover opportunities

- A public visitor can explore opportunities that are publicly visible and have current marketable inventory.
- Public discovery and the signed-in catalogue use the shared browse-matching rules for buy/rent mode, listed-price range, area text, and bedroom type.
- Public visibility, current marketability, an active Distribution opportunity, referral-open status, and this referrer's entitlement remain separate checks.
- Partner details appear only after all required gates pass for that actor. Do not show restricted program terms or details to a partner merely because they have a Distribution identity.
- Current sale and rental counts and prices come from the Developer-owned `DevelopmentSalesProjection`. An absent mode is unavailable. Do not infer stock from CRM, program state, referral state, legacy totals, or another mode.

### 2. Prepare a shortlist

- A referrer can select and print or save up to five currently marketable options as a PDF using the browser's print-to-PDF flow.
- A shortlist displays the selected mode, real opportunity details, current projected availability, the time the data was observed, the search preferences, and a clear notice that prices and availability may change.
- Do not put the prospect's income, identity, contact details, or private referral evidence in a general-purpose shortlist.
- A selected public shortlist is saved as a search-only assessment. Signing in claims the anonymous record for the account without changing its selected options or search filters.
- Search-only assessments remain separate from financial check fits. Do not put prospect income, identity, contact details, or calculation assumptions in a search-only record.
- Snapshot the selected market mode, browse filters, matching-policy version, Developer projection revisions, observation times, and selected opportunity facts. Area text remains the referrer's search preference; it does not establish a canonical place or search scope.

### 3. Assess fit

- Purchase affordability uses the current prime rate as its baseline and adds no arbitrary risk margin.
- The purchase check fit is approved and versioned as `prospect_check_fit_v1` under approval reference `EDWARD-CHECKFIT-MODEL-2026-10-21`: the current SARB prime rate from canonical platform settings with no added margin, a 240-month term, and a repayment allowance of 30% of gross income less declared monthly debts. A change to any of those assumptions requires a new policy version.
- The check fit is the first gate of a referral. A referrer who says they have a prospect is asked for the prospect's name and gross monthly income before anything is shared with a developer.
- A joint application is one combined assessment over the combined gross income, with a single allowance, because that is how a lender assesses a joint application. The referrer records both applicants, and the second applicant's consent is still collected from that applicant in the evidence step.
- The check fit is a pre-qualification estimate on the referrer's own statement. It is not a credit decision and it does not verify the prospect. It records the name and income the referrer gave, and nothing is shared with the developer on the strength of it. The information sheet, identity document, and signed consent are collected in the guided referral step that follows.
- A development qualifies when its current entry price is within the estimated purchase price. The referrer is shown each qualifying development with its location, and the developments that are out of reach are kept visible rather than hidden.
- When the prospect reaches no current opportunity, say so plainly. Do not offer a referral, a document request, or a viewing for an opportunity the prospect cannot reach.
- Rental discovery remains available, but rental affordability uses a separate model and stays disabled until its rules are approved.
- Outside the check fit, matching stays browse-only by listed price, area, and bedrooms, and no browse filter is ever presented as a qualification decision.
- Partner cards may show the minimum qualifying income derived from published listed sale prices under the versioned assumptions above. Label it "Minimum qualifying income", state that it is indicative and not a lender decision, and never collect or match on prospect income.
- A referral may be attached to the check fit that qualified it. That attachment is locked to the one referral, and a check fit can only qualify an opportunity it actually measured.

### 4. Prepare and submit a referral

- The prospect first receives the applicable information and permission documents. Distribution collects the required signed permission and identity evidence before collecting the prospect's contact details.
- The referrer is given the prospect documents to download for the opportunity: the information sheet the prospect completes, the permission to share their details, and the privacy notice they must have seen. The download is a copy for the prospect; the signed upload is the evidence of record, and the referral is not submitted until the required evidence is uploaded.
- Requirements and terms are opportunity-specific and are snapshotted for the referral.
- The Distribution terms snapshot records each required document's stable template ID, code, label, required state, and order. Manager checklists, partner deal details, progress counts, and manager queues read those saved requirements rather than the current template configuration.
- Existing version 1 snapshots have no stable template ID. Resolve them only when the saved document code maps to exactly one template for that development; otherwise show the saved requirement as unavailable and keep it blocking. Never substitute today's requirements.
- Submission rechecks the actor's entitlement, active program, campaign visibility, open-for-referral status, and current Developer projection for the selected sale/rent mode.
- The referral stores the selected mode, Developer projection revision and displayed terms, and applicable Distribution terms snapshot.
- Referral consent and identity evidence remain private Distribution records. Developer sales collateral is a different document category.
- Partner-visible development collateral is an admin-uploaded Distribution-owned copy recorded on the development's document configuration. Show a resource only when an active, non-required record has a safe file URL, and describe it as information sharing, not as revocable Developer delivery. Do not write collateral into Developer Engine records or promise withdrawal.
- Distribution must not write inventory. An inventory change goes through a guarded Developer Engine command.

### 5. Follow a deal

Each deal should let its referrer answer: where it stands, what actually happened, what happens next, who is responsible, and what the recorded payout state is. Show only recorded events and verified process updates. A manager's process-step update does not itself change inventory, deal stage, or payout eligibility.

The initial state must mean “referral received.” A viewing status may appear only when a real viewing booking exists. Transaction milestones and referral payout states remain separate. Program-specific process steps are frozen at submission and may be updated only by an authorized manager with an audit event.

### 6. Track referral payouts

- Use **referral payout** in partner-facing language.
- Show potential, pending approval, approved, paid, cancelled, or needs-review states from recorded terms and events.
- Potential is not payable; approval is not payment; only a recorded payment is paid.
- Normal progression to payout-pending and super-admin approval recheck the frozen program milestone and required documents. Unsupported milestones require a documented super-admin confirmation and an audit event.
- Do not show an expected payment date or window until the program has explicit processing terms and the required milestone is verified. Do not infer timing from proximity to a deal stage.

## Current implementation evidence

- Public discovery consumes the Developer projection, and the shared matching helper is used by public and entitled partner catalogues.
- The partner catalogue applies actor-specific program access, projection visibility, marketability, and referral-open checks. Referral submission re-fetches the projection and snapshots its revision, mode, displayed terms, and applicable Distribution terms.
- The payout transition and approval paths check the deal's frozen milestone and required documents; unsupported milestones require a documented administrator override. Payment still requires a real payment reference.
- New referral terms snapshots use version 2 and retain required document template IDs. Missing or invalid snapshots fail closed for checklist edits and payout readiness. The shared migration chain uses `ON DELETE RESTRICT` for the deal-document-to-required-template relationship, so a template with deal-document status rows cannot be hard-deleted; runtime template removal remains deactivation.
- The public shortlist keeps prospect details out and snapshots selected facts from `DevelopmentSalesProjection`. Search-only assessments use `distribution_referrer_search_assessments`, separate from `distribution_prospect_check_fits`. Anonymous continuity tokens are stored as hashes and can transfer record ownership to the signed-in account; the referrer dashboard lists account-owned shortlists, and stored records retain their captured projection revisions. Local browser selection remains available during the same-browser handoff.
- Income-based assessment and matches fail closed. The retired calculator's fixed 11.75% rate, 240-month term, and 30% repayment ratio are no longer callable. Browse-by-listed-price remains available and is not presented as qualification; the approved exception is the indicative minimum qualifying income on partner cards, computed only from published listed prices with the visible canonical assumptions.
- The legacy `affordability_assessments`, `affordability_match_snapshots`, and `qualification_pack_exports` tables are not written by any runtime. The approved check-fit authority is the referrer prospect check fit, which stores its own versioned assumptions and per-opportunity matches. The legacy tables carry no prospect details and their schema disposition stays with the database takeover P6 review; do not revive them as a second check-fit authority.
- A referrer prospect check fit is recorded against the referrer, priced from the canonical prime rate, and matched against the current partner catalogue. The referral carries the qualification basis, and the manager can see the assumptions that produced it.
- Permission and identity evidence are collected before prospect details. Secure storage is connected for partner, manager, and Developer deal-document handling. A manager explicitly delivers a verified deal document to the approved Developer organisation resolved from the development's first-party catalogue publisher; the Developer sees it in an own inbox, downloads the exact file that was delivered, and acknowledges receipt. Each delivery records the delivered file reference, deliveries are versioned per deal document, a superseded version can no longer be downloaded or acknowledged, and acknowledgement does not change verification or payout readiness.
- Partner-visible property information lists admin-uploaded Distribution copies from active developer-resource records with a safe file URL. Entries without an uploaded file, inactive entries, and required application templates are excluded; the flow never reads the Developer Engine's `development_documents` bank.
- New intake-policy drafts start from the canonical default guided-process steps. An administrator edits, reorders, or removes them to match the developer's actual process; a published policy must contain at least one step, and the published version snapshots the steps partners see.
- Opportunity-specific process steps and partner-visible updates are shown on Overview, My Deals, and deal detail. Referral payout states are shown separately and no processing date is promised.
- New deals start in the truthful `referral_received` stage. The deal transitions to `viewing_scheduled` only when a real viewing booking is recorded, and legacy deals without a viewing booking are corrected through the shared migration chain with an audit event.

## Integration dependencies

1. **Affordability model:** the purchase check fit is approved (`EDWARD-CHECKFIT-MODEL-2026-10-21`) and live as the referrer's first gate. The prime rate is read from canonical platform settings, so it must be kept current against authoritative sources. Rental affordability and any income-based matching outside the check fit stay closed until their own rules are approved.
2. **Durable assessments and shortlists:** the search-only record is represented separately from financial check fits and captures market mode, browse filters, the matching-policy version, Developer projection revisions, observation times, and selected opportunity facts. Public-to-account ownership transfer preserves that record. Financial calculation-policy versions remain in the approved check-fit record; never populate either record with invented financial assumptions. Apply and verify migration `0153_distribution_referrer_search_assessments.sql` through the Database Authority workflow before enabling this runtime path in a deployed environment.
3. **Document delivery:** the authorized Developer recipient, delivery, and acknowledgement path exists for manager-delivered verified deal documents, gated by the `distribution.developerDocumentDelivery` runtime schema capability. Keep partner resource URLs and claims about delivery or revocation disabled: there is no partner-visible delivery record, no withdrawal or revocation path, and no partner-facing delivery state.
4. **Payout timing:** add explicit program processing terms and verified-milestone date calculation only after the commercial rules are agreed and represented in the canonical schema.

The shared Distribution and Developer migration chains are reconciled. Future Distribution migrations follow the serialized manifest review and Database Authority protocol; do not bypass it with schema guessing or runtime fallbacks.
