# Canonical Listing Lifecycle Contract

## 1. Architectural Contract

The system distinguishes two object families:

| Object | Role | Table |
|--------|------|-------|
| **listings** | Canonical authoring/lifecycle object | `listings` |
| **properties** | Public search and merchandising projection | `properties` |

### Identity Bridge

- `properties.sourceListingId` is the stable foreign key that links a public projection back to its canonical listing.
- Every `properties` row that originates from a listing MUST have `sourceListingId` set to the originating `listings.id`.
- Development-derived units, imported/legacy records, or manually created properties MAY have `sourceListingId = NULL`.

### Media Architecture

| Object | Table | Content |
|--------|-------|---------|
| Canonical media | `listing_media` | All media types: image, video, floorplan, pdf |
| Public projection | `propertyImages` | Images only (subset of listing_media) |
| Primary image | `properties.mainImage` (denormalised varchar) | Single URL of primary/hero image |

### Lead Traceability

- Public leads attach to `propertyId` (the properties projection).
- The system MUST be able to resolve any lead from `propertyId` back to `sourceListingId`.
- Draft/pre-submission listings have no property projection, so they have no public leads.

### Analytics Segregation

- Listing-level analytics track authoring/lifecycle events (created, updated, submitted, approved, rejected).
- Property-level analytics track public publication performance (views, enquiries, favourites, shares).
- Both MUST be separately queryable and must not conflate authoring activity with public performance.

---

## 2. State Machine

```
                         ┌─────────────────────────────────────────────┐
                         │                                             │
                         v                                             │
  ┌───────┐     ┌────────────────┐     ┌──────────┐     ┌───────────┐ │
  │ draft │────>│ pending_review │────>│ approved │────>│ published │─┘
  └───────┘     └────────────────┘     └──────────┘     └───────────┘
       │                │                    │
       │                v                    v
       │         ┌──────────┐        ┌──────────────┐
       └────────>│ rejected │        │ sold / rented │
                 └──────────┘        └──────────────┘
                                              │
                                              v
                                       ┌──────────┐
                                       │ archived │
                                       └──────────┘
```

### Transitions

| From | To | Trigger | Auth | Creates property? |
|------|----|---------|------|-------------------|
| *(none)* | draft | `listing.create` | Owner/agent | No |
| draft | pending_review | `listing.submitForReview` | Owner | No |
| draft | pending_review → approved | Fast-track auto-approve | System (agent verified) | **Yes** |
| pending_review | approved | `listing.approve` | Super admin | **Yes** |
| pending_review | rejected | `listing.reject` | Super admin | No |
| draft | deleted | `listing.delete` | Owner/super_admin | No |
| any | archived | `listing.archive` | Owner | No new record; archives linked projection |
| published | sold/rented | Manual status update | Owner/admin | No new record |
| published | archived | `listing.archive` | Owner | No new record; archives linked projection |
| published | *(updated)* | `listing.update` | Owner | Updates existing property |

Archive sets the listing status and archives the linked `properties` projection when the `sourceListingId` bridge is available.

### Precondition Gates (submitForReview)

1. Readiness score >= 75%
2. WhatsApp contact number set on agent or owner profile
3. Fast-track: readiness === 100% AND quality >= 85 AND agent.verified === true
   → auto-approves (skips manual queue, creates property immediately)

---

## 3. Contract Assertions (Characterisation Tests)

Each assertion below is backed by a test in `server/__tests__/contract.listing-lifecycle.test.ts`.

### 3.1 Draft Creation

**Contract:** Creating a draft listing MUST NOT create a properties record.

**Test:** `create draft does not create property projection`

**Current behaviour:** `listing.create` inserts into `listings` only. PASS.

### 3.2 Identity Preservation

**Contract:** Updating and then submitting a listing MUST preserve the same `listings.id` throughout.

**Test:** `update and submit preserve same listing id`

**Current behaviour:** `listing.update` uses the existing `input.id`. `listing.submitForReview` reads the listing by that same ID. PASS.

### 3.3 Rejection Safety

**Contract:** Rejecting a listing MUST NOT create or activate public inventory. A rejected listing MUST have no properties row.

**Test:** `rejection never creates property projection`

**Current behaviour:** `listing.reject` sets `status='rejected'` and updates the approval queue. It does not insert into `properties`. PASS.

### 3.4 Approval Creates Exactly One Property

**Contract:** Approving a listing MUST create exactly one properties row with `sourceListingId` set to the listing's ID.

**Test:** `approval creates exactly one property with sourceListingId`

**Current behaviour:** `db.approveListing()` inserts a new `properties` row with `sourceListingId` when the bridge column is available, or updates the existing row found by `sourceListingId`. PASS.

### 3.5 Repeated Approval Idempotency

**Contract:** Calling approve on an already-approved/published listing MUST NOT create a duplicate properties row.

**Test:** `repeated approval does not duplicate property projection`

**Current behaviour:** `approveListing()` checks for an existing `properties.sourceListingId = listingId` projection before insert. If found, it updates that projection in-place and preserves public counters. PASS.

### 3.6 Media Mirroring

**Contract:** Approving a listing MUST mirror listing_media images into propertyImages and set properties.mainImage.

**Test:** `approval mirrors listing media to propertyImages`

**Current behaviour:** `approveListing()` replaces the existing `propertyImages` mirror with the current `listing_media` image set and updates `properties.mainImage`. PASS.

### 3.7 Published Media Update

**Contract:** Editing media replaces the ordered canonical `listing_media` manifest. Existing media is retained only when explicitly included, new uploads preserve their declared media type, and re-approval updates the same properties projection rather than creating a new one.

