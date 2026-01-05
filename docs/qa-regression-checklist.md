# Search Architecture - QA Regression Checklist

## Pre-Release Gate
Run this checklist on every release that touches search, routing, or location pages.

---

## 🔴 Critical (Must Pass)

### Province Routing
- [ ] Type "KwaZulu-Natal" + Enter → `/property-for-sale/kwazulu-natal`
- [ ] Type "KZN" + Enter → `/property-for-sale/kwazulu-natal`
- [ ] Province NEVER generates `?city=` query param

### SEO Page Integrity
- [ ] Province pages have NO filters sidebar
- [ ] Province pages have NO pagination
- [ ] City SEO pages have NO sort dropdown

### Internal Navigation
- [ ] Province metro cards → SRP (`?city=`)
- [ ] Search bar → SRP (not SEO page)

---

## 🟡 Important

### City/Suburb Routing
- [ ] City search → `?city={slug}`
- [ ] Suburb search → `?suburb={slug}`
- [ ] Enter key = Click behavior (identical)

### URL Structure
- [ ] Direct province URL loads SEO page
- [ ] Query param `?city=` loads SRP

---

## 🟢 Verification

### Automated Tests
```bash
npx playwright test e2e/routing/
```

### Expected Results
- `search-routing.spec.ts` - 10 passed
- `seo-guardrails.spec.ts` - 10 passed

---

## Sign-Off

| Check | Passed | Tester | Date |
|-------|--------|--------|------|
| Province routing | ☐ | | |
| SEO guardrails | ☐ | | |
| City/Suburb routing | ☐ | | |
| Automated tests | ☐ | | |
