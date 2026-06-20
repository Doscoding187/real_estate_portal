# V2 Draft Persistence Contract

## 1. Objective

Define the contract for persisting V2 wizard drafts on the server. This is a **design/contract document** — no implementation is done in this phase.

## Schema Gap (correction)

**The `listings` table does NOT currently have a `draftData` column.** The Drizzle schema at `drizzle/schema/listings.ts` has `propertyDetails`, `qualityBreakdown`, and `rejectionReasons` as JSON columns, but no `draftData`. The only `draftData` column in this codebase exists on `developmentDrafts` (in `drizzle/schema/developments.ts`).

This means Phase 3C.1 **must** include a schema migration. See §4.3.

## 2. Decision Record

### 2.1 When a server draft should be created

**Decision: Create a listing row on first explicit user save, not at step 1.**

Rationale:
- Auto-creating a listing at step 1 would produce hundreds of abandoned rows per user (bounce rate on step 1 wizard starts is typically >40%).
- The V1 wizard already creates a listing row only after the user fills the first form page and clicks "Next" (Basic Information step). V2 should match this expectation.
- The client-side Zustand store (with `localStorage` persistence via `zustand/middleware/persist`) already provides crash recovery for in-progress drafts that have never been server-saved. This is sufficient for ephemeral state.

Explicit save triggers:
| Trigger | Creates server row? | Notes |
|---------|-------------------|-------|
| User clicks "Save Draft" in V2 | ✅ Yes | Primary explicit save action |
| User completes Step 1 (Action + Property Type) and presses Next | ❌ No | Client-only until first explicit save |
| User completes Basic Info (title, description, location) | ❌ No | Client-only until first explicit save |
| User closes browser mid-wizard | ✅ Recovered from `localStorage` | No data loss risk |
| Auto-save timer fires (e.g. 60s debounce) | ✅ Yes, if first save exists | Only updates existing draft; does not create one |
| User returns to existing server draft | ✅ Loads from server, merges with `localStorage` | Server is authoritative once a server row exists |

### 2.2 Whether V2 creates a listing row at step 1, after minimum required identity, or only on explicit save

**Decision: Only on explicit "Save Draft" or auto-save after first server save.**

The listing (canonical authoring object) is the draft. There is no separate `drafts` table — the `listings` table serves as the draft store.

Minimum required identity for a server row:
- `ownerId`: derived from authenticated user (always available)
- `agentId`: derived from user's agent profile (always available if user is an agent)
- `action`: must be set before first save is allowed
- `propertyType`: must be set before first save is allowed
- `status`: always `'draft'`
- `slug`: auto-generated from title (which may be empty for first save) — use a UUID-based fallback slug

These are the minimum fields because:
- `action` and `propertyType` define the entire workflow shape (which steps are visible, which validation rules apply).
- Without these, the server cannot build a validation context or calculate readiness.
- These are set on the first screen after the "Create Listing" button (Step 1 in V2).

Constraints on first save:
| If ... | Then ... |
|--------|----------|
| `action` is undefined | Show client error "Select listing type before saving" |
| `propertyType` is undefined | Show client error "Select property type before saving" |
| Both are set | Save proceeds, `slug` = UUID fallback if no title |
| Title is empty | Slug = `draft-{uuid}` |

### 2.3 How partial wizard state should be represented

**Decision: Use a single `draftData` JSON column on the `listings` table (to be added via migration).**

This follows the same pattern used by the Development Wizard (`developmentDrafts.draftData`). The column does not exist yet — it must be added before Phase 3C.1 implementation.

The `listings` table will hold:
- **Normalized columns** for well-known, queryable fields: id, `ownerId`, `agentId`, `action`, `propertyType`, `title`, `description`, `address`, `city`, `province`, `latitude`, `longitude`, `slug`, `status`, `createdAt`, `updatedAt`.
- **A `draftData` JSON column** for the full wizard state snapshot, including partial/transient fields that do not have dedicated columns: `currentStep`, `completedSteps`, `badges`, `basicInfo`, `additionalInfo`, partial `pricing`, partial `propertyDetails`, `mainMediaId`, `displayMediaType`, `errors`, `isValid`.

