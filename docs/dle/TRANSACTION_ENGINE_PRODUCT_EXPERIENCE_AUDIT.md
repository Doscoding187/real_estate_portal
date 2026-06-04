# DLE Transaction Engine Product Experience Audit

Date: 2026-06-04
Status: First product-visibility slice started.

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

## Remaining Product Gaps

- Add live public-preview feedback for identity, highlights, and media.
- Make Rental packaging feel lease-native: deposit, lease term, furnished state, availability, and
  renter qualification should feel intentional rather than optional add-ons.
- Make Auction packaging feel auction-native: auction window, reserve, bidder registration, legal
  pack, and urgency should become first-class product language.
- Strengthen public development pages with transaction-specific merchandising sections beyond price
  labels.
- Add operating-layer surfaces after publish: inventory status, reservations, sold/let/auction
  outcomes, lead stages, pricing adjustments, release phases, dashboards, and audit history.

## Evidence To Attach Over Time

- Component proof that Sale, Rental, and Auction show distinct wizard engine context.
- Browser proof that active draft/resume flows render the correct engine band.
- Product screenshots showing before/after public merchandising improvements.
- Dashboard/operations evidence when live-development management begins.
