# Advertise Page CSS Scoping Fix

## Problem
When navigating from the Advertise page to the Home page via breadcrumb navigation, the Home page rendered with broken styling. However, accessing the Home page directly worked fine.

## Root Cause
The `advertise-responsive.css` file was imported in the AdvertiseWithUs component. When using client-side routing (wouter), CSS files imported in components persist in the DOM even after navigating away. Some CSS selectors in the advertise CSS file were NOT properly scoped and could accidentally match elements on other pages.

## Solution
Wrapped **ALL** CSS rules in `advertise-responsive.css` with a parent `.advertise-page` selector to ensure they only apply within the Advertise page context. This includes utility classes, animations, and global-looking selectors.

### Changes Made

1. **AdvertiseWithUs.tsx**
   - Added `advertise-page` class to the main content wrapper
   - Changed: `<main id="main-content" className="bg-white">`
   - To: `<main id="main-content" className="advertise-page bg-white">`

2. **advertise-responsive.css** - Complete Scoping
   - Scoped ALL CSS selectors under `.advertise-page`
   - Component-specific classes:
     - `.hero-section` → `.advertise-page .hero-section`
     - `.feature-tile` → `.advertise-page .feature-tile`
     - `.pricing-card` → `.advertise-page .pricing-card`
     - `.partner-type-card` → `.advertise-page .partner-type-card`
     - `.faq-accordion-item` → `.advertise-page .faq-accordion-item`
     - `.billboard-banner` → `.advertise-page .billboard-banner`
     - `.cta-button-group` → `.advertise-page .cta-button-group`
     - `.connector-line` → `.advertise-page .connector-line`
   
   - Utility classes (CRITICAL FIX):
     - `.advertise-hide-mobile` → `.advertise-page .advertise-hide-mobile`
     - `.advertise-show-mobile` → `.advertise-page .advertise-show-mobile`
     - `.advertise-gradient-text` → `.advertise-page .advertise-gradient-text`
     - `.advertise-section-light` → `.advertise-page .advertise-section-light`
     - `.advertise-section-white` → `.advertise-page .advertise-section-white`
     - `.advertise-section-gradient` → `.advertise-page .advertise-section-gradient`
     - `.advertise-touch-target` → `.advertise-page .advertise-touch-target`
     - `.advertise-focusable` → `.advertise-page .advertise-focusable`
   
   - Animations:
     - `.background-orb` → `.advertise-page .background-orb`
     - `@keyframes float` → `@keyframes advertise-float` (renamed to avoid conflicts)
   
   - Mobile components:
     - `.mobile-sticky-cta` → Kept as-is but added `.advertise-page ~` sibling selector for proper scoping

## Benefits
- **Isolation**: Advertise page styles are now completely isolated and won't leak to other pages
- **Predictability**: Navigation between pages will maintain consistent styling
- **Maintainability**: Clear scoping makes it easier to understand which styles apply where
- **No Side Effects**: Other pages are protected from accidental style overrides

## Testing
To verify the fix:
1. Navigate to `/advertise` page
2. Click the breadcrumb to navigate to Home
3. Verify that the Home page renders with correct styling
4. Navigate directly to Home page
5. Verify styling is identical in both cases

## Technical Details
- **CSS Specificity**: By adding `.advertise-page` as a parent selector, we increase specificity only for elements within the advertise page
- **Scoping Strategy**: All class-based selectors are now scoped, including media queries and pseudo-selectors
- **Performance**: No performance impact - CSS specificity is resolved at parse time

## Files Modified
- `client/src/pages/AdvertiseWithUs.tsx`
- `client/src/styles/advertise-responsive.css`

## Related Issues
This fix resolves the CSS specificity conflict that was causing styling issues when navigating between pages using client-side routing.
