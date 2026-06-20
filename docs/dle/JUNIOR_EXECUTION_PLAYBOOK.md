# DLE Junior Execution Playbook

Date: 2026-06-20
Owner model: Junior developer executes narrow slices; senior developer reviews scope, code, tests,
evidence, and commit boundaries.

## Non-Negotiable Worktree Rule

All DLE work must start from:

```bash
cd /home/edwardspc/Desktop/Dev/listify-developer-listing-engine
git branch --show-current
git status --short
```

Expected branch:

```text
feature/developer-listing-engine-isolated
```

Expected status before starting a new slice:

```text
clean, or only files explicitly assigned for the current slice
```

If the branch is not `feature/developer-listing-engine-isolated`, stop and ask the senior reviewer.

If unrelated files are dirty, stop and ask the senior reviewer.

Do not work from these worktrees for DLE:

- `/home/edwardspc/Desktop/Dev/real_estate_portal_clone`
- `/home/edwardspc/Desktop/Dev/listify-homepage-improvements`
- `/home/edwardspc/Desktop/Dev/listify-intelligent-listing-engine-v2`
- `/home/edwardspc/Desktop/Dev/listify-listing-wizard-overhaul`

## Required Reading Before Any Slice

Read these before coding:

1. `docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md`
2. `docs/dle/GOAL_COMPLETION_AUDIT.md`
3. `docs/dle/RECOVERY_LOG.md`
4. The contract for the assigned slice.

Contract map:

- Autosave: `docs/dle/AUTOSAVE_SAFETY_CONTRACT.md`
- Edit autosave: `docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md`
- Field ownership: `docs/dle/FIELD_OWNERSHIP_CONTRACT.md`
- Evidence artifacts: `docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md`
- Evidence upload security: `docs/dle/EVIDENCE_FILE_UPLOAD_SECURITY_CONTRACT.md`
- Evidence access: `docs/dle/EVIDENCE_ACCESS_AUTHORIZATION_CONTRACT.md`
- Evidence linkage: `docs/dle/EVIDENCE_LINKAGE_PERSISTENCE_CONTRACT.md`
- Distribution semantics: `docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md`
- Transaction model: `docs/dle/TRANSACTION_ENGINE_ARCHITECTURE_AUDIT.md`
- Product experience: `docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md`

## Execution Rules

Every slice must be small enough to review.

Do:

- preserve transaction-first behavior;
- preserve Sale, Rental, and Auction separation;
- preserve field ownership;
- add tests before claiming a behavior is proven;
- add browser evidence when the requirement is browser-visible;
- update `docs/dle/RECOVERY_LOG.md`;
- run the required checks;
- stage only files from the assigned slice.

Do not:

- enable edit autosave;
- make autosave default-on;
- merge homepage/navigation/listing-intelligence work into DLE;
- refactor unrelated files;
- delete tests to make a slice pass;
- replace transaction-specific logic with generic listing logic;
- let Rental or Auction inherit sale-only assumptions;
- claim evidence completion from notes/prompts alone;
- move distribution stages, payouts, rewards, or commissions unless the assigned slice explicitly
  owns that contract.

## Senior Review Gates

A junior slice is not accepted until the senior reviewer confirms:

- correct worktree and branch;
- clean or scoped git status;
- changed files match assigned scope;
- source-of-truth and relevant contract were followed;
- focused tests pass;
- `pnpm run check` passes unless senior explicitly waives it;
- `git diff --check` passes;
- browser evidence exists for browser-visible behavior;
- `docs/dle/RECOVERY_LOG.md` is updated;
- no unrelated files are staged.

## Standard Slice Workflow

1. Preflight:

```bash
cd /home/edwardspc/Desktop/Dev/listify-developer-listing-engine
git branch --show-current
git status --short
```

2. Read docs:

```bash
sed -n '1,220p' docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
sed -n '1,220p' docs/dle/GOAL_COMPLETION_AUDIT.md
tail -n 220 docs/dle/RECOVERY_LOG.md
```

3. Confirm assigned slice with senior reviewer.

4. Implement only that slice.

5. Run focused tests.

6. Run:

```bash
pnpm run check
git diff --check
git status --short
```

7. Update `docs/dle/RECOVERY_LOG.md`.

8. Ask senior reviewer to inspect before commit.

## Approved Slice: Edit Autosave Marketing Proof Expansion

First assignment document:

- `docs/dle/JUNIOR_SLICE_001_EDIT_AUTOSAVE_MARKETING_PROOF.md`

Goal:

Extend `e2e/dle/edit-autosave-browser.spec.ts` so Sale, Rental, and Auction each prove
marketing-summary edit-autosave failure/retry behavior.

Required behavior:

- `VITE_DLE_EDIT_AUTOSAVE_ENABLED=true` is required for the spec.
- Edit autosave remains disabled by default outside the spec.
- Each transaction lane seeds a published, approved development.
- First `developer.updateDevelopment` response is forced to `{ success: false }`.
- The UI shows visible `Save Failed`.
- The failed attempt leaves persisted data unchanged.
- The retry sends the latest `marketing_summary` partial payload.
- Retry payload includes `canonicalUpdateMode: partial_step`.
- Retry payload does not own unrelated location, media, or unit fields.
- Public page remains transaction-native after retry.

Required evidence:

- Screenshot for failed visible state.
- Screenshot for retry saved state.
- Screenshot for preserved public page output.

Required tests:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1
pnpm run check
git diff --check
```

Out of scope:

- location autosave proof;
- media autosave proof;
- unit autosave proof;
- enabling edit autosave;
- changing backend endpoint semantics;
- evidence, distribution, payout, reward, or operating mutations.

## Approved Slice: Hand-Entered Rental/Auction UX Audit

Goal:

Run a no-code browser audit for full hand-entered Rental and Auction wizard journeys.

Required output:

- Create `docs/dle/HAND_ENTERED_RENTAL_AUCTION_UX_AUDIT.md`.
- Record every step from Project Setup through Review & Publish.
- Separate functional blockers from product polish issues.
- Identify sale-shaped language in Rental or Auction flows.
- Identify missing readiness guidance.
- Identify whether the public preview/page reflects transaction-native packaging.

Out of scope:

- code fixes;
- autosave;
- evidence runtime work;
- distribution mutations.

## Approved Slice: Evidence Metadata Endpoint Design

Goal:

Design, but do not implement, read-only evidence metadata endpoint behavior for Admin and
Distribution Manager surfaces.

Required output:

- Create or update a design doc in `docs/dle/`.
- Define access policy inputs.
- Define allowed metadata fields.
- Define forbidden fields.
- Define audit log requirements.
- Define tests needed before implementation.

Out of scope:

- file download implementation;
- upload implementation;
- malware scanning implementation;
- evidence acceptance/rejection runtime mutation;
- automatic readiness completion.

## Commit Discipline

No completed slice should be left uncommitted unless `docs/dle/RECOVERY_LOG.md` clearly explains
why.

Commit message examples:

- `test(dle): prove auction edit autosave retry`
- `docs(dle): audit rental auction hand-entered ux`
- `docs(dle): design evidence metadata endpoints`

The junior developer should not tag releases. The senior reviewer decides when a stable recovery
point deserves a tag.
