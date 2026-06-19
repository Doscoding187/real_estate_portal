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

### Media Architects

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
| any | archived | `listing.archive` | Owner | No* |
| published | sold/rented | Manual status update | Owner/admin | No new record |
| published | archived | `listing.archive` | Owner | No* |
| published | *(updated)* | `listing.update` | Owner | Updates existing property |

*\* Archive sets the listing status but does NOT cascade to the properties projection (current gap).*

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

**Current behaviour:** `db.approveListing()` inserts a new `properties` row and sets `sourceListingId` if the column exists in the schema. PASS (conditional on schema capability).

### 3.5 Repeated Approval Idempotency

**Contract:** Calling approve on an already-approved/published listing MUST NOT create a duplicate properties row.

**Test:** `repeated approval does not duplicate property projection`

**Current behaviour:** `approveListing()` does NOT check whether a property already exists for this listingId. It inserts unconditionally. **GAP — risk of duplicate public records.**

### 3.6 Media Mirroring

**Contract:** Approving a listing MUST mirror listing_media images into propertyImages and set properties.mainImage.

**Test:** `approval mirrors listing media to propertyImages`

**Current behaviour:** `approveListing()` iterates over `listing_media` and inserts image-type items into `propertyImages` with `propertyId` set to the new property ID. Main image is also set. PASS (for initial approval).

### 3.7 Published Media Update

**Contract:** Updating media on a published listing MUST update the same properties projection (not create a new one).

**Test:** `updating published listing media updates same property projection`

**Current behaviour:** `listing.update` calls `syncPublishedListingMediaToPropertyMirror(listingId)` which finds the property by **legacy identity match** (ownerId + title + address + city + province) rather than `sourceListingId`. **GAP — identity resolution is fragile and bypasses the canonical bridge.**

### 3.8 Lead Traceability

**Contract:** A lead attached to a propertyId MUST be resolvable to the originating sourceListingId.

**Test:** `lead can be resolved from propertyId to sourceListingId`

**Current behaviour:** Leads store `propertyId`. To resolve back to `sourceListingId`, the system must query `properties.sourceListingId` from the property id. The `listing.getLeads` endpoint resolves via `resolvePropertyForListing()` which uses legacy owner/title/address matching as fallback. **GAP — traceability relies on legacy matching when sourceListingId is absent.**

### 3.9 Archive Behaviour

**Contract:** Archiving a published listing MUST either cascade to the property (hide from search) or document why it cannot.

**Test:** `archive behaviour is documented even if incomplete`

**Current behaviour:** `listing.archive` sets `listings.status='archived'` but does NOT update `properties.status`. The property remains visible in public search. **GAP — archive does not cascade to public projection.**

### 3.10 Delete Cascade

**Contract:** Deleting a listing MUST cascade to media, approval queue, leads, and analytics.

**Test:** `delete cascades to related records`

**Current behaviour:** `db.deleteListing()` deletes listing_media, listing_approval_queue, listing_analytics, and leads associated with the listing ID. The properties row is NOT deleted. **GAP — hard delete leaves orphaned property records.**

### 3.11 Legacy Identity Matching

**Contract:** The legacy owner/title/address/province matching used by `syncPublishedListingMediaToPropertyMirror` MUST be compatibility-only and never preferred over `sourceListingId`.

**Test:** `sync uses legacy matching as fallback, not primary`

**Current behaviour:** `syncPublishedListingMediaToPropertyMirror` tries `placeId` first, then falls back to ownerId + title + address + city + province match. It does NOT use `sourceListingId` at all. **GAP — the canonical bridge is bypassed.**

### 3.12 Action Parity

**Contract:** Sale, rent, and auction listings follow the same identity lifecycle — the same `listings.id`, the same `properties.sourceListingId` bridge, the same media mirror pattern.

**Tests:** Three separate parameterised test cases (sell, rent, auction) verify each action through the lifecycle.

**Current behaviour:** The router and db functions treat all three actions uniformly. PASS.

---

## 4. Gap Report

### G-1: Repeated approval creates duplicate properties

