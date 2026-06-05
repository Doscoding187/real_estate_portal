# Development Listing Engine - Source of Truth & Recovery Discipline

## 1. Intelligent Goal

Build the Development Listing Engine as a guided commercial packaging engine, not a normal property listing form.

The goal is to help developers package developments for the market with speed, confidence, and clarity. The engine must support sale, rental, and auction development inventory, preserve draft/edit/publish safety, and produce buyer-facing pages that visually prove the quality of the platform.

Backend correctness is the foundation. Product joy, commercial clarity, and buyer-facing trust are the standard.

## 2. What We Are Building

We are building a world-class Development Listing Engine for Property Listify.

A development is not treated as one simple listing. It is treated as a commercial product with inventory, pricing logic, media, governance details, buyer costs, developer identity, publishing readiness, and future lead-routing/distribution potential.

The engine must support:

- Sale developments
- Rental developments
- Auction developments
- Mixed or evolving unit inventory where applicable
- Unit types as the commercial inventory core
- Draft save and resume
- Edit existing development
- Publish and public listing output
- Search/listing card output
- Lead capture readiness
- Distribution/referral readiness

## 3. What This Engine Is Not

This is not just CRUD.

This is not a long admin form.

This is not only a database schema exercise.

This is not only a wizard with many fields.

This is not only a public page.

This is an end-to-end development packaging system.

## 4. Product Principle

The wizard must feel like a guided commercial packaging tool, not a giant form.

A developer should feel guided, not trapped.

The system should help them understand:

- What information is required
- Why it matters
- What is missing
- What is ready for publishing
- What buyers, renters, investors, agents, or referral partners will see
- How the development will appear publicly

The system should reduce friction while preserving data quality.

## 5. Technical Spine

The canonical engine should prefer:

- `workflowId`
- `currentStepId`
- `completedSteps`
- `developmentData`
- `stepData`
- `stepData.unit_types.unitTypes`

Legacy root fields may exist as compatibility bridges during migration, but they must not become the future authority.

The canonical workflow state should drive:

- Manual Save Draft
- Draft resume
- Edit hydration
- Create development
- Update development
- Publish development
- Public development display

## 6. Commercial Inventory Model

Unit types are the commercial inventory core.

Sale, rental, and auction units are not just extra fields. They are different transaction models.

Sale should understand:

- `priceFrom`
- `priceTo`
- Sale pricing ranges
- Buyer affordability signals
- Transfer/bond cost assumptions where applicable

Rental should understand:

- `monthlyRentFrom`
- `monthlyRentTo`
- Deposit requirements
- Rental qualification details
- Lease-related readiness where applicable

Auction should understand:

- `startingBid`
- Reserve price where applicable
- Auction date/time
- Registration requirements
- Auction-specific buyer journey

The public page and search cards must use the correct language and pricing logic for each transaction type.

## 7. Wizard Experience Goal

The wizard should be upgraded from a form into a guided packaging experience.

Future UX direction:

- Show progress clearly
- Group steps by commercial meaning, not database structure
- Explain why each step matters
- Use smart defaults
- Use readiness indicators
- Show preview-style feedback
- Allow safe save/resume
- Avoid overwhelming the developer
- Adapt copy and validation for sale/rent/auction
- Make unit inventory feel central and understandable
- Help the developer package the development for market, not merely fill fields

## 8. Public Page Goal

The public development page must prove the engine.

It should clearly show:

- Development hero media
- Developer identity and trust
- Sale/rent/auction-aware pricing
- Unit type cards
- Availability
- Floor plans
- Brochures
- Location and suburb value
- Amenities and estate specs
- Governance/buyer cost signals
- Clear CTAs
- Lead capture aligned to the transaction type

If the backend is powerful but the public page looks ordinary, the engine has not fully succeeded.

## 9. UI Visibility Principle

Backend intelligence must become visible in the user experience.

If sale/rent/auction logic, readiness rules, field ownership, pricing helpers, or lead-routing context exist only in helpers and tests, users will not feel the engine. Future implementation slices must track whether backend changes need to appear in:

- The wizard
- The public development page
- Search cards
- Unit type cards
- Lead forms
- Developer dashboards
- Admin review views
- Distribution/referral views

If users cannot feel the commercial intelligence, the engine is not finished.

## 10. Autosave Principle

Autosave must stay behind manual save/resume proof.

Manual save, draft listing, draft resume, edit-draft identity, failure/retry, and one-draft identity
have now been proven through real backend-backed flow checks. Create/draft autosave is available
only behind the default-off `VITE_DLE_CREATE_DRAFT_AUTOSAVE_ENABLED` rollout switch. Publisher
emulator autosave remains excluded until a publisher-scoped draft path is proven.

The UI must not tell users that progress is saved unless a real save path succeeds. Autosave failures must be visible, recoverable, or clearly handled; they must not silently claim safety while the backend failed.

Manual Save Draft remains the trusted fallback during the guarded rollout. Edit-development
autosave remains disabled until a separate baseline-aware partial-step ownership design is proven.

The authoritative enablement gates and save-state rules live in
`docs/dle/AUTOSAVE_SAFETY_CONTRACT.md`.

## 11. Field Ownership Rules

Each wizard slice should own only its fields.

Location updates must not wipe media, governance, or unit inventory.

Media updates must not wipe location, governance, or unit inventory.

Governance/finance updates must not wipe location, media, or unit inventory.

Unit type updates must not wipe location, media, or governance fields.

This is core to trust and stability.

## 12. Recovery Audit Checklist

Before continuing major work, every agent must confirm:

- Current git branch
- Current git status
- Untracked files
- Recent commits and tags
- Whether DLE recovery files exist
- Whether canonical helper files exist
- Whether DLE tests pass
- Whether manual browser flows work

Minimum commands:

```bash
git status --short
git branch --show-current
git log --oneline -10
git diff --stat
git ls-files --others --exclude-standard
```

Key files to check:

```text
server/lib/canonicalDevelopmentPayload.ts
server/lib/developmentCanonicalSnapshot.ts
server/lib/sanitizeDraftData.ts
server/services/developmentService.ts
shared/developmentDerived.ts
shared/developmentReadiness.ts
client/src/components/development-wizard/phases/UnitTypesPhase.tsx
client/src/pages/DevelopmentDetail.tsx
server/__tests__/developerRouter.edit-update.test.ts
server/__tests__/developerRouter.drafts.test.ts
server/lib/canonicalDevelopmentPayload.test.ts
server/lib/developmentCanonicalSnapshot.test.ts
server/services/__tests__/developmentTransactionAggregates.test.ts
```

## 13. Manual Flow Proof Checklist

Before calling the engine stable, verify:

| Flow | Required Result | Status |
|---|---|---|
| Create development | Development can be created without data loss | Pending |
| Manual Save Draft | Draft saves through real backend path | Pending |
| Draft appears in My Drafts | Saved draft is visible | Pending |
| Resume draft | Canonical state restores correctly | Pending |
| Edit location | Only location fields change | Pending |
| Edit media | Only media fields change | Pending |
| Edit governance/finance | Only governance/finance fields change | Pending |
| Edit unit types | Inventory/pricing updates safely | Pending |
| Publish development | Publish validation passes correctly | Pending |
| Public page | Correct sale/rent/auction display | Pending |
| Edit published development | No unrelated field wipes | Pending |

## 14. Commit and Checkpoint Discipline

To avoid losing work again, commit after every complete slice.

A slice is complete only when:

- The intended change is done
- Focused tests pass
- `pnpm run check` passes where relevant
- `git diff --check` is clean except known warnings
- The work is committed or intentionally documented as uncommitted

Suggested commit format:

```text
feat(dle): add canonical unit ownership guard
fix(dle): preserve media during location update
test(dle): cover rent and auction unit pricing
docs(dle): update source of truth after recovery audit
chore(recovery): preserve verified DLE checkpoint
```

Tag stable checkpoints after verified recovery/stability points:

```bash
git tag dle-recovery-verified-YYYY-MM-DD
git tag dle-manual-flow-verified-YYYY-MM-DD
git tag dle-world-class-ui-phase-start-YYYY-MM-DD
```

Push tags when appropriate:

```bash
git push origin <tag-name>
```

## 15. Recovery Log Discipline

Every completed slice must update `docs/dle/RECOVERY_LOG.md`.

No completed slice should be left uncommitted unless the recovery log clearly says why.

Every recovery log entry should include:

- Date
- Branch
- Goal
- Files changed
- Tests run
- Manual flows verified
- Remaining risks
- Next recommended slice
- Commit hash/tag if created

## 16. Recommended Repo Document Structure

```text
docs/
  dle/
    DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
    RECOVERY_LOG.md
    MANUAL_FLOW_CHECKLIST.md
    PRODUCT_VISION.md
    TECHNICAL_ARCHITECTURE.md
    FIELD_OWNERSHIP_CONTRACT.md
    AUTOSAVE_SAFETY_CONTRACT.md
    TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
    OPERATING_LAYER_AUDIT.md
    OPERATING_STATUS_AUDIT_CONTRACT.md
    OPERATING_OUTCOME_LAYER_DESIGN.md
    SALE_OPERATING_STATUS_MUTATION_DESIGN.md
    RENTAL_OPERATING_STATUS_MUTATION_DESIGN.md
    AUCTION_OPERATING_LIFECYCLE_DESIGN.md
    AGENT_HANDOFF_TEMPLATE.md
```

## 17. Agent Handoff Rule

No major agent session should start without reading this source-of-truth document first.

Use `docs/dle/AGENT_HANDOFF_TEMPLATE.md` before every new implementation session.

## 18. Current Strategic Order

Recommended order from here:

1. Run and monitor a controlled create/draft autosave rollout
2. Keep edit-development autosave separate until partial-step ownership is proven
3. Continue operating-layer hardening from the browser-proven Sale reserve/release, Sale sold,
   Rental hold/release, Rental let, Auction registration open/activation, and Auction outcome
   mutations
4. Design lead-stage synchronization for Sale sold, Rental let, and Auction outcomes before
   automating lead changes
5. Design distribution/referral outcome handoff before automating deal or commission closure
6. Continue the transaction-engine product experience audit
7. Upgrade the wizard so Sale, Rental, and Auction feel like distinct packaging engines
8. Product audit of public development page merchandising
9. Search card and lead form alignment
10. Developer dashboard and inventory impact
11. Admin review impact
12. Add explicit Sale/Rental outcome projections before broad sold/let reporting claims

## 19. Definition of World-Class

The engine becomes world-class when:

- Developers can package a development quickly and confidently
- Sale/rent/auction logic is correct and visible
- Draft/edit/publish flows are safe
- Public pages look and feel premium
- Buyers understand pricing, inventory, and next steps
- Leads are captured with the right commercial context
- Agents/referrers/distribution can use the development inventory cleanly
- The system is stable enough that one update does not wipe another part of the development
- The repo has clear documentation, checkpoints, commits, and recovery logs
