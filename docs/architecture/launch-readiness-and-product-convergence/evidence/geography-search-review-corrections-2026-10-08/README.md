# Canonical search review corrections — 2026-10-08

Base: dae3963a8b468af9ac2ba574212149c8d7729d72 (search implementation b3fad5cfb).
Task-owned branch: fix/geography-search-review-20261008.

Saved-search evaluation validates raw Place identity and competing geography before normalization. Empty, whitespace, null, undefined, numeric and array identities cannot widen to unscoped inventory. A competing factual identity or other geography cannot disappear through coercion. Rejected criteria execute neither public inventory nor legacy search. Valid Place searches remain supported for Buy and Rent.

The canonical results header restores Advertise / List Property and Sign In / Account links. They remain available at narrow widths and target /advertise, /login and /dashboard as appropriate. The underlying Place membership policy is unchanged.

## Validation

- Saved-search public-authority and notification unit suites: 12 tests passed. Services are mocked; SKIP_DB_INIT=1 applies only to these two database-free suites.
- Search selector and results-query reactivity: 25 client tests passed.
- pnpm check: passed.
- Touched-file ESLint: zero errors, eight existing warnings.
- pnpm build: passed. A browser build with VITE_API_URL and VITE_API_BASE_URL set to http://localhost:3000 also passed.
- Chromium, built application: signed-in and signed-out navigation verified at 375px and 1280px. Correct destinations, visible links and horizontal viewport containment passed in all four cases. API requests were intercepted with synthetic responses; other external requests were blocked. This is UI navigation proof, not fresh authentication or database proof.
- git diff --check: passed.

The initial browser harness was refused first for a missing API URL, then for an out-of-policy localhost:3009 URL. Correcting the harness to the existing allowed localhost:3000 origin resolved both refusals. No environment guard was weakened. The harness is retained as text for reproduction after a correctly configured build.

## Boundaries

Database consumer correction, verified with mocked services; no database was created or changed. Authority status resolved the owned disposable target fingerprint ae039bbd57f38e4248883830526cdeca55742941dcdfb565e03f36ac6802b017; that target was not available and was not initialized. No protected database, production service or notification recipient was accessed.

Hosted results for 499cab892 do not cover this source. Publish the new exact commit for its own required hosted checks. Merge, protected application, deployment and payment activation remain held. National-dataset search timing remains a production-acceptance prerequisite; this correction does not claim national performance or extend the Vercel preview exception.