`draftData` schema (V2 wizard state minus computed/security fields):
```typescript
interface V2DraftData {
  currentStep: number;
  completedSteps: number[];
  badges?: ListingBadge[];
  basicInfo?: Partial<BasicInformation>;
  additionalInfo?: AdditionalInformation;
  pricing?: Partial<PricingFields>;     // any subset of pricing fields
  propertyDetails?: Partial<PropertyDetails>;
  location?: LocationData;              // if not yet promoted to columns
  mainMediaId?: string;
  displayMediaType?: 'image' | 'video';
  errors: ValidationError[];
  isValid: boolean;
}
```

Normalization rules:
| State field | Dedicated column? | When promoted |
|-------------|------------------|---------------|
| `action` | ✅ `listings.action` | On first save |
| `propertyType` | ✅ `listings.propertyType` | On first save |
| `title` | ✅ `listings.title` | When non-empty |
| `description` | ✅ `listings.description` | When non-empty |
| `location.address` | ✅ `listings.address` | When non-empty |
| `location.city` | ✅ `listings.city` | When non-empty |
| `location.province` | ✅ `listings.province` | When non-empty |
| `location.latitude` | ✅ `listings.latitude` | When non-zero |
| `location.longitude` | ✅ `listings.longitude` | When non-zero |
| `pricing.*` | ✅ individual columns | When a value is provided |
| `basicInfo` | ❌ stays in `draftData` | Transient group |
| `additionalInfo` | ❌ stays in `draftData` | Transient group |
| `badges` | ❌ stays in `draftData` | Transient group |
| `currentStep` | ❌ stays in `draftData` | Session-only |
| `completedSteps` | ❌ stays in `draftData` | Session-only |
| `errors` | ❌ stays in `draftData` | Computed, session-only |
| `media` | ❌ stored in `listingMedia` table | On save with media IDs |

### 2.4 Which fields belong in normalized columns versus JSON snapshot

The current `listings` schema already has dedicated columns for most listing fields. The `draftData` JSON column holds only what cannot be mapped to existing columns:

**In dedicated columns (already exist in `listings`):**
- `ownerId`, `agentId`, `action`, `propertyType`, `title`, `description`
- `askingPrice`, `negotiable`, `transferCostEstimate`, `monthlyRent`, `deposit`, `leaseTerms`, `availableFrom`, `utilitiesIncluded`, `startingBid`, `reservePrice`, `auctionDateTime`, `auctionTermsDocumentUrl`
- `propertyDetails` (already JSON)
- `address`, `latitude`, `longitude`, `city`, `suburb`, `province`, `postalCode`, `placeId`, `locationId`
- `slug`, `status`, `approvalStatus`, `readinessScore`, `qualityScore`, `qualityBreakdown`
- `createdAt`, `updatedAt`, `publishedAt`

**In `draftData` JSON only (no dedicated column, or not yet promoted):**
- `currentStep`, `completedSteps`
- `badges[]`
- `basicInfo` (depositAmount, leaseTerm, occupationDate, availability)
- `additionalInfo` (propertyHighlights, additionalRooms, securityFeatures, outdoorFeatures, etc.)
- Partial pricing/propertyDetails before they are valid
- `mainMediaId`, `displayMediaType`
- `errors[]`, `isValid`
- `media` (FIFO queue of pending uploads — full media metadata lives in `listingMedia`)

### 2.5 How media upload attaches before final submission

Media upload is S3-based (unchanged). The V2 wizard uses the existing S3 upload flow.

Upload flow:
1. User selects files → frontend uploads to S3 → gets back S3 keys (media IDs)
2. S3 keys are stored in the wizard state (`media: MediaFile[]`) with metadata (type, displayOrder, isPrimary)
3. On explicit save, S3 keys are written to `listingMedia` table via `saveDraft`'s own media handling
4. Media is NOT attached to a listing before first save (no listing row exists)
5. After first save, re-saving appends new media and removes deleted media

