# DLE Transaction Engine Product Experience Audit

Date: 2026-06-04
Status: Product-visibility slices are now active across wizard guidance, unit preview, public
unit-card merchandising, public action-panel CTAs, lead-dialog copy/context, qualification route
copy/results, and transaction-specific qualification assumptions.

## Standard

The Development Listing Engine is transaction-first.

Sale, Rental, and Auction are separate commercial sub-engines under one shared DLE shell. The
backend already carries meaningful transaction intelligence; the product experience must make that
intelligence visible to developers and buyers.

## Current Experience Summary

What is already strong:

- Project Setup asks for transaction goal early.
- Unit Types already changes pricing fields for sale, rental, and auction.
- Rental and Auction now have browser proof for draft resume, manual save, publish, public page,
  search card, lead context, edit-published ownership, and guarded create/draft autosave.
- Public detail, search cards, unit detail, lead capture, and distribution/referral helpers already
  carry transaction-aware pricing/context in key paths.

What still feels generic:

- The wizard shell still largely reads as a generic step workflow.
- Step titles such as Identity, Location, Media, Unit Types, and Review do not consistently tell the
  developer which commercial engine they are packaging.
- Rental and Auction product language is technically present in forms and outputs, but the packaging
  journey does not yet consistently feel like leasing or auction operations.
- Public merchandising is transaction-aware, but the wizard does not yet preview enough of the
  buyer/renter/bidder-facing result while the developer is entering data.

## First Product-Visibility Slice

Add a shared transaction-engine guidance band to the active wizard shell.

The band should:

- identify the active engine as Sale Engine, Rental Engine, or Auction Engine;
- show transaction-native commercial signals:
  - Sale: price bands, buyer costs, available/reserved stock;
  - Rental: monthly rent ranges, deposit/lease terms, rental availability;
  - Auction: starting bid, auction window, bidder readiness;
- connect the current wizard step to a commercial packaging focus;
- describe the public output in transaction-native language;
- stay lightweight and not alter save, schema, routing, publish, or readiness behavior.

This does not finish the product experience. It creates a visible bridge between the transaction
architecture and the developer packaging flow.

## Second Product-Visibility Slice

Add a transaction-aware public merchandising preview to Unit Types.

The preview should:

- show the developer how a unit card will read before publish;
- use sale-native language for price bands, for-sale availability, and purchase enquiry context;
- use rental-native language for monthly rent, deposit, lease term, rental availability, and rental
  lead context;
- use auction-native language for starting bid, auction window, reserve tracking, lot availability,
  and auction interest context;
- avoid sale-only fallback labels such as `Sold Out` for rental and auction inventory;
- stay presentation-only and not alter save, schema, routing, publish, or readiness behavior.

This improves the showroom layer: the developer can see the commercial buyer/renter/bidder-facing
meaning of the inventory they are entering instead of only managing backend fields.

## Third Product-Visibility Slice

Make public development unit-card availability transaction-aware.

The public unit cards should:

- keep Sale availability language familiar: sold out, only X left, X available, request callback;
- use rental-native language: fully let, rentals available, rental waitlist, rental details;
- use auction-native language: auction closed, lots open, register auction interest;
- show the availability state visibly on the public unit card, not only in helper data;
- keep the existing lead capture path intact so selected unit identity, price context, and
  transaction type still flow into the enquiry.

This makes the public merchandising layer more trustworthy: a renter should not see sale-only
language, and an auction bidder should see auction intent before opening the lead form.

## Fourth Product-Visibility Slice

Make the public action panel transaction-aware.

The conversion panel should:

- keep Sale copy focused on affordability, sales enquiry, and buyer qualification;
- use rental-native copy for rental fit, lease details, rental packs, and leasing-team contact;
- use auction-native copy for bidder readiness, auction packs, auction-team contact, and
  obligation-free auction interest;
- keep the existing lead-dialog and qualification-route behavior intact while improving the words
  buyers, renters, and bidders see before they act;
- avoid generic sale language such as `Contact Sales Team` on Rental and Auction pages where a
  more precise next-step label is available.

This continues moving backend transaction truth into the public conversion layer. The lead path
already carries selected unit and transaction context; the public CTA language now better matches
that context before the form opens.

## Fifth Product-Visibility Slice

Make the public lead dialog transaction-aware.

The lead dialog should:

- preserve transaction type for page-level brochure/contact/qualification leads, even when no unit
  is selected;
