# Advertise With Us Page - Troubleshooting Guide

## Overview
This document provides a systematic approach to identifying and resolving common issues with the Advertise With Us landing page. Use this guide to diagnose problems and implement fixes effectively.

## Common Issues and Solutions

### 1. Layout and Alignment Issues

#### Problem: Sections not centered or misaligned
**Symptoms**:
- Content appears shifted to one side
- Uneven margins/padding
- Elements breaking out of container boundaries

**Diagnosis**:
1. Check that each section uses the proper container wrapper:
   ```jsx
   <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
   ```

2. Verify that sections have consistent padding:
   ```jsx
   <section className="py-20 md:py-28">
   ```

**Solution**:
- Ensure all components use the standardized container wrapper
- Check for conflicting CSS styles in `advertise-responsive.css`
- Verify that no inline styles override the container settings

#### Problem: Horizontal overflow/scrollbar appearing
**Symptoms**:
- Horizontal scrollbar on page
- Content extending beyond viewport

**Diagnosis**:
1. Inspect elements that might be too wide:
   - Images without proper constraints
   - Grids without proper wrapping
   - Fixed-width elements

2. Check responsive CSS for any `min-width` properties that might cause overflow

**Solution**:
- Add `overflow-x-hidden` to body or problematic containers
- Ensure images use `max-w-full` class
- Review grid definitions in responsive CSS

### 2. Typography Issues

#### Problem: Heading sizes inconsistent
**Symptoms**:
- Headings appear too small or too large
- Inconsistent sizing across sections
- Line height issues

**Diagnosis**:
1. Verify heading classes match design tokens:
   - H1: `text-4xl md:text-5xl font-bold leading-tight`
   - H2: `text-3xl md:text-4xl font-semibold leading-tight`
   - H3: `text-2xl font-semibold leading-snug`

2. Check for conflicting styles in component files

**Solution**:
- Standardize heading classes across all components
- Remove inline styles that override typography
- Ensure responsive sizing is properly implemented

#### Problem: Text readability issues
**Symptoms**:
- Poor color contrast
- Line lengths too long
- Insufficient line spacing

**Diagnosis**:
1. Check text color against background using accessibility tools
2. Verify line lengths don't exceed 75 characters
3. Confirm line height settings (`leading-relaxed` for body text)

**Solution**:
- Adjust text colors to meet WCAG AAA standards
- Add `max-w-2xl` or `max-w-3xl` to text containers
- Use appropriate line height classes

### 3. Grid and Flexbox Layout Issues

#### Problem: Grid columns not behaving correctly
**Symptoms**:
- Grid items stacking when they should be side-by-side
- Columns of unequal width
- Grid breaking at wrong breakpoints

**Diagnosis**:
1. Check grid class definitions:
   - Partner cards: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8`
   - Features: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10`
   - How It Works: `flex flex-col md:flex-row items-center justify-between gap-10`

2. Verify responsive CSS isn't overriding Tailwind classes

**Solution**:
- Ensure proper breakpoint classes are used
- Check for CSS specificity conflicts
- Verify gap sizes match design specifications

#### Problem: Flex layouts not stacking correctly on mobile
**Symptoms**:
- Elements overlapping on small screens
- Flex items not wrapping
- Incorrect alignment on mobile

**Diagnosis**:
1. Check flex direction changes:
   ```jsx
   <div className="flex flex-col md:flex-row">
   ```

2. Verify responsive utility classes for alignment:
   ```jsx
   <div className="items-center justify-between">
   ```

**Solution**:
- Ensure mobile-first approach with proper breakpoint classes
- Add explicit mobile classes where needed
- Check for fixed dimensions that prevent responsive behavior

### 4. Spacing Issues

#### Problem: Inconsistent vertical rhythm
**Symptoms**:
- Sections too close together or too far apart
- Uneven spacing between elements
- Collapsed margins

**Diagnosis**:
1. Verify section padding:
   ```jsx
   <section className="py-20 md:py-28">
   ```

2. Check block spacing:
   ```jsx
   <div className="mt-10 md:mt-16"> // Standard
   <div className="mt-16 md:mt-24"> // Large
   ```

**Solution**:
- Standardize section padding across all components
- Use consistent margin classes for block spacing
- Remove any hardcoded spacing values

#### Problem: Gap sizes inconsistent
**Symptoms**:
- Grid gaps too tight or too loose
- Flex gaps not matching design
- Inconsistent whitespace

**Diagnosis**:
1. Check gap classes:
   - Small gaps: `gap-4` or `gap-6`
   - Medium gaps: `gap-8`
   - Large gaps: `gap-10` or `gap-12`

2. Verify responsive gap changes in CSS

**Solution**:
- Standardize gap sizes according to design specifications
- Ensure responsive gaps match across breakpoints
- Remove inline gap styles that conflict with Tailwind

### 5. Responsive Design Issues

#### Problem: Mobile layout breaking
**Symptoms**:
- Text too small to read
- Buttons too small to tap
- Layout elements overlapping

**Diagnosis**:
1. Check mobile-specific styles in `advertise-responsive.css`
2. Verify touch target sizes (minimum 44px)
3. Confirm proper viewport meta tag

**Solution**:
- Adjust font sizes for mobile using responsive classes
- Increase touch target sizes with padding
- Add mobile-specific spacing adjustments