For draft rows that have never been saved, media S3 keys live in Zustand `localStorage` and are uploaded again if the user returns. S3 lifecycle policies handle orphaned uploads (standard practice).

### 2.6 How draft recovery works across devices

**Decision: Server-side draft is authoritative. Client-side `localStorage` is a cache/fallback.**

Recovery flow:
1. User opens V2 wizard → load from server: `trpc.listing.getDrafts`
2. If a server draft exists for this user with `status === 'draft'`:
   - Load the draft into wizard state
   - Merge with `localStorage` snapshot (local may have newer unsaved changes)
   - Server wins on conflict for identity fields; local wins for transient UI state (currentStep, completedSteps)
3. If no server draft exists:
   - Load from `localStorage` only
   - Show clean wizard with no server backing

Multi-device scenario:
- User saves draft on Device A → server row exists
- User opens V2 on Device B → loads server draft
- Local changes on Device A that were never server-saved are lost (acceptable: this is a draft, not a canonical record)
- Future auto-save with debounce reduces loss window to <60s

### 2.7 How agency/agent ownership and collaboration should work

**Decision: Simple ownership model for V2 — no collaboration on drafts.**

- `listings.ownerId` = the creating user's ID
- `listings.agentId` = the creating agent's profile ID (looked up from `ownerId`)
- Only the owner can view/edit their draft
- No team collaboration on drafts in V2 (this can be added later with `agencyId` support)
- Admin/super_admin can view any draft (existing pattern)

### 2.8 Revision/concurrency strategy

**Decision: Last-write-wins with `updatedAt` optimism.**

No revision history. Drafts are transient. Rationale:
- Drafts are explicitly not canonical records (published listings are canonical)
- Versioning drafts adds complexity with minimal benefit
- The `updatedAt` timestamp allows clients to detect stale state
- Future: if revision tracking is needed, it belongs on the published listing, not the draft

Conflict resolution:
| Scenario | Resolution |
|----------|-----------|
| Two tabs open same draft | Last save wins |
| User A saves draft, User B opens on different device | Last save wins (server is authoritative) |
| Offline save conflicts with server save | Server timestamp wins; client shows "newer version exists" prompt |

### 2.9 Date serialization strategy

**Decision: ISO-8601 strings in API, MySQL datetime in DB.**

| Layer | Format | Example |
|-------|--------|---------|
| API (tRPC input/output) | ISO-8601 string | `"2026-06-20T12:00:00.000Z"` |
| DB (`listings` table) | MySQL datetime | `"2026-06-20 12:00:00"` |
| `draftData` JSON | ISO-8601 string | `"2026-06-20T12:00:00.000Z"` |

Conversion:
- On save: `new Date(input.isoString).toISOString().slice(0, 19).replace('T', ' ')`
- On load: read as-is from `listings` MySQL column; `draftData` dates remain ISO strings

### 2.10 Failure/retry behavior

**Decision: Fail-fast with clear error. No automatic retry for draft saves.**

- If save fails → `saveStatus` becomes `'error'`, client shows "Draft not saved" toast
- User can retry manually
- Auto-save will retry on next interval (60s debounce)
- No exponential backoff — this is not a production-critical write
- Maximum draft save payload: 1MB (Zustand state + `draftData` JSON)
- If payload exceeds limit → server returns `PAYLOAD_TOO_LARGE`, client shows error

### 2.11 How V1 compatibility is preserved

**Decision: V2 uses the same `listings` table as V1 via new draft procedures. Existing endpoints are untouched.**

- V2 creates a row in `listings` — same table as V1
- V2 sets `status = 'draft'` — same as V1
- V1 and V2 listings are indistinguishable at the DB level (good: same approval/publishing pipeline)
- **V2 does NOT reuse `listing.create`, `listing.update`, or `listing.submitForReview`.** These remain strict and unchanged:
  - `listing.create` — requires full listing payload (title min 10, description min 50, pricing, propertyDetails, location, mediaIds). V2 draft saves do not call this endpoint.
  - `listing.update` — requires `id: number`, assumes an existing row. V2 draft saves use `saveDraft` instead.
  - `listing.submitForReview` — requires readiness/quality scores, triggers review workflow. V2 submissions will call this endpoint, but only after the user explicitly submits for review.