- continue using selected-unit transaction context when a unit is selected;
- use sale-native copy for sales team, brochure, pricing, and qualification requests;
- use rental-native copy for leasing team, rental packs, rental details, lease terms, and rental fit;
- use auction-native copy for auction team, auction packs, auction interest, bidder readiness, and
  registration next steps;
- keep existing lead-source identifiers stable while improving the user-facing language and payload
  transaction context.

This closes an important conversion gap: a renter or bidder no longer lands in a generic sales form
after clicking a transaction-native CTA.

## Sixth Product-Visibility Slice

Make the public qualification route transaction-aware.

The qualification route should:

- keep Sale language focused on affordability, qualification, deposits, and sales follow-up;
- use Rental language for rental fit, monthly rent capacity, lease availability, upfront amounts,
  and leasing-team handoff;
- use Auction language for bidder readiness, auction capacity, starting bids, bidder context,
  registration follow-up, and auction-team handoff;
- preserve transaction type in submitted qualification leads, including development-level leads
  where no unit is selected;
- attach selected-unit price labels and transaction type when a unit-specific qualification starts.

This keeps the conversion journey transaction-native after the public page, public action panel, and
lead dialog have already established the correct commercial lane.

## Seventh Product-Visibility Slice

Make qualification assumptions transaction-specific.

The qualification route should:

- keep Sale assumptions clear about bond-term, prime-rate, deposit, and finance approval limits;
- use Rental assumptions that explain rental-fit estimates, lease approval limits, proof-of-income
  expectations, deposit confirmation, and lease documents;
- use Auction assumptions that explain bidder-readiness estimates, registration limits, proof of
  funds, FICA, deposit proof, and auction terms;
- surface the assumptions before submission and near the result so buyers, renters, and bidders
  understand what the check does and does not prove;
- avoid implying that Rental and Auction use the exact same approval model as Sale finance.

This keeps the qualification route commercially honest. It does not yet replace the shared
calculation model with dedicated Rental and Auction rules, but it stops the UI from hiding the
assumptions behind generic affordability language.

## Eighth Product-Visibility Slice

Make public unit-detail availability and action copy transaction-native.

The public unit-detail page should:

- keep Sale unit-detail language focused on availability, sold-out state, affordability, and sales
  enquiry;
- use Rental unit-detail language for rentals available, fully let state, rental packs, rental fit,
  lease terms, and leasing-team contact;
- use Auction unit-detail language for lots open, registration closed, sold/passed-in/withdrawn
  states, bidder packs, bidder readiness, and auction-team contact;
- keep existing lead-dialog context intact while improving the words users see before they act;
- avoid generic `sold out`, `Check affordability`, and sales-team phrasing on Rental and Auction
  unit pages.

This closes a buyer-facing merchandising gap that remained after public development cards and lead
dialogs became transaction-aware: the unit-specific page now speaks the same commercial language as
the transaction engine.

## Ninth Product-Visibility Slice

Make public search/result cards carry transaction-native availability and contact intent.

The public search card should:

- keep Sale cards familiar with available/sold-out inventory and developer contact;
- use Rental card language for rentals available, fully let state, and leasing-team contact;
- use Auction card language for lots open, registration open/closed, active auction, and
  sold/passed-in/withdrawn outcomes;
- carry backend-derived `totalUnits`, `availableUnits`, and `auctionStatus` through the shared
  search-card result contract when available;
- keep existing price labels and unit-route identity intact.

This improves the first buyer-facing touchpoint: search results now preview the same transaction
lane a user will see on the public page, unit card, unit-detail page, and lead form.

## Tenth Product-Visibility Slice

Make grid-mode property cards preserve transaction-native development merchandising.

The public search grid should:

- keep the same Sale, Rental, and Auction inventory labels as list-mode search cards;
- use `Rent from` for Rental development cards and `Bid from` for Auction development cards;
- use `Contact Leasing Team` and `Contact Auction Team` CTAs where the transaction lane requires
  it;
- carry `totalUnits`, `availableUnits`, and `auctionStatus` through
  `searchCardResultToPropertyCardProps`;
- share the same label helpers as list-mode cards so future transaction copy changes do not split
  between views.

This closes the view-switching gap from the prior slice: a buyer should not lose rental or auction
intent just because they switch from list results to grid results.

## Eleventh Product-Visibility Slice

Browser-proof search-result view switching for Sale, Rental, and Auction.

The browser proof now seeds one published development per transaction lane, then verifies:

