# COMM-S1 — Commercial Sale Pricing and Zoning Authority Design

**Status:** Design freeze for a future schema workstream. It is not active
runtime authority and does not authorise a migration, public sale route, or
zoning claim.

**Depends on:** [COMM-S0](./00-commercial-product-doctrine-and-canonical-authority.md),
the canonical [Database Change Protocol](../../database-authority/database-change-protocol.md).

## Why this is a separate authority change

The active Commercial leasing journey has an explicit rent/economics contract.
It must not use `listings.pricing`, `propertyDetails`, or a rent component as
an accidental sale-price authority. Likewise, asset kind, use type, marketing
copy, and local-context specifications do not prove statutory zoning or a
particular tenant use is permitted.

The two missing facts therefore need their own canonical records:

```text
Commercial Asset ──┬── Commercial Asset Zoning Context
                   └── Commercial Space ── Commercial Availability
                                                     └── Commercial Sale Terms
```

## 1. Commercial Asset Zoning Context

`commercial_asset_zoning_contexts` is owned by `commercial_assets`, because
municipal zoning is a physical-site fact rather than a marketing Listing fact
or a time-specific lease Availability fact.

One current context row per asset is sufficient for the first release. A
replacement is an explicit update by the author/reviewer workflow; a later
audit-history workstream may supersede this with versioned records, but must
not imply that historical evidence is present today.

| Column                                  | Purpose                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `id`                                    | Canonical row identity.                                                                                                        |
| `commercial_asset_id`                   | Required unique FK to `commercial_assets`.                                                                                     |
| `verification_state`                    | `verified`, `reported`, or `unknown`; public wording is driven by this state.                                                  |
| `zoning_code`                           | Optional local authority zoning code, never normalised into an invented national taxonomy.                                     |
| `zoning_description`                    | Optional human-readable zoning designation.                                                                                    |
| `permitted_use_summary`                 | Optional bounded summary of the source's stated permitted use. It is not legal advice.                                         |
| `source_kind`                           | `municipal_document`, `title_deed`, `landlord`, `owner`, `broker`, `asset_manager`, or `other`.                                |
| `source_label` / `evidence_reference`   | Required for `verified` and `reported` records; records where the claim came from without treating marketing copy as evidence. |
| `confirmed_by_user_id` / `confirmed_at` | Responsible platform/author confirmation provenance.                                                                           |
| timestamps                              | Standard record lifecycle timestamps.                                                                                          |

Write rules:

- `verified` requires a non-empty zoning code or description, source label,
  evidence reference, confirming user, and confirmation timestamp.
- `reported` requires a source label and a zoning/permitted-use statement but
  is never rendered as verified zoning.
- `unknown` stores none of the assertion fields; it is an explicit absence of
  authority, not an invitation to infer a value from `asset_kind` or
  `space_class`.
- The public detail may state an active `verified` or clearly-labelled
  `reported` context. It displays “confirm with the verified advertiser” for
  `unknown` or no row. No current record may be inferred from Listing text.

Space-specific tenant restrictions remain operational context, not municipal
zoning. They can be introduced later only with an explicitly separate
space-level authority; this table must not be stretched to assert a tenant's
licence, consent use, or regulatory approval.

## 2. Commercial Sale Terms

`commercial_availability_sale_terms` is owned by `commercial_availabilities`
and has a required unique FK to one `transaction_type='sale'` Availability.
It keeps a sale quote separate from recurring lease economics.

| Column                         | Purpose                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `id`                           | Canonical row identity.                                                                       |
| `commercial_availability_id`   | Required unique FK to a sale Availability.                                                    |
| `price_state`                  | `supplied`, `estimated`, or `unknown`.                                                        |
| `asking_price_minor`           | Required positive ZAR-minor amount for `supplied`/`estimated`; null for `unknown`.            |
| `price_basis`                  | `total` or `per_m2`; required whenever a price is asserted.                                   |
| `vat_treatment`                | `included`, `excluded`, `not_applicable`, or `unknown`, explicitly separate from lease costs. |
| `source_label` / `supplied_at` | Quote provenance and freshness.                                                               |
| timestamps                     | Standard record lifecycle timestamps.                                                         |

Write/publication rules:

- A public sale Availability requires `price_state` `supplied` or `estimated`,
  a positive amount, and a declared price basis. `unknown` can exist as an
  internal draft but cannot unlock public purchase discovery.
- Sale terms reject lease economics as their price source. `gross_rent`,
  `base_rent`, operating costs, and the Lease Terms table remain leasing-only.
- Public copy must label estimates and VAT treatment; it must not calculate a
  yield, transfer cost, finance result, or valuation from this record.
- A sale enquiry remains bound to the canonical Listing plus Availability and
  reuses the existing verified-recipient handoff boundary.

## 3. Required runtime switch after schema admission

Only after both tables are canonical, migrated, congruent, and consumer-tested:

1. Authoring may offer Lease or Sale and creates the corresponding Availability
   record and terms authority.
2. Search may select one transaction authority per request; Lease applies Cost
   Passport filters, Sale applies only sale-term filters.
3. Detail renders the right decision model rather than a generic `price`
   field: lease economics/terms for Lease, sale price/VAT basis for Sale.
4. Publication and lead-resolution checks require a coherent transaction-type
   authority and fail closed for mixed or missing terms.

## 4. Migration admission and current sequencing gate

The design requires two additive `CREATE TABLE` migrations, one table per
single-DDL migration. The exact four-digit filenames, parent checksums, and
manifest order are deliberately **not assigned here**.

At this design's review date, the checked-out branch has active migration head
`0074_service_quotes.sql`, while current `origin/main` has head
`0061_sl_messages_authorship.sql`. The Database Change Protocol requires a
dedicated database-authority worktree rebased on current `origin/main` and a
serialized manifest review before choosing a new sequence. Assigning `0062`
would collide with this branch's Services lineage; assigning `0075` would
publish an unreviewed non-main lineage.

The release/schema owner must first select the lineage integration path. Then
the implementation workstream must:

1. update `drizzle/schema/commercial.ts` and the canonical model inventory;
2. add each approved table as one additive, single-DDL manifest entry;
3. add domain command, public eligibility, and negative contract tests;
4. run the authorized plan/apply/congruency/readiness/consumer-contract path
   against an owned disposable target; and
5. activate UI and public routes only after the authoritative target is ready.

No migration, manual DDL, ledger repair, or runtime schema fallback is
authorised by this design.

## Rejected shortcuts

- Do not store sale price or zoning in `listings.propertyDetails`, generic
  `properties`, or free-form marketing text.
- Do not reuse rent economics for a sale quote, or derive a sale price from
  rentable area.
- Do not add zoning as an unproven asset/space label, generic category, or
  inferred filter.
- Do not choose a migration number from branch age or the local database
  ledger.