- V2 draft persistence uses **new procedures**: `listing.saveDraft`, `listing.getDraft`, `listing.getDrafts`, `listing.deleteDraft`
- **Schema addition**: a `draftData` JSON column is added to `listings` (absent today). This column is `NULL` for V1 rows, causing zero impact on V1.
- No existing columns are altered or removed
- No new tables are created
- V1 continues unaffected — neither the V1 wizard nor existing listings are modified
- The V2 feature flag (`VITE_LISTING_WIZARD_V2_ENABLED`) only affects frontend routing

## 3. Characterization Tests

### 3.1 Existing `listing.create` cannot accept very incomplete drafts
→ The `createListingSchema` requires `title` (min 10), `description` (min 50), `pricing` (object), `propertyDetails`, `location` with specific fields, and `mediaIds` (array). A completely empty state (only `action` and `propertyType`) is rejected. This is by design — `create` is the V1 submission endpoint and remains strict. V2 must use a new `saveDraft` procedure with relaxed validation.

### 3.2 Existing `listing.update` assumes a listing id already exists
→ The `update` mutation requires `id: number`. It cannot create a new listing. Calling update without a prior create fails. V2 must not reuse `update` for draft saves — it uses `saveDraft` which handles both create and update via the `id` field.

### 3.3 Current `createListingSchema` required fields prevent early partial saves
→ The schema enforces `.min(10)` on title and `.min(50)` on description. A first-step-only draft with empty description is rejected at the Zod level. This confirms that V2 cannot reuse `listing.create` and needs a dedicated `saveDraft` endpoint.

### 3.4 Existing submit/review/publication paths must remain unchanged
→ `submitForReview` requires a full listing (`status: 'draft'` → `status: 'pending_review'`). Incomplete drafts must never reach this endpoint.

### 3.5 V2 draft contract must not call approval/publishing logic
→ Draft save should only update `listings` and `listingMedia`. It must NOT call `syncPublishedListingMediaToPropertyMirror`, `approveListing`, or any approval/publishing logic.

## 4. Phase 3C.1 Implementation Plan

### 4.0 Scope

Phase 3C.1 adds new draft procedures to `listingRouter.ts`. It does NOT modify existing procedures.

| Endpoint | Phase 3C.1 action | Remains unchanged? |
|----------|-------------------|-------------------|
| `listing.create` | None | ✅ Fully strict, unchanged |
| `listing.update` | None | ✅ Existing behavior, unchanged |
| `listing.submitForReview` | None | ✅ Existing behavior, unchanged |
| `listing.approve` | None | ✅ Unchanged |
| `listing.reject` | None | ✅ Unchanged |
| `listing.saveDraft` | **Add new** | N/A |
| `listing.getDraft` | **Add new** | N/A |
| `listing.getDrafts` | **Add new** | N/A |
| `listing.deleteDraft` | **Add new** | N/A |

Phase 3C.1 may add `import` statements, helper functions, and Zod schemas to `listingRouter.ts` strictly for the new draft procedures. No existing route handler, middleware, or schema is modified.

### 4.1 Proposed endpoint names

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `listing.saveDraft` | mutation | Create or update a V2 wizard draft |
| `listing.getDraft` | query | Get a single draft by ID |
| `listing.getDrafts` | query | List user's drafts (status = 'draft') |
| `listing.deleteDraft` | mutation | Delete a draft |

### 4.2 Proposed input/output types

**`saveDraft`:**
```typescript
// Input
z.object({
  id: z.number().optional(),       // omit for first save, include for subsequent saves
  action: z.enum([...]),           // required on first save
  propertyType: z.enum([...]),     // required on first save
  title: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  pricing: z.object({...}).partial().optional(),
  propertyDetails: z.record(z.any()).optional(),
  location: z.object({...}).partial().optional(),
  mediaIds: z.array(z.string()).optional(),
  mainMediaId: z.string().optional(),
  badges: z.array(z.any()).optional(),
  basicInfo: z.any().optional(),
  additionalInfo: z.any().optional(),
  currentStep: z.number().optional(),
  completedSteps: z.array(z.number()).optional(),
})

// Output
z.object({
  id: z.number(),
  success: z.boolean(),
  slug: z.string().optional(),
  createdAt: z.string().optional(),
})
```

