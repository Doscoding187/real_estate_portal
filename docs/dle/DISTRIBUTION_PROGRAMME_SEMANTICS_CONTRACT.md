# Distribution Programme Semantics Contract

## Purpose

This contract defines what must be true before the DLE moves beyond transaction-aware labels into
Rental- and Auction-specific distribution programme behavior.

The current distribution system has a shared referral/deal/payout model. Recent DLE slices made
Sale, Rental, and Auction context visible across partner, manager, admin, and public distribution
surfaces. That is display/readback parity, not full programme semantics.

Do not implement Rental or Auction payout automation, stage movement, document gating, or readiness
mutation from DLE until the relevant rules below are represented in product terms, read models, and
tests.

## Current Allowed State

Allowed today:

- Show Sale, Rental, and Auction referral lanes from development `transactionType`.
- Label participants as Buyer, Renter, or Bidder.
- Label partner-facing payout surfaces as Rewards.
- Keep existing distribution-owned route and data-model names such as `dealId`,
  `commissionAmount`, `commission_pending`, and `/distribution/partner/commissions`.
- Link DLE operating outcomes to distribution review/readback as audit context.
- Let managers acknowledge DLE handoff notes without moving distribution stages.
- Keep reward copy tied to configured programme terms.

Not allowed yet:

- Automatically move a distribution stage because Rental was let or an Auction lot was sold.
- Treat Rental lease signing as equivalent to Sale contract signing without configured programme
  rules.
- Treat Auction terms acceptance, bidder registration, or a winning bid as equivalent to Sale
  contract/bond milestones without configured programme rules.
- Mark Rental/Auction commission readiness complete from DLE inventory outcomes alone.
- Require or verify Rental/Auction-specific documents unless document templates and review rules
  are configured.
- Claim deposit, lease, bidder-registration, proof-of-funds, FICA, legal-pack, or auction-payment
  readiness is solved only because the UI label changed.

## Shared Distribution Shell

The shared shell remains responsible for:

- partner access;
- programme enrollment;
- referral submission;
- manager assignment;
- referral/deal read models;
- document template ownership;
- stage transition guardrails;
- payout milestone guardrails;
- reward entry calculation and payment status;
- audit events for distribution state changes.

DLE may provide transaction context and operating outcome context, but DLE must not bypass the
distribution shell's document, manager, milestone, and payout guardrails.

## Sale Programme Semantics

Sale is the current baseline.

Required participant:

- Buyer.

Common milestones:

- referral submitted;
- viewing/contact;
- application submitted;
- contract signed;
- bond or finance condition approved where relevant;
- reward pending;
- reward paid.

Document expectations:

- buyer ID/FICA;
- affordability or proof of funds;
- developer application pack;
- sale agreement or reservation documents where configured.

Payout trigger examples:

- contract signed;
- bond approved;
- transfer milestone;
- configured manual approval.

Sale remains the only lane where the existing shared stage language is broadly coherent.

## Rental Programme Semantics

Rental is not a sale with rent labels.

Required participant:

- Renter or rental applicant.

Commercial context that must be available before deeper automation:

- monthly rent;
- deposit requirement;
- lease term;
- furnished state where relevant;
- availability/held/let inventory state;
- rental qualification assumptions;
- manager or landlord approval path;
- lease start or move-in timing where relevant.

Document expectations:

- ID/FICA where applicable;
- proof of income;
- bank statements;
- employer or company details where relevant;
- references where relevant;
- deposit confirmation where relevant;
- signed lease or lease pack where configured.

Rental-specific stage model should distinguish:

- renter submitted;
- renter contacted;
- rental viewing scheduled/completed;
- rental application submitted;
- rental documents verified;
- lease approved;
- lease signed;
- deposit received where applicable;
- let;
- rental reward pending;
- rental reward paid.

Rental payout trigger examples:

- lease signed;
- deposit received;
- first rent paid;
- landlord/developer manual approval;
- configured programme milestone.

Hard guardrails:

- Do not treat `contract_signed` as lease signed unless the programme explicitly maps that shared
  stage to a Rental lease milestone.
- Do not treat `bond_approved` as Rental readiness unless the programme explicitly maps it to
  lease approval, deposit received, or another Rental milestone.
- Do not close or pay Rental rewards from a DLE `let` outcome unless the linked referral, lease
  milestone, and payout rule are explicit.

## Auction Programme Semantics

Auction is not a sale with a starting bid label.

Required participant:

- Bidder.

Commercial context that must be available before deeper automation:

- starting bid;
- reserve price where relevant;
- auction date/window;
- auction status;
- registration requirements;
- auction terms;
- legal pack availability;
- proof-of-funds/FICA requirements;
- registration deposit or fee where relevant;
- bidder approval path;
- auction outcome: sold, passed in, or withdrawn.

Document expectations:

- bidder ID/FICA;
- proof of funds or finance backing;
- signed auction terms;
- registration confirmation;
- deposit/fee proof where configured;
- legal pack acknowledgement where configured.

Auction-specific stage model should distinguish:

- bidder submitted;
- bidder contacted;
- bidder registration started;
- bidder documents submitted;
- bidder approved;
- auction terms accepted;
- auction active;
- bid outcome recorded;
- winning bidder confirmed where applicable;
- auction reward pending;
- auction reward paid.

