# DLE Transaction Engine Product Experience Audit

Date: 2026-06-04
Status: Product-visibility slices are now active across wizard guidance, unit preview, public
unit-card merchandising, public action-panel CTAs, lead-dialog copy/context, and qualification
route copy/results.

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

## Remaining Product Gaps

- Add live public-preview feedback for identity, highlights, and media.
- Make Rental packaging feel lease-native: deposit, lease term, furnished state, availability, and
  renter qualification should feel intentional rather than optional add-ons.
- Make Auction packaging feel auction-native: auction window, reserve, bidder registration, legal
  pack, and urgency should become first-class product language.
- Strengthen public development pages with transaction-specific merchandising sections beyond price
  labels, availability, and primary CTAs.
- Add richer Rental/Auction qualification assumptions where needed, such as lease qualification
  ratios, proof-of-income expectations, bidder registration requirements, and proof-of-funds
  prompts.
- Add operating-layer surfaces after publish: inventory status, reservations, sold/let/auction
  outcomes, lead stages, pricing adjustments, release phases, dashboards, and audit history.

## Evidence To Attach Over Time

- Component proof that Sale, Rental, and Auction show distinct wizard engine context.
- Browser proof that active draft/resume flows render the correct engine band.
- Product screenshots showing before/after public merchandising improvements.
- Dashboard/operations evidence when live-development management begins.