- Sale search cards keep `From`, available inventory, and `Contact Developer` in list and grid
  modes;
- Rental search cards keep `Rent from`, rental availability, and `Contact Leasing Team` in list and
  grid modes;
- Auction search cards keep `Bid from`, auction registration state, and `Contact Auction Team` in
  list and grid modes;
- the seeded developments satisfy real publish-readiness gates rather than bypassing the packaging
  contract.

This upgrades the previous component proof into browser evidence that buyer-facing search
merchandising survives the actual route, query, rendering, and view-toggle path.

## Twelfth Product-Visibility Slice

Add a transaction-native commercial pack section to the public development page.

The public development detail page now surfaces a concise pack summary before unit inventory:

- Sale uses `Buyer Pack` and frames pricing, available homes, buyer readiness, ownership, and
  brochure access;
- Rental uses `Rental Pack` and frames rent, rental availability, lease signals, renter readiness,
  and rental-pack access;
- Auction uses `Auction Pack` and frames bid guidance, auction status, lots, bidder readiness, and
  auction-pack access.

This makes the public page feel less like a collection of fields and more like a guided commercial
package. It turns backend transaction truth into visible next-step clarity before a buyer, renter,
or bidder reaches the unit carousel or lead form.

## Thirteenth Product-Visibility Slice

Browser-proof the public detail commercial pack for Rental and Auction.

The browser proof now seeds publish-ready Rental and Auction developments through
`developmentService`, opens the real public `/development/:slug` pages, and verifies:

- Rental shows `Rental Pack`, `Lease path at a glance`, rent range, rental availability, deposit
  signal, document availability, `Check Rental Fit`, and `Download Rental Pack`;
- Auction shows `Auction Pack`, `Bidder path at a glance`, starting-bid range, registration/reserve
  signal, lot availability, document availability, `Check Bidder Readiness`, and
  `Download Auction Pack`.

This confirms the new public-detail merchandising section survives the real backend seed, publish,
approval, route rendering, browser-visible text path, and a mobile viewport fit check for the two
transaction lanes that needed to earn more proof.

## Fourteenth Product-Visibility Slice

Browser-proof the wizard transaction-engine guidance band for Rental and Auction draft resume.

The browser proof now resumes real saved Rental and Auction canonical drafts through
`/developer/drafts`, then verifies the active wizard shell shows the correct engine guidance before
publish:

- Rental shows `Rental Engine`, monthly-rent signals, rental public-output language, and the
  review/publish packaging focus;
- Auction shows `Auction Engine`, auction-window signals, auction public-output language, and the
  review/publish packaging focus.

The same browser run continues through manual save, publish, public page, search card, and
transaction-native lead capture. This closes the previous evidence gap where the engine band was
component-proven but not yet proven in the real draft-resume browser path.

## Fifteenth Product-Visibility Slice

Browser-proof the wizard transaction-engine guidance band for Sale draft resume.

The browser proof now seeds a real saved Sale canonical draft, resumes it through
`/developer/drafts`, and verifies the active wizard shell shows:

- `Sale Engine` packaging context;
- sale price bands, buyer costs, and inventory signals;
- sale public-output language for price ranges, unit cards, buyer CTAs, and purchase lead context;
- the `review_publish` packaging focus for readiness, publish safety, and public conversion.

This closes the remaining Sale evidence gap for the wizard engine band, bringing browser-level
proof across Sale, Rental, and Auction resume flows before the next UI/product upgrade slice.

## Sixteenth Product-Visibility Slice

Add live public-preview feedback for wizard identity, highlights, and media.

The wizard shell now shows a `Public preview feedback` panel from canonical wizard data, beside the
transaction-engine guidance. The panel tells developers whether the buyer-facing basics are ready
before publish:

- Identity: development name and market status for public pages and cards;
- Highlights: at least three buyer-facing chips;
- Media: hero media or usable gallery imagery so public surfaces do not launch visually empty.

This turns part of the public merchandising layer into live packaging feedback. Developers can now
see whether the public page, search card, and lead-entry context have enough identity, highlight,
and visual material while they are still building the package, instead of discovering it only at
publish time.

## Seventeenth Product-Visibility Slice

Add Rental-native packaging feedback to the wizard shell.

Rental now gets its own `Rental packaging feedback` panel from canonical unit inventory. The panel
summarizes whether the lease package is ready across:

- rent range;
- deposit expectations;
- lease term;
- furnished/unfurnished state;
- rental availability;
- renter qualification context.

