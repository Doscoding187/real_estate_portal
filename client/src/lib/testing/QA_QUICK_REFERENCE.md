# QA Checklist - Quick Reference Guide

**Quick access guide for the comprehensive QA checklist**

---

## 🚀 Quick Start

### For First-Time QA

1. **Read the full checklist:** `client/src/lib/testing/QA_CHECKLIST.md`
2. **Start with smoke tests:** Section 11.1 (10 critical user journeys)
3. **Work systematically:** Complete each section in order
4. **Document everything:** Screenshots, metrics, issues

### Status Symbols

- ✅ **Pass** - Test passed, no issues
- ❌ **Fail** - Test failed, issue logged
- ⚠️ **Partial/Warning** - Test passed with minor issues
- ⏳ **Not Tested** - Test not yet executed
- **N/A** - Not applicable to this context

---

## 📋 Checklist Sections Overview

### 1. Visual QA (30+ checks)
**Focus:** Design consistency, component styling, responsive layout  
**Time:** ~2-3 hours  
**Tools:** Browser DevTools, screenshot comparison  
**Key Areas:**
- Design tokens consistency
- Component visual quality
- Page layouts
- Responsive breakpoints

### 2. Interaction QA (43 test cases)
**Focus:** User flows, interactions, animations  
**Time:** ~3-4 hours  
**Tools:** Manual testing, browser DevTools  
**Key Areas:**
- Video playback
- Map/feed sync
- Filters
- Navigation

### 3. Performance QA (24 metrics)
**Focus:** Speed, FPS, load times, caching  
**Time:** ~2-3 hours  
**Tools:** Lighthouse, Chrome Performance tab  
**Key Areas:**
- Scroll FPS (target: ≥55)
- Video start (target: ≤1s)
- TTI (target: ≤3s)
- Cache hit rate (target: ≥70%)

### 4. Accessibility QA (35+ checks)
**Focus:** WCAG AA compliance, keyboard, screen readers  
**Time:** ~2-3 hours  
**Tools:** Lighthouse, axe DevTools, NVDA/JAWS  
**Key Areas:**
- Keyboard navigation
- Screen reader compatibility
- Color contrast (4.5:1 ratio)
- ARIA attributes

### 5. API QA (25+ checks)
**Focus:** Backend compatibility, no breaking changes  
**Time:** ~1-2 hours  
**Tools:** Network tab, Postman, React Query DevTools  
**Key Areas:**
- Endpoint signatures unchanged
- Request/response formats
- Hook integration
- Error handling

---

## 🎯 Critical Test Paths

### Path 1: Video Experience (15 min)
1. Open ExploreShorts
2. Verify video auto-plays when in viewport
3. Swipe between videos (check 55+ FPS)
4. Test buffering indicator
5. Test error state with invalid URL
6. Test keyboard controls (Space, arrows)

### Path 2: Map/Feed Sync (15 min)
1. Open ExploreMap
2. Pan map, verify feed updates within 400ms
3. Click feed item, verify map pin highlights
4. Click map pin, verify feed scrolls to item
5. Check sticky property card appears
6. Verify no duplicate API calls (Network tab)

### Path 3: Filter Flow (15 min)
1. Open ExploreFeed
2. Open filter panel
3. Apply multiple filters
4. Verify URL updates with query params
5. Click Apply, verify filtered results
6. Navigate to ExploreHome, verify filters persist
7. Click Reset, verify filters clear

### Path 4: Accessibility (15 min)
1. Tab through all interactive elements
2. Verify focus indicators visible
3. Test Escape key closes modals
4. Run Lighthouse accessibility audit
5. Verify score ≥90
6. Test with screen reader (basic check)

### Path 5: Performance (15 min)
1. Open Chrome DevTools Performance tab
2. Record 6-second scroll on ExploreFeed
3. Verify FPS ≥55
4. Run Lighthouse performance audit
5. Check TTI ≤3s, FCP ≤1.5s
6. Verify bundle size increase ≤10%

---

## 🔧 Essential Tools Setup

### Chrome DevTools
```
1. Open DevTools (F12)
2. Performance tab → Record → Scroll → Stop
3. Analyze FPS graph (should be green, ≥55 FPS)
4. Network tab → Check for duplicate calls
5. Lighthouse tab → Run audit
```

### Lighthouse Audit
```
1. Open DevTools → Lighthouse tab
2. Select: Performance, Accessibility, Best Practices
3. Device: Mobile or Desktop
4. Click "Analyze page load"
5. Review scores (target: ≥90 for accessibility)
```

### React Query DevTools
```
1. Open app in development mode
2. React Query DevTools panel appears
3. Check cache hit rate
4. Verify no duplicate queries
5. Check stale/cache times
```

