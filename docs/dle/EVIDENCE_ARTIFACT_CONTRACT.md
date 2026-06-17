# DLE Evidence Artifact Contract

Date: 2026-06-13
Status: Contract active. Runtime slices now implement DLE-owned lead-level Rental/Auction evidence
artifacts for `requested`, `submitted`, `under_review`, `accepted`, and `rejected` manual
attestations with lead-detail readback and operating-event audit. Evidence completion, readiness,
lead-stage movement, inventory movement, payout/reward movement, public listing mutation, and
autosave behavior remain explicitly unimplemented.

## Purpose

Rental and Auction operating surfaces now show evidence prompts, review notes, lead-timeline
readback, lead-queue labels, and dashboard review demand. Those surfaces are intentionally
non-mutating. They show what operators should review, but they do not prove that evidence exists or
that evidence has been accepted.

This contract defines the persisted artifact model before evidence completion implementation. The
goal is to move from manual note capture toward structured evidence without collapsing Rental and
Auction into Sale workflow assumptions.

## Hard Boundary

Evidence artifacts are proof records. They are not automatic readiness, stage movement, inventory
movement, or reward/payment approval.

Creating, uploading, updating, or accepting an evidence artifact must not automatically:

- mark Rental inventory as held, lease-ready, or let;
- mark an Auction bidder as registered, funds-ready, winning, or approved;
- move a lead stage;
- move a distribution deal stage;
- mark a referral reward or commission ready;
- change public listing availability;
- rewrite wizard `stepData`, media, location, governance, pricing, highlights, unit definitions, or
  publish state;
- enable autosave or claim draft/edit progress is saved.

Any future mutation that performs those actions must be explicit, separately authorized, audited,
and covered by transaction-specific tests.

## Ownership

DLE owns the evidence artifact record only when the proof is attached to a DLE lead, unit, or
development operating workflow.

Distribution remains owner of distribution deal document requirements, programme terms, manager
review, payout readiness, and reward/commission guardrails.

Admin review remains owner of platform policy checks where the evidence is used to validate a
developer, programme, or compliance requirement.

Evidence artifacts may be linked across these surfaces, but linking must preserve owner boundaries.
The DLE artifact may provide context to distribution/admin review; it must not bypass those systems.

## Required Artifact Scope

Each persisted artifact must answer:

- Which development does this proof belong to?
- Which transaction lane does it belong to: sale, rent, or auction?
- Which lead, unit type, unit, or distribution deal is it linked to, if any?
- Which evidence role does it satisfy?
- Who uploaded or created it?
- Who is responsible for reviewing it?
- What is the current review status?
- What changed, when, and why?

Recommended base fields:

```text
id
developmentId
transactionType
leadId nullable
unitTypeId nullable
unitId nullable
distributionDealId nullable
artifactRole
artifactType
storageKey nullable
externalUrl nullable
displayName
description nullable
status
reviewOwner
reviewedByUserId nullable
reviewedAt nullable
reviewNote nullable
metadata JSON nullable
createdByUserId
updatedByUserId nullable
createdAt
updatedAt
```

## Artifact Roles

Shared roles:

- `identity`
- `fica`
- `proof_of_funds`
- `application_form`
- `supporting`

Sale roles:

- `buyer_intent`
- `finance_path`
- `sale_agreement`
- `deposit_proof`
- `completion_proof`

Rental roles:

- `rental_fit`
- `proof_of_income`
- `bank_statements`
- `employment_confirmation`
- `deposit_readiness`
- `lease_pack`
- `signed_lease`
- `occupation_timing`

Auction roles:

- `bidder_intent`
- `legal_pack_acknowledgement`
- `auction_terms_acceptance`
- `bidder_registration`
- `proof_of_funds`
- `registration_deposit`
- `winning_bid_confirmation`

Role names are product semantics. They should not be inferred from free-form labels when explicit
metadata exists.

## Artifact Types

Allowed first-pass artifact types:

- `uploaded_file`
- `external_link`
- `manual_attestation`
- `system_note`

`manual_attestation` and `system_note` are not document proof. They are review context only unless
a future rule explicitly allows a specific role to be satisfied without an uploaded file.

## Status Model

Recommended statuses:

- `requested`
- `submitted`
- `under_review`
- `accepted`
- `rejected`
- `expired`
- `withdrawn`

Status semantics:

- `requested`: the system or operator expects this proof.
- `submitted`: proof was attached but not reviewed.
- `under_review`: a reviewer is actively checking it.
- `accepted`: the reviewer accepted the proof for its role and transaction lane.
- `rejected`: the reviewer rejected the proof and should provide a reason.
- `expired`: the proof is no longer valid.
- `withdrawn`: the proof was removed from consideration.

Only `accepted` can contribute to future evidence-completion read models. Even then, accepted proof
does not automatically move inventory, leads, distribution stages, or payouts.

## Review Owners

Recommended review owners:

- `developer_sales`
- `leasing_team`
- `auction_team`
- `distribution_manager`
- `admin`
- `system`

`system` may request or organize evidence but must not accept Rental lease readiness, Auction
bidder readiness, or payout readiness without a later explicit automation contract.

## Rental Completion Semantics

Rental evidence completion may later be derived from accepted artifacts for:

- rental fit/application context;
- proof of income;
- deposit readiness;
- lease pack review;
- signed lease.

Rental completion must distinguish:

- evidence requested;
- evidence submitted;
- evidence accepted;
- lease application approved;
- inventory let.

Those are separate states. Accepted evidence alone is not the same as a signed lease or let
inventory.

## Auction Completion Semantics

Auction evidence completion may later be derived from accepted artifacts for:

- bidder intent;
- legal-pack acknowledgement;
- proof of funds;
- auction terms acceptance;
- bidder registration;
- winning-bid confirmation where applicable.

Auction completion must distinguish:

- evidence requested;
- evidence submitted;
- evidence accepted;
- bidder registered;
- bidder funds-ready;
- winning bidder confirmed;
- auction lot sold, passed in, or withdrawn.

Those are separate states. Accepted evidence alone is not bidder registration, proof-of-funds
readiness, or auction outcome completion.

## Read Models

Future read models should expose at least:

- required roles by transaction lane;
- counts by status;
- missing required roles;
- rejected roles;
- accepted roles;
- next manual review action;
- last review note;
- last updated timestamp;
- linked lead/unit/deal context;
- whether the artifact is DLE-owned, distribution-owned, or admin-owned.

UI may show completion percentages only when the required-role set is explicit. Until then, use
counts and missing-role labels rather than a readiness percentage.

## Event And Audit Requirements

Every artifact mutation must write an audit event.

Recommended event types:

- `evidence_artifact_requested`
- `evidence_artifact_submitted`
- `evidence_artifact_review_started`
- `evidence_artifact_accepted`
- `evidence_artifact_rejected`
- `evidence_artifact_expired`
- `evidence_artifact_withdrawn`

Each event should include:

- artifact id;
- development id;
- transaction type;
- linked lead/unit/deal ids where present;
- previous status;
- next status;
- actor user id;
- review owner;
- note or reason where applicable;
- source surface.

## Source Surfaces

Allowed first-pass source surfaces:

- `developer_leads_manager`
- `developer_dashboard`
- `developer_units_manager`
- `distribution_manager`
- `admin_review`

Public users may submit enquiry information, but public submission should create lead context first.
Public upload of sensitive evidence needs a separate privacy/security contract before implementation.

## Security And Privacy Requirements

Evidence artifacts may contain sensitive personal and financial information.

Minimum requirements before implementation:

- authorization checks for every read and write;
- no public unauthenticated artifact access;
- storage keys must not be exposed as direct unrestricted download paths;
- audit events must avoid storing full sensitive document contents;
- rejected/expired/withdrawn artifacts must remain auditable but should not be reused as accepted
  proof;
- role-based access must distinguish developer operators, distribution managers, admins, and future
  applicants/bidders.

## Implementation Gates

Before evidence completion, file upload, acceptance/rejection, admin review, distribution linkage,
or readiness automation starts, confirm:

1. Required artifact roles for Rental and Auction first pass.
2. Which roles are mandatory versus optional per transaction lane.
3. Whether artifacts attach first to leads, unit types, distribution deals, or all three.
4. Who can request, submit, accept, reject, expire, and withdraw artifacts.
5. Whether uploaded files use the existing local/S3 upload abstraction or a new protected document
   storage path.
6. Which read model surfaces must be visible first: lead detail, lead queue, dashboard, admin, or
   distribution manager.
7. Which mutation events must be written to `development_operating_events` versus distribution deal
   events.

## First Safe Implementation Slice

Implemented first runtime slice:

- create a DLE-owned artifact model for lead-level Rental and Auction evidence;
- support `manual_attestation` or metadata-only submitted artifacts before file upload if needed;
- expose readback in lead detail;
- keep lead queue/dashboard as counts only;
- write audit events;
- do not move lead stages, inventory, distribution deals, rewards, or public availability.

Implemented first proof:

- Rental lead can request/submit proof-of-income evidence and read it back as `submitted`;
- Auction lead can request/submit proof-of-funds or legal-pack acknowledgement and read it back as
  `submitted`;
- no inventory, lead stage, distribution deal, reward, public listing, or wizard data changes.

Implemented second runtime slice:

- lead-detail review-state transitions for `under_review`, `accepted`, and `rejected`;
- review notes and reviewer/timestamp readback for accepted/rejected artifacts;
- audit events for `evidence_artifact_review_started`, `evidence_artifact_accepted`, and
  `evidence_artifact_rejected`;
- transition guards so requested evidence cannot be accepted/rejected directly;
- rejection note requirement;
- browser/API/DB proof that accepted Rental proof-of-income evidence does not move lead stage,
  inventory, distribution, rewards, public listing, or wizard data.

Implemented third runtime slice:

- lead-detail evidence coverage read model for Rental/Auction accepted artifact roles;
- accepted-role count against required transaction-specific roles;
- missing-role summaries for incomplete evidence coverage;
- component proof for Rental and Auction coverage summaries;
- browser proof that accepted Rental proof-of-income shows `1 of 3` roles accepted and still lists
  deposit readiness and lease review as missing;
- explicit guardrails that accepted-role coverage is not lease readiness, bidder readiness,
  inventory movement, distribution payout readiness, or autosave safety.

Not implemented in the runtime slices:

- uploaded evidence files;
- public applicant/bidder evidence upload;
- `expired` or `withdrawn` mutations;
- evidence completion/readiness automation;
- distribution/admin review linkage;
- inventory, lead-stage, public listing, payout, reward, or autosave mutations.