This moves Rental closer to being a real sub-engine rather than a relabelled Sale flow. The browser
proof resumes a saved Rental canonical draft and verifies the real wizard shell shows `6 of 6 ready`
with rent, deposit, lease term, furnished state, availability, and qualification context before the
same run continues through manual save, publish, public merchandising, search, and lead capture.

## Eighteenth Product-Visibility Slice

Add Auction-native packaging feedback to the wizard shell.

Auction now gets its own `Auction packaging feedback` panel from canonical unit inventory and
media documents. The panel summarizes whether the bidder package is ready across:

- starting bid;
- auction window;
- reserve strategy;
- bidder registration lifecycle;
- legal-pack or bidder documents;
- auction urgency from open lots inside a scheduled window.

This moves Auction closer to being a real sub-engine rather than a sale listing with a bid label.
The browser proof resumes a saved Auction canonical draft and verifies the real wizard shell shows
`6 of 6 ready` with bid, auction window, reserve, lifecycle, legal-pack, and urgency context before
the same run continues through manual save, publish, public merchandising, search, and lead capture.

## Nineteenth Product-Visibility Slice

Add public-detail package proof to the transaction commercial pack.

The public development detail page now adds a `Package proof` strip inside the existing commercial
pack section. It translates the transaction package into buyer-facing readiness signals:

- Sale shows price package, inventory package, ownership signal, and buyer next step;
- Rental shows monthly rent package, lease terms, deposit expectation, rental availability, and
  renter next step;
- Auction shows starting bid package, auction window, reserve strategy, registration lifecycle,
  bidder next step, legal pack, and lot urgency.

This strengthens the public merchandising layer after the wizard feedback work: the developer sees
packaging feedback while building, and the public page now echoes the same commercial proof for
buyers, renters, and bidders before they reach the unit carousel or lead form. Browser proof seeds
real published Rental and Auction developments, opens their public pages, and verifies the new proof
strip alongside the existing commercial-pack pricing, availability, document, CTA, and mobile fit
checks.

## Twentieth Product-Visibility Slice

Add a public transaction journey module to the development detail page.

The public development detail page now shows a transaction-native `transaction-journey` section
between the commercial pack and the unit inventory:

- Sale shows a buyer journey from buyer package, qualification, brochure request, and sales-team
  follow-up;
- Rental shows a rental journey from lease package, rental fit, rental-pack request, and
  leasing-team follow-up;
- Auction shows an auction journey from bid package, bidder readiness, auction-pack request, and
  auction-team follow-up.

This makes the public page explain the buyer/renter/bidder path rather than only exposing price,
availability, proof items, and CTAs. Component proof covers helper output for Rental and Auction,
and browser proof verifies real published Rental and Auction pages render the correct journey copy
on desktop and mobile.

## Twenty-First Product-Visibility Slice

Add a public trust-preview module to the development detail page.

The public development detail page now shows a transaction-native `trust-preview` section after the
journey module:

- Sale shows buyer document, developer-profile, ownership, and buyer-cost context;
- Rental shows rental-pack, developer-profile, lease-cost, and leasing-review context;
- Auction shows legal-pack, developer-profile, cost, and bidder-review context.

This improves buyer-facing trust without changing save, publish, lead, or operating behavior. The
section is deliberately truthful about current route data: if levy/rates or verified-developer
signals are not available to the public detail route, it shows a request/team-confirmed fallback
instead of pretending the data is present. Component proof covers Rental and Auction helper output,
and browser proof verifies real published Rental and Auction pages render the trust preview on
desktop and mobile.

## Twenty-Second Product-Visibility Slice

Add transaction-specific qualification models to the development qualification flow.

The qualification route now separates the estimate model by transaction lane:

- Sale uses `sale_affordability`, based on a bond-style affordability model and commitment-adjusted
  repayment budget;
- Rental uses `rental_fit`, based on a 30% income-to-rent guide after monthly commitments;
- Auction uses `bidder_readiness`, based on a conservative 28% income guide plus available cash
  contribution.

The selected model is visible in the qualification UI and is included in the submitted
`affordabilityData` payload as model metadata. This makes Rental and Auction qualification less like
a relabelled sale affordability check while still being explicit that these are early estimates, not
lease approval, auction registration, or proof-of-funds approval.

## Twenty-Third Product-Visibility Slice

Surface qualification model context in the developer lead operating surface.

