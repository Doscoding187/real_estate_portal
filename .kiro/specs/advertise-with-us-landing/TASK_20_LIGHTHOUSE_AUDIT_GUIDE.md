# Task 20: Lighthouse Audit Guide

## Overview
This guide provides instructions for running Lighthouse audits on the Advertise With Us landing page to validate performance, accessibility, SEO, and best practices.

## Prerequisites
- Development server running (`npm run dev`)
- Chrome browser installed
- Page accessible at `http://localhost:5000/advertise` (or your dev URL)

## Running Lighthouse Audits

### Method 1: Chrome DevTools (Recommended)
1. Open Chrome and navigate to the Advertise With Us page
2. Open DevTools (F12 or Ctrl+Shift+I)
3. Click on the "Lighthouse" tab
4. Select categories to audit:
   - ✅ Performance
   - ✅ Accessibility
   - ✅ Best Practices
   - ✅ SEO
5. Select device: Mobile and Desktop (run separately)
6. Click "Analyze page load"

### Method 2: Lighthouse CLI
```bash
# Install Lighthouse globally
npm install -g lighthouse

# Run audit for desktop
lighthouse http://localhost:5000/advertise --output html --output-path ./lighthouse-desktop.html --preset=desktop

# Run audit for mobile
lighthouse http://localhost:5000/advertise --output html --output-path ./lighthouse-mobile.html --preset=mobile
```

## Target Scores

### Performance (Target: 90+)
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Total Blocking Time (TBT)**: < 200ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Speed Index**: < 3.4s

### Accessibility (Target: 95+)
- ✅ All interactive elements keyboard accessible
- ✅ Proper ARIA labels and roles
- ✅ Color contrast meets WCAG AA (4.5:1 for text)
- ✅ Focus indicators visible
- ✅ Screen reader compatible
- ✅ Semantic HTML structure

### Best Practices (Target: 95+)
- ✅ HTTPS enabled (in production)
- ✅ No console errors
- ✅ Images have proper aspect ratios
- ✅ No deprecated APIs used

### SEO (Target: 95+)
- ✅ Meta description present (150-160 chars)
- ✅ Title tag present (50-70 chars)
- ✅ Proper heading hierarchy (single H1)
- ✅ Links have descriptive text
- ✅ Images have alt text
- ✅ Robots.txt valid
- ✅ Structured data valid

## Common Issues and Fixes

### Performance Issues

#### Issue: Large images slowing load time
**Fix**: 
- Use WebP format with JPEG fallback
- Implement responsive images with srcset
- Add lazy loading to below-the-fold images
- Compress images (target < 100KB per image)

#### Issue: Render-blocking resources
**Fix**:
- Inline critical CSS
- Defer non-critical CSS
- Use code splitting for lazy-loaded sections
- Add resource hints (preconnect, dns-prefetch)

#### Issue: Large JavaScript bundles
**Fix**:
- Implement code splitting
- Lazy load below-the-fold sections
- Tree-shake unused dependencies
- Use dynamic imports

### Accessibility Issues

#### Issue: Missing ARIA labels
**Fix**: Add aria-label or aria-labelledby to all interactive elements
```tsx
<button aria-label="Get started with advertising">
  Get Started
</button>
```

#### Issue: Low color contrast
**Fix**: Ensure text meets WCAG AA contrast ratio (4.5:1)
```css
/* Bad: #999 on white = 2.8:1 */
color: #999;

/* Good: #666 on white = 5.7:1 */
color: #666;
```

#### Issue: Missing focus indicators
**Fix**: Add visible focus styles
```css
button:focus-visible {
  outline: 3px solid #3b82f6;
  outline-offset: 2px;
}
```

### SEO Issues

#### Issue: Missing meta description
**Fix**: Add meta description in SEOHead component
```tsx
<meta name="description" content="Your 150-160 character description" />
```

#### Issue: Improper heading hierarchy
**Fix**: Ensure single H1, proper H2-H6 nesting
```tsx
<h1>Main Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
```

## Validation Checklist

### Before Running Audit
- [ ] All sections render without errors
- [ ] All images load correctly
- [ ] All CTAs navigate to correct pages
- [ ] Animations work smoothly
- [ ] Mobile responsive layouts work
- [ ] No console errors or warnings

### After Running Audit
- [ ] Performance score ≥ 90
- [ ] Accessibility score ≥ 95
- [ ] Best Practices score ≥ 95
- [ ] SEO score ≥ 95
- [ ] All critical issues resolved
- [ ] Document any remaining issues

## Expected Results

Based on our implementation, we expect:

### ✅ Strong Performance
- Lazy loading implemented for below-the-fold sections
- Code splitting for FAQ, Pricing, Features sections
- Optimized images with lazy loading
- Resource hints in place
- Critical CSS inlined

### ✅ Excellent Accessibility
- Full keyboard navigation support
- Comprehensive ARIA labels
- Skip links implemented
- Focus management in place
- Reduced motion support
- Screen reader tested

### ✅ SEO Optimized
- Complete meta tags (title, description, OG tags)
- Structured data (Schema.org) implemented
- Proper heading hierarchy
- Breadcrumb navigation with structured data
- Semantic HTML throughout

### ✅ Best Practices
- No console errors
- Proper error boundaries
- Loading states for all sections
- Progressive enhancement
- Graceful degradation

## Next Steps

After running audits:

1. **Document Results**: Save Lighthouse reports (HTML files)
2. **Address Issues**: Fix any issues with score < 90
3. **Re-test**: Run audits again after fixes
4. **Update Tasks**: Mark Task 20.1 and 20.2 as complete
5. **Proceed**: Move to Task 21 (Cross-browser testing)

## Resources

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals](https://web.dev/vitals/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Schema.org Documentation](https://schema.org/)

## Notes

- Run audits in incognito mode to avoid extension interference
- Test both mobile and desktop configurations
- Performance scores may vary based on network conditions
- Focus on trends rather than absolute scores
- Production builds typically score higher than development builds