**`getDraft`:**
Input: `z.object({ id: z.number() })`
Output: Full listing row + `draftData` JSON merged.

**`getDrafts`:**
Input: none (from auth context)
Output: Array of `{ id, title, action, propertyType, status, updatedAt, slug }`

**`deleteDraft`:**
Input: `z.object({ id: z.number() })`
Output: `{ success: boolean }`

### 4.3 Whether schema change is required

**Schema change required.** Phase 3C.1 must include a migration step before saveDraft implementation can begin.

The `listings` table does not have a `draftData` column. The Drizzle schema at `drizzle/schema/listings.ts` confirms no `draftData` column exists. A `draftData` JSON column must be added via `drizzle-kit generate && drizzle-kit migrate`.

No other schema changes are required. No existing columns are altered or removed.

### 4.4 Migration risk

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `draftData` column missing | **Certain** (not in schema) | Add via `drizzle-kit generate && drizzle-kit migrate` — required step of Phase 3C.1 |
| Existing V1 drafts break | None | V1 already sets `status = 'draft'` with the same columns; `draftData` defaults to `NULL` on existing rows |
| Index bloat | Low | SaveDraft is not write-heavy; no new indexes needed |
| Rollback difficulty | Low | `ALTER TABLE listings DROP COLUMN draftData` is safe; no data loss on V1 rows (`draftData` will be `NULL`) |

### 4.5 Test plan

| Test category | Tests |
|--------------|-------|
| saveDraft unit | Creates listing with minimum fields (action + propertyType) |
| | Updates existing draft by ID |
| | Rejects save without action |
| | Rejects save without propertyType |
| | Saves partial state as `draftData` JSON |
| | Promotes known fields to normalized columns |
| | Does NOT call approval/publishing logic |
| getDraft | Returns draft by ID |
| | Returns 404/error for non-existent draft |
| | Filters by ownerId (cannot see other user's draft) |
| getDrafts | Returns list of user's drafts |
| | Does NOT return V1 non-draft listings |
| deleteDraft | Deletes draft and media |
| | Archives linked property if published (same as V1) |
| V1 compatibility | CreateListingSchema still rejects incomplete input |
| | Existing submit/review flow unchanged |
| | Existing approval/publishing flow unchanged |

### 4.6 Rollout plan behind V2 flag

| Step | Action |
|------|--------|
| 0 | **Migration**: add `draftData` JSON column to `listings` via `drizzle-kit generate && drizzle-kit migrate`. Update `drizzle/schema/listings.ts` to include the column definition. |
| 1 | Add `saveDraft`/`getDrafts`/`getDraft`/`deleteDraft` endpoints to `listingRouter` |
| 2 | Wire `saveDraft` into the V2 Zustand store (replace stub `saveDraft` with tRPC call) |
| 3 | Wire `getDrafts` into V2 startup (load from server) |
| 4 | Add auto-save with 60s debounce |
| 5 | Add draft resume dialog (server list + local merge) |
| 6 | All gated behind `VITE_LISTING_WIZARD_V2_ENABLED` |
| 7 | Enable for internal testing |
| 8 | Enable for beta users |
| 9 | Monitor, iterate, then GA |

The V1 path (`/listings/create`) remains unaffected throughout. V2 is always behind the feature flag.

### 4.7 Build timeout note

`pnpm build` timed out during Vite "rendering chunks" in Phase 3C.0.1 (pre-existing project performance issue, not related to draft contract changes). In Phase 3C.1, run with `NODE_OPTIONS="--max-old-space-size=4096" pnpm build` or a longer timeout. Only new `saveDraft`/`getDraft`/`getDrafts`/`deleteDraft` code will be added — no production code paths are modified.