The public qualification route already captures Sale, Rental, and Auction model metadata. The
developer lead read model now returns saved `affordabilityData`, and the Leads Control Center shows
that context on lead rows and lead detail:

- Sale leads show Sale affordability context;
- Rental leads show Rental fit context and monthly capacity language;
- Auction leads show Bidder readiness context without calling it approval or registration.

This closes a visibility gap between conversion and operations: a developer can now see whether a
lead came through a sale affordability, rental fit, or bidder readiness model while working the
pipeline. It remains a read-only operating signal. It does not approve leases, register bidders,
verify proof of funds, or move distribution readiness.

## Twenty-Fourth Product-Visibility Slice

Make lead operating stage/action language transaction-aware.

The Leads Control Center still uses one canonical lead pipeline underneath, but visible labels now
adapt per transaction lane:

- Sale uses buyer/sale language such as Buyer qualified and Sale in progress;
- Rental uses renter/lease language such as Rental fit checked, Application received, Lease review,
  Send rental pack, and Let;
- Auction uses bidder/auction language such as Bidder readiness checked, Pack review scheduled, Bid
  intent captured, Auction follow-up, Send auction pack, and Sold at auction.

This makes the operating surface feel less like Sale with relabelled inventory. It is still a
display-layer improvement only: canonical stages, allowed transitions, mutations, SLA logic,
distribution gates, and outcome sync remain unchanged.

## Twenty-Fifth Product-Visibility Slice

Add transaction-specific lead stage guidance.

The Leads Control Center now shows a read-only Stage Guidance panel for the selected lead. The panel
uses the canonical stage plus the development transaction lane to explain:

- the current operating intent;
- the next proof the operator should collect;
- the guardrail that prevents over-claiming readiness.

Sale guidance focuses on buyer intent, finance/deposit path, viewing or offer follow-up, and sale
completion proof. Rental guidance focuses on renter intent, rental fit, application review,
proof-of-income/deposit readiness, and lease review. Auction guidance focuses on bidder intent,
auction-pack access, bidder readiness, bid intent, legal-pack review, and manual outcome evidence.

This improves operational usefulness without changing workflow state. It does not approve leases,
register bidders, verify proof of funds, change allowed transitions, or automate distribution
readiness.

## Twenty-Sixth Product-Visibility Slice

Add transaction-specific lead evidence checklists.

The selected lead detail now shows a read-only evidence checklist selected by transaction lane:

- Sale prompts buyer intent, finance path, unit context, and sale completion proof;
- Rental prompts rental fit, proof of income, deposit readiness, and lease review;
- Auction prompts bidder intent, legal-pack access, proof of funds, and registration review.

Checklist statuses use explicit language: Capture, Manual review, or Optional. This makes the next
operating proof visible without implying that the proof has already been collected. The checklist is
not persisted readiness state and does not approve leases, register bidders, verify funds, update
inventory, or move distribution stages.

## Twenty-Seventh Product-Visibility Slice

Make evidence prompts actionable through lead activity notes.

The evidence checklist can now generate a transaction-specific evidence review note and place it in
the existing activity log composer:

- Sale notes list buyer intent, finance path, unit context, and sale completion proof;
- Rental notes list rental fit, proof of income, deposit readiness, and lease review;
- Auction notes list bidder intent, legal-pack access, proof of funds, and registration review.

The generated note ends with `Decision: pending manual review.` This creates a practical capture
path using the existing lead activity flow while keeping readiness truthful. It is not a persisted
document checklist, does not mark checklist items complete, and does not automate readiness,
distribution, inventory, lease, or bidder-registration state.

## Twenty-Eighth Product-Visibility Slice

Browser-proof lead evidence panels and activity-note capture.

The lead operating panels now have browser proof through `e2e/dle/lead-outcome-sync.spec.ts`:

- Rental lead detail renders Stage Guidance and the Rental evidence checklist;
- Rental Prepare note fills the activity composer and saves through the existing lead activity path;
- The saved activity is verified in the database as a note containing the Rental evidence review;
- Auction lead detail renders Stage Guidance and the Auction evidence checklist;
- Auction Prepare note fills the activity composer with legal-pack, proof-of-funds, registration
  review, and pending-manual-review language.

The browser proof exposed a real local schema mismatch: the developer funnel service wrote activity
rows with `userId`/`type`, while the local `lead_activities` table expects `activityType`. The
service now writes lead activities through a compatibility insert against the actual table shape.
This preserves the manual activity path needed for operating evidence without adding readiness
automation.