Auction payout trigger examples:

- winning bidder confirmed;
- auction terms accepted plus sale agreement signed;
- deposit paid;
- settlement/transfer milestone;
- configured manual approval.

Hard guardrails:

- Do not treat bidder registration as payout readiness.
- Do not treat an Auction `sold` inventory outcome as reward readiness without winning-bidder and
  programme milestone context.
- Do not automatically cancel all bidder referrals when a lot is passed in or withdrawn.
- Do not expose reserve, registration deposit, or legal-pack status as verified unless those data
  records exist and have review rules.

## Document Template Requirements

Before Rental/Auction document readiness can affect stage or reward behavior, templates must carry
enough metadata to answer:

- Which transaction lane does this template apply to?
- Is it required for the participant, the developer, or supporting information only?
- Does it block submission, manager approval, stage movement, or payout readiness?
- Who reviews it?
- What counts as verified?
- Can it be reused across developments or must it be programme-specific?

Persisted template metadata now exists on `development_required_documents`:

- `transactionType`: sale, rent, auction, or all;
- `participantType`: buyer, renter, bidder, developer, manager, supporting;
- `readinessRole`: submission, qualification, lease, auction_registration, payout, supporting;
- `requiredForStage`;
- `blocksPayout`;
- `reviewOwner`;
- `publiclyShareable`;
- `programmeSpecific`.

The programme semantics read model must prefer these explicit fields when present and fall back to
legacy category/code/label inference only for older rows or partially migrated environments.
Explicit metadata is still read-only for automation: it may configure visible readiness roles,
missing-role warnings, and wrong-lane warnings, but it must not move stages or mark rewards ready
without explicit programme terms, review rules, and payout triggers.

Admin configuration:

- The partner-development onboarding drawer is the first admin authoring surface for this
  metadata.
- Starter packs should seed transaction-specific defaults where the commercial meaning is clear.
- Saving, brand presets, and applying a setup to other developments must preserve metadata.
- The controls are authoring/readback only; they do not verify documents, advance stages, or
  approve rewards.

## Payout Rule Requirements

Before Rental/Auction payout readiness can be automated, programme terms must describe:

- transaction lane;
- payout trigger;
- required stage or milestone;
- required documents;
- required manager/admin approval;
- amount model;
- whether a deposit/payment milestone is required;
- whether a DLE operating outcome is supporting context or a required condition.

Minimum future payout trigger vocabulary:

- Sale: `contract_signed`, `bond_approved`, `transfer_registered`, `manual_approval`.
- Rental: `lease_signed`, `deposit_received`, `first_rent_paid`, `manual_approval`.
- Auction: `winning_bidder_confirmed`, `auction_terms_signed`, `deposit_paid`,
  `settlement_confirmed`, `manual_approval`.

Current read-model status:

- `server/services/distributionProgrammeSemanticsService.ts` exposes the trigger vocabulary and
  required conditions as `transactionRuleModel`.
- Sale is marked as the current `shared_sale_shell` baseline.
- Rental and Auction are marked as `transaction_specific_rules_required`.
- This model is readback/design context only. It does not create payout rules, move stages, create
  reward entries, verify documents, or approve commissions.

## DLE Handoff Rules

DLE operating outcomes can create review context, not automatic reward truth.

Sale:

- Sold outcome may support lead sync and distribution review, but distribution payout remains
  programme-owned.

Rental:

- Let outcome may request lease/reward review.
- It must not prove lease signed, deposit received, or first rent paid unless those records exist.

Auction:

- Sold outcome may request bidder/reward review.
- Passed-in and withdrawn outcomes should create review/follow-up context, not automatic broad
  cancellation.

## Implementation Order

Recommended next code slices:

1. Add read-only programme semantics fields or computed read models without changing mutations.
2. Add document-template lane/readiness metadata and tests.
3. Add manager/admin display of Rental/Auction required documents and missing readiness.
4. Add explicit manual review actions for Rental lease readiness and Auction bidder readiness.
5. Only then consider guarded stage movement or reward-readiness automation.

Status:

- Steps 1, 2, first manager/admin readback surfaces, and first admin authoring controls are
  implemented.
- Step 4 is implemented as manager manual readiness review actions for Rental lease readiness and
  Auction bidder readiness. The actions record validation events and visible readback only.
- Step 5 has a read-only rule-model surface: transaction-specific trigger vocabulary and required
  conditions are represented in the programme semantics read model, but automation remains blocked.
- Step 5 runtime automation remains explicitly out of scope. Manual review acceptance does not
  move stages, approve rewards, change commission state, or automate payout readiness.

Each implementation slice must prove:

- wrong transaction lane is rejected or ignored safely;
- missing required documents block only the intended readiness action;
- payout status does not change on failed readiness review;
- DLE operating outcomes do not bypass distribution guardrails;
- partner-facing UI never claims reward readiness unless the distribution owner has accepted it.

## Non-Goals

This contract does not implement payout logic or automatic stage movement.

This contract does not rename existing internal database fields.

This contract does not require changing existing compatibility route paths such as
`/distribution/partner/commissions`.

This contract exists so future code work can be product-correct before it becomes operational.
