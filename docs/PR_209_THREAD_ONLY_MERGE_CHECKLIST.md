# PR Readiness - Thread Scope Only (Baseline: PR #209)

Baseline merge commit:
- `1a62004c` (`Merge pull request #209 from Doscoding187/revert/pr-208-mobile-regression`)

This document defines exactly what should be merged from this thread, and what must be excluded.

## 1) Allowed PR Scope

Only include these files in the PR:
- `client/src/pages/PropertyDetail.tsx`
- `client/src/components/property/PropertyImageGallery.tsx`
- `client/src/components/property/PropertyMobileFooter.tsx`
- `client/src/components/property/NearbyLandmarks.tsx`
- `client/src/components/BondCalculator.tsx`

Everything else in the working tree is out of scope for this PR.

## 2) Required Product Outcomes

### Mobile property detail optimization
- Breadcrumbs hidden on mobile.
- Back button + Like + Share over image.
- Title/address/price block below gallery on mobile.
- 4-item compact stat strip on mobile (size, bed, bath, erf).
- Sticky mobile footer uses `WhatsApp Agent` + `Enquire Now`.
- Mobile phone number is never directly visible.

### Contact and lead-capture behavior
- No direct phone number rendering in property detail contact section.
- No direct phone number passed to property contact modal from detail page.
- Contact conversion routes through enquiry CTA.

### Gallery modernization
- Mobile-first gallery controls.
- Media tabs support `Photos`, `Videos`, `Virtual Tour`, `Floor Plan` when data exists.
- Counter below image and improved pagination dots.

### Buyability v1 inside property detail
- Replace weak “pre-qualified” feel with `Check Buyability` action.
- Mobile opens Buyability modal/sheet.
- Desktop keeps sticky sidebar calculator.
- Buyability calculator includes:
  - gross monthly income input
  - existing monthly debt input
  - max affordable price
  - buyability score and readiness band
  - budget band (`Safe`, `Target`, `Stretch`)
  - “See Homes I Can Afford” CTA to listings route

## 3) Required Routing/Query Behavior

`See Homes I Can Afford` must route to:
- `/properties?maxPrice=...&city=...&suburb=...&listingType=...&propertyType=...`

This aligns with current search filters (`maxPrice`, `city`, `suburb`, `listingType`, `propertyType`).

## 4) Pre-Merge Validation Checklist

Run:
- `pnpm exec eslint client/src/pages/PropertyDetail.tsx client/src/components/BondCalculator.tsx client/src/components/property/PropertyImageGallery.tsx client/src/components/property/NearbyLandmarks.tsx client/src/components/property/PropertyMobileFooter.tsx`

Expected:
- no lint errors in scoped files
- warnings are acceptable only if pre-existing and non-blocking

Manual QA:
- iPhone width (`375x812`)
- iPhone 13/14 width (`390x844`)
- Pixel width (`412x915`)
- Tablet width (`768x1024`)

Confirm:
- mobile gallery interactions
- mobile Buyability modal open/close and CTA behavior
- desktop sticky Buyability panel still visible
- no direct phone display
- “See Homes I Can Afford” opens filtered listings

## 5) PR Hygiene (Critical)

Because the repository is currently very dirty, use explicit file staging only:

```bash
git add client/src/pages/PropertyDetail.tsx
git add client/src/components/property/PropertyImageGallery.tsx
git add client/src/components/property/PropertyMobileFooter.tsx
git add client/src/components/property/NearbyLandmarks.tsx
git add client/src/components/BondCalculator.tsx
git add docs/PR_209_THREAD_ONLY_MERGE_CHECKLIST.md
git status --short
```

Before opening PR:
- verify staged file list matches this checklist exactly
- verify no unrelated files are staged

## 6) Naming Decision for This PR

Use neutral naming:
- `Buyability Calculator`
- `Check Buyability`

Do not use `HomeFinder` branding in this PR.

## 7) Deferred (Not Blocking This PR)

- Full standalone Buyability results page
- Saved scenarios and account history
- Copilot conversational buyability intake
- credit integration and subsidy estimators