## Twenty-Ninth Product-Visibility Slice

Read back saved lead evidence activity in the operator timeline.

The developer lead read model now includes recent lead activities so evidence review notes saved
through the existing activity path are visible again after reload:

- `listDeveloperLeads` includes recent `lead_activities` readback per lead;
- The lead detail Activity Timeline renders saved activity type, timestamp, and note body;
- The timeline falls back to legacy `lead.notes` when no activity rows are present;
- Browser proof reloads a Rental lead after saving the evidence review note and verifies the saved
  Proof of income and Income/employment evidence language appears in the timeline.

This closes the immediate visibility gap from the previous slice: saved evidence review notes are
now both persisted and operator-visible. It is still not a structured evidence readiness model, does
not upload documents, does not mark checklist items complete, and does not automate Rental lease
review or Auction bidder readiness.

## Thirtieth Product-Visibility Slice

Expose transaction-specific evidence readiness models in the lead detail panel.

The evidence checklist now includes a structured readiness summary selected by transaction lane:

- Sale shows a Sale readiness model with manual sale review required before inventory is treated as
  sold or distribution-ready;
- Rental shows a Rental readiness model with manual lease review required before inventory is
  treated as let or distribution-ready;
- Auction shows an Auction readiness model with manual bidder review required before the bidder is
  treated as registered or funds-ready.

The summary counts capture, manual-review, and optional evidence items, then states the operating
guardrail in plain language. Focused browser proof verifies the Rental and Auction readiness model
copy in the lead detail panel. This improves the operating layer from a flat checklist into a
transaction-specific review model while still avoiding premature readiness automation.

This is not a persisted document checklist. It does not upload documents, mark evidence complete,
approve leases, register bidders, verify proof of funds, move lead stages, or enable distribution
reward automation.

## Thirty-First Product-Visibility Slice

Surface evidence readiness in the lead queue.

The developer lead list now shows the same transaction-specific evidence readiness status used by
the detail panel:

- Rental lead rows show `Manual lease review required`;
- Auction lead rows show `Manual bidder review required`;
- Sale lead rows show `Manual sale review required`.

Focused browser proof verifies the Rental and Auction readiness labels before the operator opens the
lead detail panel. This makes operating risk visible at the queue level and helps developers triage
Rental/Auction leads without relying only on generic stage or SLA labels.

This remains display-only. It does not mutate lead stage, inventory, readiness state, distribution
eligibility, payout/reward state, or evidence completion.

## Thirty-Second Product-Visibility Slice

Add dashboard evidence review demand.

The Developer Control Tower Operating Readiness panel now includes a non-mutating evidence review
aggregate derived from active funnel stages:

- Rental dashboards show `Leads needing lease evidence review` with `Manual lease review required`;
- Auction dashboards show `Leads needing bidder evidence review` with
  `Manual bidder review required`;
- Sale dashboards show `Leads needing sale evidence review` with `Manual sale review required`.

The count uses active qualified/viewing/offer/deal leads as review demand. It explicitly excludes
closed outcomes and does not claim document completion. The panel also shows a guardrail explaining
that the count is not verified lease readiness, bidder registration, proof-of-funds readiness, sold
inventory, or payout readiness.

This gives developers dashboard-level operating visibility while preserving the boundary between
review demand and true structured evidence acceptance.

## Thirty-Third Product-Visibility Slice

Define the persisted evidence artifact contract.

`docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md` now defines the required semantics before DLE moves from
manual evidence prompts into persisted Rental/Auction evidence completion:

- artifact scope and ownership;
- Rental and Auction evidence roles;
- artifact types;
- requested/submitted/under-review/accepted/rejected/expired/withdrawn statuses;
- review owners;
- read-model expectations;
- audit events;
- security/privacy requirements;
- implementation gates and the first safe runtime slice.

This contract formalizes that current evidence checklist panels, activity notes, timeline readback,
lead queue labels, and dashboard review-demand counts are not document completion. Future runtime
work must use this contract before claiming proof-of-income, signed-lease, legal-pack,
auction-terms, bidder-registration, proof-of-funds, lease-readiness, or bidder-readiness
completion.

## Thirty-Fourth Product-Visibility Slice

Implement first runtime evidence artifact request/submission/readback.

DLE now has a persisted, lead-level Rental/Auction evidence artifact model for the first safe
runtime slice:

- `dle_evidence_artifacts` stores lead-linked evidence artifacts with transaction lane, artifact
  role, artifact type, status, review owner, creator, metadata, and timestamps;
- the Developer Leads Manager can request or submit manual-attestation evidence artifacts for
  Rental and Auction leads;
- Rental artifact roles are constrained to Rental evidence semantics such as proof of income,
  deposit readiness, and signed lease;
- Auction artifact roles are constrained to Auction evidence semantics such as legal-pack
  acknowledgement, proof of funds, and bidder registration;
- lead detail reads persisted artifacts back below the evidence checklist;
- each request/submission writes a `development_operating_events` audit row using
  `evidence_artifact_requested` or `evidence_artifact_submitted`;
- the UI copy explicitly states that artifacts do not approve lease readiness, bidder registration,
  inventory, or rewards.

The focused browser proof creates a Rental proof-of-income manual attestation, reads it back in the
lead detail panel, verifies the DB artifact row, verifies the operating audit event, and confirms
the lead status/funnel stage did not move.

This is still not evidence completion. Uploaded files, public applicant/bidder upload, artifact
acceptance/rejection, evidence completion read models, admin/distribution review linkage, inventory
movement, public availability changes, payout/reward readiness, and autosave remain future slices.

## Thirty-Fifth Product-Visibility Slice

Implement evidence artifact review-state transitions.

DLE lead detail now supports artifact review decisions for Rental/Auction evidence artifacts:

- `under_review` starts artifact review from requested/submitted evidence;
- `accepted` records a reviewer, review timestamp, optional review note, and audit event;
- `rejected` requires a review note and records the rejection audit trail;
- requested artifacts cannot be accepted/rejected directly;
- accepted/rejected artifacts remain artifact-level evidence decisions only.

The focused browser proof accepts a Rental proof-of-income manual attestation after submission,
reads back the accepted status and review note in the lead detail panel, verifies the DB artifact
status/reviewer/timestamp, verifies `evidence_artifact_accepted` in
`development_operating_events`, and confirms the lead status/funnel stage did not move.

This moves Rental/Auction closer to operating proof, but it still does not claim lease readiness,
bidder readiness, proof-of-funds readiness, inventory let/sold status, distribution payout/reward
readiness, public availability mutation, or autosave safety.

## Thirty-Sixth Product-Visibility Slice

Implement non-automating evidence coverage read model.

DLE lead detail now derives accepted-role coverage from persisted Rental/Auction evidence
artifacts:

- Rental coverage counts accepted proof-of-income, deposit-readiness, and signed-lease evidence
  roles;
- Auction coverage counts accepted legal-pack acknowledgement, proof-of-funds, and bidder
  registration evidence roles;
- missing-role summaries show exactly which transaction evidence roles still need accepted proof;
- coverage is displayed beside the persisted artifact panel in the Developer Leads Manager;
- the guardrail explicitly states that accepted coverage is not lease readiness, bidder readiness,
  inventory movement, distribution payout readiness, or autosave safety.

The focused browser proof accepts a Rental proof-of-income artifact and then verifies the coverage
panel shows `1 of 3 required evidence roles accepted`, lists `Proof of income` as accepted, lists
`Deposit readiness` and `Lease review` as missing, and repeats that this is not lease readiness,
inventory let status, or distribution payout readiness.

This is deliberately a read model only. It does not mutate artifact status, lead stage, inventory,
distribution deals, rewards, public availability, wizard data, or autosave state.

## Remaining Product Gaps

- Deepen Rental qualification beyond model metadata into proof-of-income capture, document
  readiness, and lease application review where product semantics require them.
- Deepen Auction bidder qualification beyond model metadata into bidder registration acceptance,
  legal-pack acceptance, proof-of-funds workflows, and auction terms where product semantics require
  them.
- Continue strengthening public development pages beyond package proof and journey copy with
  richer document previews, downloadable document metadata, incentive treatment, and
  operating-status history where product semantics require them.
- Add deeper Rental/Auction qualification rules where needed, such as lease qualification ratios,
  proof-of-income validation, bidder registration state, and proof-of-funds workflows.