**Tests:** `replaces the canonical media manifest when an edit provides typed media`, `replaceListingMedia (lower-level)`, and `listing media reconciliation`

**Current behaviour:** `listing.update` reconciles the typed media manifest into `listing_media`. A published or approved listing is returned to review, so its existing public projection remains unchanged until approval. `approveListing()` then mirrors image media into the existing `properties.sourceListingId` projection. The mirror uses `sourceListingId` first, with legacy matching only for unbridged records. PASS.

### 3.8 Lead Traceability

**Contract:** A lead attached to a propertyId MUST be resolvable to the originating sourceListingId.

**Test:** `lead can be resolved from propertyId to sourceListingId`

**Current behaviour:** Leads store `propertyId`. Published listing lead lookup resolves the public projection through `resolvePropertyForListing()`, which can use the `sourceListingId` bridge and retains legacy fallback for older projection rows. PASS with fallback risk for pre-bridge records.

### 3.9 Archive Behaviour

**Contract:** Archiving a published listing MUST either cascade to the property (hide from search) or document why it cannot.

**Test:** `archive behaviour is documented even if incomplete`

**Current behaviour:** `listing.archive` sets `listings.status='archived'` and `archiveListing()` also archives the linked public projection by `sourceListingId` when the bridge column is available. PASS.

### 3.10 Delete Cascade

**Contract:** Deleting a listing MUST cascade to media, approval queue, leads, and analytics.

**Test:** `delete cascades to related records`

**Current behaviour:** `db.deleteListing()` soft-archives the linked public projection by `sourceListingId` before deleting listing-owned records. The public row is preserved as archived rather than hard-deleted. PASS.

### 3.11 Legacy Identity Matching

**Contract:** The legacy owner/title/address/province matching used by `syncPublishedListingMediaToPropertyMirror` MUST be compatibility-only and never preferred over `sourceListingId`.

**Test:** `sync uses legacy matching as fallback, not primary`

**Current behaviour:** `syncPublishedListingMediaToPropertyMirror` uses `sourceListingId` first. Legacy placeId/identity matching is compatibility-only and only used when no bridged projection exists; a legacy match is stamped with `sourceListingId`. PASS.

### 3.12 Action Parity

**Contract:** Sale, rent, and auction listings follow the same identity lifecycle — the same `listings.id`, the same `properties.sourceListingId` bridge, the same media mirror pattern.

**Tests:** Three separate parameterised test cases (sell, rent, auction) verify each action through the lifecycle.

**Current behaviour:** The router and db functions treat all three actions uniformly. PASS.

---

## 4. Bridge Hardening Status

| ID | Contract | Status | Evidence |
|----|----------|--------|----------|
| G-1 | Approval idempotency by `sourceListingId` | Fixed | `approveListing()` updates existing projections and inserts only when no bridge row exists. |
| G-2 | Published media sync uses `sourceListingId` first | Fixed | `syncPublishedListingMediaToPropertyMirror()` queries by bridge first, then falls back to unbridged legacy rows and stamps the bridge. |
| G-3 | Archive hides public projection | Fixed | `archiveListing()` archives `properties` rows linked by `sourceListingId`. |
| G-4 | Hard delete does not leave live public projection | Fixed | `deleteListing()` soft-archives the linked public projection before deleting listing-owned rows. |
| G-5 | Wrong-state guards | Fixed | `approveListing()` rejects already live/terminal records while preserving current draft fast-track approval. `rejectListing()` now accepts only `pending_review`. |
| G-6 | Fast-track approval shares canonical projection path | Preserved | `submitForReview` still routes trusted fast-track approvals through `approveListing()`. |

Router guarantee: lifecycle-state approve/reject errors are returned as tRPC
`BAD_REQUEST`; unrelated server errors remain internal.

Residual risks:

- Environments without the `properties.sourceListingId` column retain legacy insert/match behavior by design through the bridge capability guard.
- Pre-bridge property rows can still be matched by placeId or owner/title/address/city/province, but successful legacy matches are stamped with `sourceListingId`.

---

## 5. Verification Coverage

| Area | Tests |
|------|-------|
| Router lifecycle contract | `server/__tests__/contract.listing-lifecycle.test.ts` |
| DB bridge behavior | `server/__tests__/contract.listing-lifecycle-db.test.ts` |
| Persisted media reconciliation | `server/__tests__/integration.listing-media-reconciliation.test.ts` |
| Source document | `docs/listing-engine/CANONICAL_LISTING_LIFECYCLE.md` |

## 6. V2 Implementation Notes

### V2 Wizard Shell (feature/intelligent-listing-engine-v2-baseline)

- The V2 wizard shell (`ListingWizardV2.tsx`, `ListingWizardEngine.tsx`) is a purely frontend feature behind `VITE_LISTING_WIZARD_V2_ENABLED`.
- It uses the same `listingRouter` endpoints (`create`, `update`, `submitForReview`) as V1.
- The V2 dry-run/readiness helpers (`calculateSubmitReadinessDryRun`) are client-side only and do not call the backend.
- No V2-specific changes to the listing lifecycle are present in the baseline.

### Continuation Recommendation

1. Audit and backfill legacy public `properties` rows without `sourceListingId`
   only where the canonical listing can be proven safely.
2. Decide the V2 draft persistence schema question before recovering backend draft parity.
3. Keep production on V1 until V2 drafts, edit mode, media, preview, submit, public projection and rollback behavior are proven end to end.
