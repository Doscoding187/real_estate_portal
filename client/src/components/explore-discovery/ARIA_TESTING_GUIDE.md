# ARIA Testing Guide for Explore Feature

## Overview

This guide provides step-by-step instructions for testing ARIA compliance and screen reader support in the Explore feature.

## Requirements

- **Requirement 5.2**: Add descriptive aria-label to all buttons, aria-live regions for dynamic content, and role attributes where appropriate

## Testing Tools

### Screen Readers

#### Windows
- **NVDA** (Free): https://www.nvaccess.org/download/
- **JAWS** (Commercial): https://www.freedomscientific.com/products/software/jaws/

#### macOS/iOS
- **VoiceOver** (Built-in): System Preferences > Accessibility > VoiceOver

#### Android
- **TalkBack** (Built-in): Settings > Accessibility > TalkBack

### Browser Extensions

- **axe DevTools**: https://www.deque.com/axe/devtools/
- **WAVE**: https://wave.webaim.org/extension/
- **Lighthouse**: Built into Chrome DevTools

## Manual Testing Checklist

### 1. Card Components

#### PropertyCard
- [ ] Article role is present
- [ ] Aria-label includes property title, location, and price
- [ ] Feature list has proper list/listitem roles
- [ ] Icons are aria-hidden with screen reader text
- [ ] Save button has descriptive aria-label
- [ ] Property type badge has status role

#### VideoCard
- [ ] Article role is present
- [ ] Aria-label includes video title, creator, and views
- [ ] Save button has aria-pressed attribute
- [ ] Duration badge has status role
- [ ] Views badge has status role
- [ ] Icons are aria-hidden

#### NeighbourhoodCard
- [ ] Article role is present
- [ ] Aria-label includes neighbourhood name and city
- [ ] Follow button has aria-pressed attribute
- [ ] Statistics list has proper list/listitem roles
- [ ] Screen reader text for stat icons

#### InsightCard
- [ ] Article role is present
- [ ] Aria-label includes insight type and title
- [ ] Badge has status role
- [ ] Data values are properly announced

### 2. Feed Components

#### DiscoveryCardFeed
- [ ] Feed role on main container
- [ ] Aria-busy during loading
- [ ] Alert role for errors with aria-live="assertive"
- [ ] Status role for empty states with aria-live="polite"
- [ ] Load more has status role
- [ ] End of feed has status role

#### ContentBlockSection
- [ ] Region role on section container
- [ ] Heading has unique ID
- [ ] Aria-labelledby links to heading
- [ ] List role on card container
- [ ] Listitem role on individual cards
- [ ] Scroll buttons have aria-label

### 3. Navigation Components

#### View Mode Toggle
- [ ] Tablist role on container
- [ ] Tab role on each button
- [ ] Aria-selected on active tab
- [ ] Aria-controls links to content
- [ ] Icons are aria-hidden

#### Category Selector
- [ ] Proper tab/tablist structure
- [ ] Aria-selected indicates active category
- [ ] Keyboard navigation works (Arrow keys)

### 4. Interactive Elements

#### Buttons
- [ ] All icon-only buttons have aria-label
- [ ] Toggle buttons have aria-pressed
- [ ] Expandable buttons have aria-expanded
- [ ] Buttons have type="button" (not submit)

#### Links
- [ ] Descriptive aria-label when needed
- [ ] Aria-current on active page links

### 5. Dynamic Content

#### Loading States
- [ ] Aria-busy="true" during loading
- [ ] Status role with aria-live="polite"
- [ ] Loading spinner is aria-hidden
- [ ] Loading text is announced

#### Error Messages
- [ ] Alert role for errors
- [ ] Aria-live="assertive" for immediate announcement
- [ ] Retry button has descriptive label

#### Empty States
- [ ] Status role for informational messages
- [ ] Aria-live="polite" for announcements
- [ ] Decorative icons are aria-hidden

## Screen Reader Testing Steps

### NVDA (Windows)