- Continue operating-layer surfaces after publish. Sale reserve/release, Rental hold/release,
  Auction registration open/rollback, and Auction time-gated activation are now browser-proven.
  Qualification model visibility, transaction-aware lead stage/action labels, stage guidance, and
  evidence checklist prompts are now present in the lead center. Evidence review can now be captured
  as lead activity notes, read back in the lead timeline, and browser-proven for Rental/Auction
  panels. Evidence readiness is now summarized as a transaction-specific manual review model, and
  the lead queue and dashboard now surface manual review demand/status. First-pass lead-level
  Rental/Auction evidence request/submission/readback, artifact-level review decisions, and
  accepted-role coverage readback now exist, but evidence completion automation, uploaded proof
  files, public applicant/bidder upload, sold/let/auction outcomes, pricing adjustments, release
  phases, and deeper audit dashboards remain future.

## Evidence To Attach Over Time

- Component proof that Sale, Rental, and Auction show distinct wizard engine context. Status:
  complete for `WizardEngine`.
- Browser proof that active Sale, Rental, and Auction draft/resume flows render the correct engine
  band. Status: complete for saved canonical draft resume.
- Component and Sale browser proof that the wizard shell renders public-preview feedback for
  identity, highlights, and media. Status: complete for canonical saved Sale draft resume.
- Component and Rental browser proof that the wizard shell renders lease-native Rental packaging
  feedback. Status: complete for canonical saved Rental draft resume.
- Component and Auction browser proof that the wizard shell renders bid-native Auction packaging
  feedback. Status: complete for canonical saved Auction draft resume.
- Component and browser proof that the public detail commercial pack renders transaction-native
  package proof. Status: complete for helper-level Sale/Rental/Auction and browser-level
  Rental/Auction public detail.
- Component and browser proof that public detail renders transaction-native journey copy. Status:
  complete for helper-level Rental/Auction and browser-level Rental/Auction public detail.
- Component and browser proof that public detail renders transaction-native trust preview. Status:
  complete for helper-level Rental/Auction and browser-level Rental/Auction public detail.
- Component and router-contract proof that qualification uses transaction-specific models and
  persists model metadata. Status: complete for helper-level Rental/Auction and
  `developer.createLead` contract.
- Component-helper and service-contract proof that saved qualification model metadata reaches the
  developer lead operating surface. Status: complete for lead qualification display helper and
  developer funnel read-model normalization.
- Component-helper proof that lead operating stage/action labels are transaction-aware. Status:
  complete for Sale, Rental, and Auction label helpers.
- Component-helper proof that lead stage guidance is transaction-aware. Status: complete for Sale,
  Rental, and Auction guidance helpers.
- Component-helper proof that lead evidence checklist prompts are transaction-aware. Status:
  complete for Sale, Rental, and Auction checklist helpers.
- Component-helper proof that evidence checklist prompts can generate transaction-aware review
  notes for the activity log. Status: complete for Auction note generation and checklist helper
  coverage.
- Browser proof that Rental/Auction lead evidence panels render and evidence review notes can be
  prepared/saved through the existing activity path. Status: complete for focused
  `lead-outcome-sync` proof.
- Browser proof that saved Rental evidence review activity reads back in the lead detail timeline
  after reload. Status: complete for focused `lead-outcome-sync` proof.
- Component and browser proof that Rental/Auction evidence readiness summaries are
  transaction-specific and do not imply automatic lease/bidder approval. Status: complete for
  `leadEvidenceChecklist` helper tests and focused `lead-outcome-sync` proof.
- Browser proof that Rental/Auction lead queue rows show transaction-specific manual evidence
  readiness before opening lead detail. Status: complete for focused `lead-outcome-sync` proof.
- Component proof that the Developer Control Tower summarizes Rental/Auction evidence review demand
  without claiming lease/bidder readiness. Status: complete for `Overview` helper tests.
- Documentation proof that persisted Rental/Auction evidence artifacts have an implementation
  contract before runtime work. Status: complete for `EVIDENCE_ARTIFACT_CONTRACT.md`.
- Browser/API/DB proof that a Rental lead can persist and read back a proof-of-income manual
  attestation without moving lead stage or inventory. Status: complete for focused
  `lead-outcome-sync` proof.
- Browser/API/DB proof that a Rental proof-of-income artifact can be accepted with review note,
  reviewer, timestamp, and audit event without moving lead stage or inventory. Status: complete for
  focused `lead-outcome-sync` proof.
- Component and browser proof that accepted Rental/Auction artifact roles produce coverage and
  missing-role summaries without claiming lease/bidder readiness. Status: complete for
  `leadEvidenceChecklist` helper tests and focused `lead-outcome-sync` proof.
- Product screenshots showing before/after public merchandising improvements.
- Dashboard/operations evidence when live-development management begins.