| Aspect | Detail |
|--------|--------|
| **Current behaviour** | `approveListing()` inserts a new `properties` row every time it is called, regardless of whether one already exists for that listing. |
| **Desired contract** | Approval MUST be idempotent. If a property with `sourceListingId = listingId` already exists, `approveListing()` should update it in-place rather than inserting a duplicate. |
| **Risk** | Duplicate public records for the same canonical listing cause confusion, split analytics, and potential double-counting in search. |
| **Recommended Phase 3B fix** | Before inserting, query `properties` for `sourceListingId = listingId`. If found, UPDATE that row (denormalised fields, media mirror). Only INSERT if not found. |

### G-2: Media sync bypasses sourceListingId

| Aspect | Detail |
|--------|--------|
| **Current behaviour** | `syncPublishedListingMediaToPropertyMirror()` finds the property mirror by placeId or legacy identity match (ownerId + title + address + city + province). It never uses `properties.sourceListingId`. |
| **Desired contract** | Media sync MUST use `sourceListingId = listingId` as the primary lookup. Legacy matching must only be used as a fallback for pre-contract records. |
| **Risk** | Title/address changes cause media sync to miss the correct property or sync to a wrong one. The canonical bridge is effectively unused. |
| **Recommended Phase 3B fix** | Add `eq(properties.sourceListingId, listingId)` as the primary WHERE clause in `syncPublishedListingMediaToPropertyMirror()`. Keep the identity fallback only for properties where `sourceListingId IS NULL`. |

### G-3: Archive does not cascade to public property

| Aspect | Detail |
|--------|--------|
| **Current behaviour** | `listing.archive` sets `listings.status='archived'` but does not touch `properties.status`. The property remains `'available'` and visible in public search. |
| **Desired contract** | Archiving a published listing SHOULD set `properties.status` to `'archived'` (or at least `'pending'`) to remove it from public search. At minimum, the gap must be documented. |
| **Risk** | Sold/rented/archived listings continue appearing in search results, causing user confusion and wasted agent enquiries. |
| **Recommended Phase 3B fix** | In `archiveListing()`, after updating the listing, also `UPDATE properties SET status = 'archived' WHERE sourceListingId = listingId`. |

### G-4: Hard delete orphans public properties

| Aspect | Detail |
|--------|--------|
| **Current behaviour** | `deleteListing()` cascades to media, approval queue, analytics, and leads, but does NOT delete or archive the corresponding `properties` row. |
| **Desired contract** | Hard-deleting a listing SHOULD either cascade-delete the property projection or archive it (soft). A hard delete must not leave orphaned public records. |
| **Risk** | Orphaned property records point to a non-existent listing. If `sourceListingId` is the bridge, queries that JOIN across tables will return partial data or error. |
| **Recommended Phase 3B fix** | In `deleteListing()`, add `DELETE FROM properties WHERE sourceListingId = listingId` (or set status = `'archived'` if hard-deleting properties is undesirable). |

### G-5: Approve/Reject should guard against wrong state

| Aspect | Detail |
|--------|--------|
| **Current behaviour** | `approveListing()` does not check whether the listing is currently in a submittable state (`draft` or `pending_review`). `rejectListing()` similarly has no state guard. |
| **Desired contract** | Approve should only work from `pending_review`. Reject should only work from `pending_review`. Both should throw if the listing is already published/rejected/deleted. |
| **Risk** | Accidental re-approval of an already-published listing creates a duplicate property (G-1). Accidental rejection of a published listing is unrecoverable. |
| **Recommended Phase 3B fix** | At the top of `approveListing()` and `rejectListing()`, check `listing.status` and throw if not `'pending_review'`. |

### G-6: Fast-track auto-approve creates property synchronously

| Aspect | Detail |
|--------|--------|
| **Current behaviour** | The fast-track path in `submitForReview` calls `approveListing()` directly. This creates a property synchronously during the submit mutation. |
| **Desired contract** | The contract is acceptable — fast-track bypasses the manual queue — but the property creation logic is shared with `listing.approve` so any fix to G-1/G-5 applies to both paths. |
| **Risk** | Low (shared code). Documented for awareness. |
| **Recommended Phase 3B fix** | No separate fix needed; covered by G-1 and G-5. |

