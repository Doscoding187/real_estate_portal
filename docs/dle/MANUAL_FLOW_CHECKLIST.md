# DLE Manual Flow Checklist

Use this checklist before calling the Development Listing Engine stable.

| Flow | Required Result | Status | Evidence |
|---|---|---|---|
| Create development | Development can be created without data loss | Partial | Browser reached authenticated create wizard and advanced sale workflow through Project Setup, Configuration, Identity, Location, Governance, Amenities, and Marketing Summary. No final create/publish submit yet. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-wizard-start.png`, `docs/dle/evidence/2026-06-02/qa-dle-after-location-next.png`, `docs/dle/evidence/2026-06-02/qa-dle-marketing-summary.png`. |
| Manual Save Draft | Draft saves through real backend path | Pending | |
| Draft appears in My Drafts | Saved draft is visible | Pending | |
| Resume draft | Canonical state restores correctly | Pending | |
| Edit location | Only location fields change | Pending | |
| Edit media | Only media fields change | Pending | |
| Edit governance/finance | Only governance/finance fields change | Pending | |
| Edit sale unit types | Sale inventory/pricing updates safely | Pending | |
| Edit rental unit types | Rental inventory/pricing updates safely | Pending | |
| Edit auction unit types | Auction inventory/pricing updates safely | Pending | |
| Publish development | Publish validation passes correctly | Pending | |
| Public page | Correct sale/rent/auction display | Pending | |
| Search cards | Correct sale/rent/auction pricing and ordering | Pending | |
| Lead capture | Lead context matches transaction type and unit interest | Pending | |
| Edit published development | No unrelated field wipes | Pending | |

## Evidence Standard

Each completed row should include one of:

- Browser/manual evidence with route and timestamp.
- Focused automated test name.
- Screenshot path.
- API/database verification output.

Tests are useful, but the final stability call needs browser-level proof for create, save draft, resume, publish, and public display.

## 2026-06-02 Browser Preflight Evidence

Environment:

- Frontend: `http://localhost:3009`
- Backend: `http://localhost:5000`
- Backend health: DB/cache OK, S3 false with local upload fallback expected.
- Account: `developer@listify.local`
- Runtime note: source `~/.nvm/nvm.sh` before Node/pnpm commands.

Verified through browser:

- Login sign-in form renders and accepts the developer route return path.
- Authenticated developer can reach `/developer/create-development`.
- Project Setup shows development-type selection and transaction goal choices: For Sale, To Let / Rent, Auction.
- Sale workflow starts as `residential_sale`.
- Configuration step advances after selecting Apartment Complex.
- Identity & Market accepts development name, tagline, nature, status, and ownership type.
- Location accepts address, city, suburb, province, and postal code, then advances to Governance & Finances.
- Governance advances to Amenities.
- Amenities quick-start applies common amenities and advances to Marketing Summary.

Evidence screenshots:

- `docs/dle/evidence/2026-06-02/qa-login-signin-form-dle.png`
- `docs/dle/evidence/2026-06-02/qa-dle-wizard-start.png`
- `docs/dle/evidence/2026-06-02/qa-dle-wizard-step-after-start.png`
- `docs/dle/evidence/2026-06-02/qa-dle-wizard-identity.png`
- `docs/dle/evidence/2026-06-02/qa-dle-location-ready.png`
- `docs/dle/evidence/2026-06-02/qa-dle-after-location-next.png`
- `docs/dle/evidence/2026-06-02/qa-dle-marketing-summary.png`

Not yet verified:

- Media step completion.
- Unit type creation through browser.
- Final review.
- Manual Save Draft from the review screen.
- My Drafts visibility.
- Draft resume.
- Publish.
- Public development page/search-card output.
