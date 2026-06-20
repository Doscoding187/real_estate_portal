# Junior Slice 001 - Edit Autosave Marketing Proof Expansion

Date assigned: 2026-06-20
Senior reviewer: Codex
Worktree: `/home/edwardspc/Desktop/Dev/listify-developer-listing-engine`
Branch: `feature/developer-listing-engine-isolated`
Baseline: after `aa3775d8 test(dle): isolate edit autosave browser proof`

## Objective

Extend the existing edit-autosave browser proof so Sale, Rental, and Auction each prove the same
simple marketing-summary failure/retry contract.

This is intentionally the first junior slice because it is narrow, measurable, and close to an
existing passing spec.

## Why This Matters

Edit-development autosave is dangerous because published developments already have public media,
location, governance, unit inventory, pricing, lead context, and distribution context.

Before edit autosave can ever be enabled, every transaction lane must prove that a failed autosave
is visible, that retry saves the latest partial payload, and that unrelated published fields are not
wiped.

## Required Preflight

Run:

```bash
cd /home/edwardspc/Desktop/Dev/listify-developer-listing-engine
git branch --show-current
git status --short
```

Expected branch:

```text
feature/developer-listing-engine-isolated
```

Expected status:

```text
clean
```

If the branch or status is different, stop and ask the senior reviewer.

## Required Reading

Read before editing:

```bash
sed -n '1,220p' docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
sed -n '1,220p' docs/dle/GOAL_COMPLETION_AUDIT.md
sed -n '1,180p' docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md
tail -n 220 docs/dle/RECOVERY_LOG.md
sed -n '1,260p' e2e/dle/edit-autosave-browser.spec.ts
```

## Files You May Change

Allowed:

- `e2e/dle/edit-autosave-browser.spec.ts`
- `docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md`
- `docs/dle/RECOVERY_LOG.md`
- new screenshots under `docs/dle/evidence/2026-06-20/`

Ask before touching anything else.

## Implementation Requirements

Update `e2e/dle/edit-autosave-browser.spec.ts` so it proves the same browser contract for:

1. Sale
2. Rental
3. Auction

The current Rental proof already exists. You may refactor the spec to share setup helpers, but keep
the test easy to read.

For each transaction lane:

- seed one published, approved development;
- include stable location, media, highlights, governance/finance, and one unit type;
- start on the edit wizard marketing-summary step;
- run with `VITE_DLE_EDIT_AUTOSAVE_ENABLED=true`;
- intercept the first `developer.updateDevelopment` request and return `{ success: false }`;
- assert the UI shows visible `Save Failed`;
- assert the failed attempt did not change persisted DB description;
- assert unrelated fields remain preserved after failure;
- change the description again;
- assert the retry succeeds;
- assert the retry payload has `canonicalUpdateMode: partial_step`;
- assert the retry payload owns marketing fields only;
- assert the retry payload does not own unrelated location, media, or unit fields;
- assert the public development page still renders transaction-native output after retry.

Transaction-native output examples:

- Sale: sale price language, sale unit identity, no rent/bid language.
- Rental: monthly rent/rental fit language, rental unit identity, no sale/bid language.
- Auction: starting bid/auction language, auction unit identity, no rent/sale price language.

## Screenshots Required

Save screenshots under:

```text
docs/dle/evidence/2026-06-20/
```

Use clear names, for example:

- `qa-dle-sale-edit-autosave-failure-visible.png`
- `qa-dle-sale-edit-autosave-retry-saved.png`
- `qa-dle-sale-edit-autosave-public-preserved.png`
- `qa-dle-rental-edit-autosave-failure-visible.png`
- `qa-dle-rental-edit-autosave-retry-saved.png`
- `qa-dle-rental-edit-autosave-public-preserved.png`
- `qa-dle-auction-edit-autosave-failure-visible.png`
- `qa-dle-auction-edit-autosave-retry-saved.png`
- `qa-dle-auction-edit-autosave-public-preserved.png`

## Required Verification

Run the focused browser spec:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1
```

Then run:

```bash
pnpm run check
git diff --check
git status --short
```

If the browser spec needs local servers, start them in the same pattern used by the existing DLE
browser proofs. Do not change application code just to make the test easier.

## Required Recovery Log Update

Append a new entry to `docs/dle/RECOVERY_LOG.md` with:

- date;
- goal;
- files changed;
- tests run;
- screenshots/evidence;
- functional proof;
- remaining risks;
- next recommended slice.

Do not claim edit autosave is ready to enable. It is not.

## Out Of Scope

Do not:

- enable edit autosave by default;
- change `VITE_DLE_EDIT_AUTOSAVE_ENABLED` behavior;
- change backend endpoint semantics;
- add new schema or migrations;
- touch evidence artifact runtime behavior;
- touch distribution payout/reward/commission behavior;
- touch homepage, navigation, property listing, or listing intelligence worktrees;
- broaden this into location/media/unit autosave proof.

## Senior Review Checklist

The senior reviewer will reject the slice if:

- the wrong worktree or branch was used;
- unrelated files changed;
- any test is deleted or weakened without explanation;
- Rental/Auction inherit sale-only assumptions;
- screenshots are missing for browser-visible claims;
- `Save Failed` is not visibly asserted;
- retry payload owns unrelated fields;
- `docs/dle/RECOVERY_LOG.md` is missing or overclaims readiness;
- `pnpm run check` or `git diff --check` is not run.

## Expected Final Status

At completion, the junior should report:

- commands run;
- pass/fail result;
- files changed;
- evidence screenshots created;
- remaining risks;
- whether they believe the slice is ready for senior review.

The junior should not commit until the senior reviewer approves.