---

## 5. Summary of Gaps by Severity

| ID | Gap | Severity | Fix scope |
|----|-----|----------|-----------|
| G-1 | Repeated approval creates duplicate properties | **High** | `db.approveListing()` — check before insert |
| G-2 | Media sync bypasses sourceListingId | **Medium** | `syncPublishedListingMediaToPropertyMirror()` — use sourceListingId |
| G-3 | Archive does not cascade to public property | **Medium** | `db.archiveListing()` — also update properties.status |
| G-4 | Hard delete orphans public properties | **Medium** | `db.deleteListing()` — cascade or archive property |
| G-5 | Approve/Reject missing state guards | **Low** | Guard clauses in approveListing/rejectListing |
| G-6 | Fast-track shares same approval code | **Low** | Covered by G-1/G-5 |

## 6. V2 Implementation Notes

### V2 Wizard Shell (feature/intelligent-listing-engine-v2-baseline)

- The V2 wizard shell (`ListingWizardV2.tsx`, `ListingWizardEngine.tsx`) is a purely frontend feature behind `VITE_LISTING_WIZARD_V2_ENABLED`.
- It uses the same `listingRouter` endpoints (`create`, `update`, `submitForReview`) as V1.
- The V2 dry-run/readiness helpers (`calculateSubmitReadinessDryRun`) are client-side only and do not call the backend.
- No V2-specific changes to the listing lifecycle are present in the baseline.

### Phase 3B Identity Hardening (applied)

1. **G-1+G-5**: `approveListing()` now upserts by `sourceListingId` (UPDATE if exists, INSERT if not) and rejects already-published listings.
2. **G-2**: `syncPublishedListingMediaToPropertyMirror()` uses `sourceListingId` as primary identity lookup; legacy fallback only for `sourceListingId IS NULL`; stamps `sourceListingId` on matched legacy records.
3. **G-3**: `archiveListing()` cascades `properties.status='archived'` by `sourceListingId`.
4. **G-4**: `deleteListing()` soft-archives the linked property by `sourceListingId` before hard-deleting the listing.

### Phase 3B.1 Bridge Capability Hardening (applied)

All `sourceListingId` queries are guarded behind `getInventoryBridgeSchemaCapabilities(db).propertiesSourceListingIdColumn`:
- **approveListing**: idempotency upsert only when bridge column exists; falls back to unconditional INSERT.
- **syncPublishedListingMediaToPropertyMirror**: sourceListingId primary lookup only when bridge column exists; legacy matching without `isNull(sourceListingId)` filter otherwise.
- **archiveListing** / **deleteListing**: cascade only when bridge column exists.

### Deletion Semantics (explicit)

`deleteListing()` hard-deletes the listing row but soft-archives the linked property projection (`properties.status='archived'`). However, the schema has `properties.sourceListingId ON DELETE SET NULL`, so the final `DELETE FROM listings` nulls out the identity bridge. This is the chosen semantics:
- The public property row is preserved for historical analytics and lead traceability, but it becomes an orphan (no canonical listing link).
- This is acceptable for "hard delete" scenarios (admin removal of spam/duplicate listings) but should not be used if full traceability must be preserved.
- If full lifecycle traceability is required, use `archiveListing()` instead, which keeps the listing row intact.

### Production risk notes

- `getInventoryBridgeSchemaCapabilities()` caches the column-existence check (TTL 300s), so it is safe to call repeatedly within a single request.
- All `dataListingId` queries use both `eq(sourceListingId, id)` AND `isNotNull(sourceListingId)` to avoid matching rows with `NULL` bridge column references.
- Legacy fallback paths remain active for records created before the bridge column migration.

### Post-Phase-3B Gaps

All 6 Phase 3A gaps (G-1 through G-6) are now closed. No `.skip` tests remain in the lifecycle contract test suite.