#### Problem: Tablet layout issues
**Symptoms**:
- Grids not transitioning properly
- Text awkwardly spaced
- Elements not utilizing available space

**Diagnosis**:
1. Check tablet breakpoint (768px - 1024px)
2. Verify 2-column grid implementations
3. Confirm proper spacing adjustments

**Solution**:
- Fine-tune tablet-specific styles
- Adjust grid column counts for tablet
- Optimize text wrapping and line lengths

### 6. Animation and Performance Issues

#### Problem: Janky animations
**Symptoms**:
- Choppy or stuttering animations
- Delayed response to interactions
- Layout shifts during animations

**Diagnosis**:
1. Check animation properties:
   - Use `transform` and `opacity` for best performance
   - Avoid animating layout properties
   - Limit simultaneous animations

2. Verify framer-motion usage follows best practices

**Solution**:
- Optimize animation properties
- Reduce animation complexity on mobile
- Implement `will-change` for complex animations

#### Problem: Slow page load
**Symptoms**:
- Long initial render times
- Delayed interactivity
- Large bundle sizes

**Diagnosis**:
1. Check for unnecessary re-renders
2. Verify image optimization
3. Confirm code splitting implementation

**Solution**:
- Implement React.memo for static components
- Optimize images with proper formats and sizes
- Review bundle analysis for optimization opportunities

### 7. Accessibility Issues

#### Problem: Keyboard navigation problems
**Symptoms**:
- Focus trapped in components
- Unreachable interactive elements
- Confusing tab order

**Diagnosis**:
1. Test tab navigation through all interactive elements
2. Check focus management in modal/dialog components
3. Verify ARIA attributes are properly implemented

**Solution**:
- Implement proper focus trapping
- Ensure logical tab order
- Add missing ARIA attributes

#### Problem: Screen reader issues
**Symptoms**:
- Content not announced correctly
- Missing landmark regions
- Confusing element relationships

**Diagnosis**:
1. Test with screen reader software
2. Check semantic HTML structure
3. Verify ARIA landmark usage

**Solution**:
- Improve semantic markup
- Add appropriate ARIA landmarks
- Implement accessible naming patterns

## Debugging Tools and Techniques

### Browser Developer Tools
1. **Elements Panel**: Inspect layout, styles, and DOM structure
2. **Console**: Check for JavaScript errors
3. **Network**: Monitor asset loading and API calls
4. **Performance**: Analyze rendering performance
5. **Accessibility**: Audit accessibility issues

### React Developer Tools
1. **Component Tree**: Understand component hierarchy
2. **Props and State**: Debug data flow issues
3. **Re-renders**: Identify performance bottlenecks

### Lighthouse Audit
1. **Performance**: Identify loading and runtime issues
2. **Accessibility**: Find accessibility violations
3. **Best Practices**: Catch common implementation issues
4. **SEO**: Ensure proper indexing

## Testing Checklist

### Visual QA
- [ ] All sections centered with max-w-7xl wrapper
- [ ] Consistent heading sizes across all sections
- [ ] Consistent spacing (py-20 md:py-28)
- [ ] Grids maintain proper columns at all breakpoints
- [ ] No horizontal overflow
- [ ] CTAs stack properly on mobile
- [ ] Images scale correctly
- [ ] Typography follows design tokens
- [ ] No alignment issues on any device

### Functional Testing
- [ ] All CTAs navigate to correct destinations
- [ ] FAQ accordion expands/collapses correctly
- [ ] Animations perform smoothly
- [ ] Tracking events fire appropriately

### Cross-browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Android Chrome)

### Device Testing
- [ ] Mobile (various screen sizes)
- [ ] Tablet (portrait and landscape)
- [ ] Desktop (multiple resolutions)

## Quick Fix Commands

### To Reset and Rebuild
```bash
# Clear build cache
rm -rf node_modules/.vite

# Reinstall dependencies
pnpm install

# Build project
pnpm build

# Start development server
pnpm dev
```

### To Check for TypeScript Errors
```bash
pnpm check
```

### To Fix Linting Issues
```bash
pnpm lint
```

### To Format Code
```bash
pnpm format
```

## Emergency Rollback Procedure

If issues persist after attempted fixes:

1. **Identify the last working commit**:
   ```bash
   git log --oneline -10
   ```

2. **Revert to the last known good state**:
   ```bash
   git revert <commit-hash>
   ```

3. **Push the rollback**:
   ```bash
   git push origin main
   ```

## Prevention Best Practices

### Code Reviews
- Always review layout changes
- Check responsive behavior
- Verify accessibility compliance

### Testing Protocol
- Test on multiple devices
- Validate with accessibility tools
- Perform performance audits

### Documentation
- Update this troubleshooting guide with new issues
- Document custom solutions
- Maintain component usage guidelines

## Support Resources

### Internal Documentation
- `LAYOUT_FIX_PLAN.md` - Original layout specifications
- `DESIGN_TOKENS.md` - Design system specifications
- Component README files in `client/src/components/advertise/`

### External Resources
- Tailwind CSS documentation
- Framer Motion documentation
- Web Content Accessibility Guidelines (WCAG)

## Contact Information

For persistent issues that cannot be resolved with this guide, contact:
- Frontend Team Lead
- UX/UI Designer
- Accessibility Specialist

Include the following information in your request:
1. Specific issue description
2. Screenshots/video of the problem
3. Browser/device information
4. Steps to reproduce
5. Any recent changes that might have caused the issue