### Screen Reader Testing (Basic)
```
Windows: NVDA (free)
1. Download from nvaccess.org
2. Install and start NVDA
3. Navigate with Tab key
4. Listen for announcements
5. Verify all interactive elements have labels

Mac: VoiceOver (built-in)
1. Cmd+F5 to enable
2. Navigate with Tab or VO keys
3. Listen for announcements
```

---

## 📊 Performance Targets Quick Reference

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Scroll FPS | ≥55 FPS | Chrome Performance tab |
| Video start | ≤1s | Manual timing or Performance API |
| TTI | ≤3s | Lighthouse |
| FCP | ≤1.5s | Lighthouse |
| LCP | ≤2.5s | Lighthouse |
| Cache hit rate | ≥70% | React Query DevTools |
| Bundle size increase | ≤10% | Build output comparison |

---

## ♿ Accessibility Targets Quick Reference

| Check | Target | How to Test |
|-------|--------|-------------|
| Lighthouse score | ≥90 | Lighthouse audit |
| Color contrast | ≥4.5:1 | Chrome DevTools Color Picker |
| Keyboard navigation | 100% | Manual Tab testing |
| Focus indicators | Visible | Visual inspection |
| ARIA labels | All buttons | axe DevTools |
| Screen reader | Compatible | NVDA/JAWS testing |

---

## 🐛 Common Issues & Quick Fixes

### Issue: Video not auto-playing
**Check:**
- IntersectionObserver threshold (should be 0.5)
- Browser autoplay policy (muted videos only)
- Video element has `playsInline` attribute

### Issue: Map/feed sync laggy
**Check:**
- Throttle set to 250ms
- Debounce set to 300ms
- React Query cache working
- No duplicate API calls in Network tab

### Issue: Filters not persisting
**Check:**
- Zustand store configured with persist middleware
- localStorage not blocked
- URL sync hook active
- Filter state not cleared on navigation

### Issue: Poor scroll performance
**Check:**
- Virtualization enabled for lists >50 items
- Images lazy loaded
- No heavy re-renders (React DevTools Profiler)
- CSS transforms used for animations

### Issue: Accessibility score low
**Check:**
- All images have alt text
- All buttons have aria-label
- Color contrast ≥4.5:1
- Focus indicators visible
- No missing form labels

---

## 📝 Bug Report Quick Template

```markdown
**Title:** [Brief description]
**Severity:** Critical / High / Medium / Low

**Steps:**
1. 
2. 
3. 

**Expected:** [What should happen]
**Actual:** [What happens]

**Environment:**
- Browser: [Chrome 90 / Firefox 88 / Safari 14]
- Device: [Desktop / Mobile]
- Screen: [1920x1080 / 375x667]

**Screenshot:** [Attach]
**Console:** [Paste errors]
```

---

## ✅ Pre-Deployment Final Checklist

Quick checklist before marking QA complete:

- [ ] All critical user journeys work (Section 11.1)
- [ ] Performance metrics meet targets (Section 3)
- [ ] Accessibility score ≥90 on all pages (Section 4.5)
- [ ] No console errors in production build
- [ ] Cross-browser testing complete (Section 6)
- [ ] Cross-device testing complete (Section 7)
- [ ] API compatibility verified (Section 5)
- [ ] No P0 (critical) bugs
- [ ] Documentation complete
- [ ] Screenshots/videos captured

---

## 📞 Need Help?

### Resources
- **Full Checklist:** `client/src/lib/testing/QA_CHECKLIST.md`
- **Performance Guide:** `client/src/lib/testing/PERFORMANCE_BENCHMARKS.md`
- **Accessibility Guide:** `client/src/lib/accessibility/COLOR_CONTRAST_COMPLIANCE.md`
- **Browser Testing:** `client/src/lib/testing/CROSS_BROWSER_TEST_RESULTS.md`

### Testing Tools
- **Lighthouse:** Built into Chrome DevTools
- **axe DevTools:** Browser extension for accessibility
- **NVDA:** Free screen reader for Windows
- **React Query DevTools:** Included in development build

---

## 🎯 Daily QA Workflow

### Morning (2-3 hours)
1. Run smoke tests (Section 11.1)
2. Complete 1-2 major sections (Visual or Interaction)
3. Document issues found

### Afternoon (2-3 hours)
1. Complete 1-2 major sections (Performance or Accessibility)
2. Run automated tests
3. Update checklist status

### End of Day
1. Review progress
2. Log all bugs
3. Update test summary
4. Plan next day's testing

---

**Last Updated:** December 2024  
**Version:** 1.0