1. **Start NVDA**: Ctrl + Alt + N
2. **Navigate to Explore page**
3. **Test Card Navigation**:
   - Press H to jump between headings
   - Press B to jump between buttons
   - Press L to jump between lists
   - Verify all content is announced correctly

4. **Test Interactive Elements**:
   - Tab through all interactive elements
   - Verify button labels are descriptive
   - Verify toggle states are announced
   - Press Enter/Space to activate

5. **Test Live Regions**:
   - Trigger loading state
   - Verify "Loading..." is announced
   - Trigger error state
   - Verify error is announced immediately

6. **Test Feed Navigation**:
   - Navigate through card feed
   - Verify each card is announced as article
   - Verify card content is properly structured
   - Test "See All" buttons

### VoiceOver (macOS)

1. **Start VoiceOver**: Cmd + F5
2. **Navigate to Explore page**
3. **Use VoiceOver Rotor**: Cmd + Option + U
   - Select Headings
   - Select Links
   - Select Form Controls
   - Verify all elements are listed

4. **Test Card Navigation**:
   - Use VO + Right Arrow to navigate
   - Verify card structure is announced
   - Verify all content is accessible

5. **Test Interactive Elements**:
   - Tab through buttons
   - Verify labels and states
   - Test activation with VO + Space

### TalkBack (Android)

1. **Enable TalkBack**: Settings > Accessibility > TalkBack
2. **Navigate to Explore page**
3. **Swipe Right** to navigate forward
4. **Swipe Left** to navigate backward
5. **Double Tap** to activate elements
6. **Verify**:
   - All cards are announced
   - Buttons have descriptive labels
   - States are properly announced

## Automated Testing

### Run Unit Tests

```bash
npm test -- AriaCompliance.test.tsx
```

### Run Lighthouse Audit

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Accessibility" category
4. Run audit
5. Target score: 90+

### Run axe DevTools

1. Install axe DevTools extension
2. Open DevTools
3. Go to axe DevTools tab
4. Click "Scan ALL of my page"
5. Review and fix any issues

## Common Issues and Fixes

### Issue: Button has no accessible name
**Fix**: Add aria-label attribute
```tsx
<button aria-label="Save property">
  <Heart />
</button>
```

### Issue: Icon is announced by screen reader
**Fix**: Add aria-hidden="true"
```tsx
<Heart aria-hidden="true" />
```

### Issue: Dynamic content not announced
**Fix**: Add aria-live region
```tsx
<div role="status" aria-live="polite">
  {message}
</div>
```

### Issue: Toggle state not announced
**Fix**: Add aria-pressed attribute
```tsx
<button aria-pressed={isActive}>
  Toggle
</button>
```

### Issue: List structure not recognized
**Fix**: Add proper list roles
```tsx
<div role="list">
  <div role="listitem">Item 1</div>
  <div role="listitem">Item 2</div>
</div>
```

## Validation Criteria

### Pass Criteria
- ✅ All interactive elements have accessible names
- ✅ All images have alt text or are aria-hidden
- ✅ All form controls have labels
- ✅ Color contrast meets WCAG AA (4.5:1)
- ✅ Keyboard navigation works throughout
- ✅ Focus indicators are visible
- ✅ Screen reader announces all content correctly
- ✅ Live regions announce dynamic changes
- ✅ Lighthouse accessibility score 90+
- ✅ Zero critical/serious axe issues

### Fail Criteria
- ❌ Any interactive element without accessible name
- ❌ Any icon announced by screen reader (should be hidden)
- ❌ Any dynamic content not announced
- ❌ Any keyboard trap
- ❌ Any missing focus indicator
- ❌ Lighthouse score below 90
- ❌ Any critical/serious axe issues

## Documentation

After testing, document results in:
- `ARIA_COMPLIANCE_REPORT.md`
- Include Lighthouse scores
- Include axe DevTools results
- Include manual testing notes
- Include any issues found and fixes applied

## Resources

- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Deque University](https://dequeuniversity.com/)
