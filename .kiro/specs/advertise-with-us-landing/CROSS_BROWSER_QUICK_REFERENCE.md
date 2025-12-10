# Cross-Browser Testing Quick Reference

## Quick Start

### Run Automated Tests
```bash
npm test -- client/src/components/advertise/__tests__/CrossBrowserCompatibility.test.tsx --run
```

### Manual Testing Checklist
📋 See: `.kiro/specs/advertise-with-us-landing/CROSS_BROWSER_TESTING_CHECKLIST.md`

---

## Browser Support Matrix

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest 2 | ✅ Fully Supported |
| Firefox | Latest 2 | ✅ Fully Supported |
| Safari | Latest 2 | ✅ Fully Supported |
| Edge | Latest 2 | ✅ Fully Supported |
| Mobile Safari | iOS 14+ | ✅ Fully Supported |
| Chrome Mobile | Android 10+ | ✅ Fully Supported |

---

## Test Coverage

### Automated Tests (27 tests)
- ✅ CSS Grid Support
- ✅ CSS Flexbox Support
- ✅ Intersection Observer API
- ✅ Animation Compatibility
- ✅ Responsive Design
- ✅ Modern CSS Features
- ✅ Browser Workarounds
- ✅ Touch Device Support

### Manual Testing Required
- Visual rendering
- Real device testing
- Touch interactions
- Screen reader compatibility
- Performance profiling

---

## Common Issues & Solutions

### Safari
**Issue**: Flexbox bugs with flex-shrink  
**Solution**: Use `flex-shrink-0` or `shrink-0` classes

**Issue**: Backdrop-filter not working  
**Solution**: Check for `-webkit-backdrop-filter` prefix

### Firefox
**Issue**: Animation performance  
**Solution**: Use `will-change` property for animated elements

### Mobile Safari
**Issue**: Input zoom on focus  
**Solution**: Set `font-size: 16px` minimum on inputs

**Issue**: Safe area insets  
**Solution**: Use `env(safe-area-inset-*)` variables

### Chrome Mobile
**Issue**: Back button behavior  
**Solution**: Handle `popstate` event properly

---

## Performance Targets

### Desktop
- Performance Score: > 90
- Accessibility Score: > 95
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s

### Mobile
- Performance Score: > 80
- Accessibility Score: > 95
- First Contentful Paint: < 2s
- Largest Contentful Paint: < 4s

---

## Testing Tools

### Browser DevTools
- **Chrome**: DevTools > Lighthouse
- **Firefox**: Developer Tools > Performance
- **Safari**: Web Inspector > Timelines

### Online Tools
- **BrowserStack**: https://www.browserstack.com/
- **LambdaTest**: https://www.lambdatest.com/
- **Can I Use**: https://caniuse.com/

### Screen Readers
- **NVDA** (Windows): Free
- **JAWS** (Windows): Commercial
- **VoiceOver** (macOS/iOS): Built-in

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column |
| Tablet | 640px - 1024px | 2-3 columns |
| Desktop | > 1024px | Full grid (max 1440px) |

---

## Accessibility Checklist

- [ ] Keyboard navigation works
- [ ] Focus indicators visible (3px outline)
- [ ] Screen reader announces content
- [ ] Touch targets ≥ 44px
- [ ] Color contrast meets WCAG AA
- [ ] Reduced motion respected

---

## Files

### Test Files
- `client/src/components/advertise/__tests__/CrossBrowserCompatibility.test.tsx`

### Documentation
- `.kiro/specs/advertise-with-us-landing/CROSS_BROWSER_TESTING_CHECKLIST.md`
- `.kiro/specs/advertise-with-us-landing/TASK_21_COMPLETE.md`
- `.kiro/specs/advertise-with-us-landing/CROSS_BROWSER_QUICK_REFERENCE.md` (this file)

---

## Quick Commands

```bash
# Run all tests
npm test -- --run

# Run cross-browser tests only
npm test -- client/src/components/advertise/__tests__/CrossBrowserCompatibility.test.tsx --run

# Run with coverage
npm test -- --run --coverage

# Run in watch mode (development)
npm test

# Build for production
npm run build

# Start dev server
npm run dev
```

---

## Need Help?

1. Check the full testing checklist
2. Review automated test results
3. Consult browser compatibility matrix
4. Test on real devices when possible
5. Document any new issues found

---

**Last Updated**: December 10, 2025  
**Status**: All automated tests passing (27/27)
