# Screen Reader Testing Guide

## Overview

This guide provides comprehensive instructions for testing the Advertise With Us landing page with screen readers to ensure WCAG AA compliance and excellent accessibility.

**Requirement**: 10.5 - Ensure screen reader compatibility with NVDA, JAWS, and VoiceOver.

## Testing Tools

### Windows
- **NVDA** (Free): https://www.nvaccess.org/download/
- **JAWS** (Commercial, trial available): https://www.freedomscientific.com/products/software/jaws/

### macOS
- **VoiceOver** (Built-in): Cmd + F5 to toggle

### iOS
- **VoiceOver** (Built-in): Settings > Accessibility > VoiceOver

## Pre-Testing Checklist

Before beginning screen reader tests:

- [ ] All ARIA attributes are in place
- [ ] All images have alt text
- [ ] All interactive elements have labels
- [ ] Heading hierarchy is correct (H1 → H2 → H3)
- [ ] Form inputs have associated labels
- [ ] Links have descriptive text
- [ ] Buttons describe their action

## NVDA Testing (Windows)

### Setup
1. Download and install NVDA
2. Launch NVDA (Ctrl + Alt + N)
3. Open the landing page in Firefox or Chrome
4. Use NVDA + N to open NVDA menu

### Basic Navigation Tests

#### Test 1: Page Structure
**Steps**:
1. Press H to navigate by headings
2. Verify heading hierarchy (H1 → H2 → H3)
3. Press NVDA + F7 to open Elements List
4. Check headings list

**Expected Results**:
- Hero section has H1: "Advertise With Us..."
- Major sections have H2 headings
- Subsections have H3 headings
- No skipped heading levels

**Status**: ⬜ Pass ⬜ Fail

#### Test 2: Landmarks
**Steps**:
1. Press D to navigate by landmarks
2. Verify all major sections are announced
3. Check banner, main, navigation, contentinfo

**Expected Results**:
- Hero section announced as "banner"
- Main content areas identified
- Navigation areas clearly marked
- Footer identified as "contentinfo"

**Status**: ⬜ Pass ⬜ Fail

#### Test 3: Links
**Steps**:
1. Press K to navigate by links
2. Verify all links have descriptive text
3. Check that link purpose is clear from text alone

**Expected Results**:
- "Learn More" links include context (e.g., "Learn more about Real Estate Agent advertising")
- CTA links clearly state action
- No "click here" or ambiguous links

**Status**: ⬜ Pass ⬜ Fail

#### Test 4: Buttons
**Steps**:
1. Press B to navigate by buttons
2. Verify all buttons describe their action
3. Check button states (pressed, expanded)

**Expected Results**:
- CTA buttons clearly state action
- FAQ accordion buttons announce expanded/collapsed state
- All buttons have accessible names

**Status**: ⬜ Pass ⬜ Fail

#### Test 5: Lists
**Steps**:
1. Press L to navigate by lists
2. Verify card grids are announced as lists
3. Check item counts are announced

**Expected Results**:
- Partner type cards announced as "list with 5 items"
- Feature blocks announced as "list with 4 items"
- FAQ items announced as list

**Status**: ⬜ Pass ⬜ Fail

#### Test 6: Images
**Steps**:
1. Press G to navigate by graphics
2. Verify all images have alt text
3. Check decorative images are marked as such

**Expected Results**:
- Billboard banner has descriptive alt text
- Partner icons have appropriate alt text
- Decorative images have empty alt="" or aria-hidden="true"

**Status**: ⬜ Pass ⬜ Fail

### Interactive Element Tests

#### Test 7: Partner Type Cards
**Steps**:
1. Navigate to partner selection section
2. Tab through each card
3. Verify card content is announced

**Expected Results**:
- Card announced as link
- Icon described
- Title announced
- Benefit description read
- "Learn More" action clear

**Status**: ⬜ Pass ⬜ Fail

#### Test 8: FAQ Accordion
**Steps**:
1. Navigate to FAQ section
2. Tab through accordion items
3. Activate with Enter/Space
4. Verify state changes are announced

**Expected Results**:
- Question announced
- "Button, collapsed" or "Button, expanded" state announced
- Answer content read when expanded
- State changes announced when toggling

**Status**: ⬜ Pass ⬜ Fail

#### Test 9: CTA Buttons
**Steps**:
1. Navigate to CTA buttons
2. Verify button purpose is clear
3. Check button type is announced

**Expected Results**:
- "Get Started" button clearly describes action
- "Request a Demo" button clearly describes action
- Button role announced
- Context provided (e.g., "Get Started - Start advertising now")

**Status**: ⬜ Pass ⬜ Fail

### Forms Mode Tests

#### Test 10: Form Interactions (if applicable)
**Steps**:
1. Navigate to any form inputs
2. Verify labels are announced
3. Check error messages are read
4. Test required field indicators

**Expected Results**:
- Input label announced before input
- Input type announced (text, email, etc.)
- Required fields indicated
- Error messages announced immediately

**Status**: ⬜ Pass ⬜ Fail ⬜ N/A

## JAWS Testing (Windows)

### Setup
1. Install JAWS (trial or licensed version)
2. Launch JAWS
3. Open the landing page in Internet Explorer, Edge, or Chrome
4. Use Insert + F3 to open Elements List

### Key Differences from NVDA
- JAWS uses Insert key instead of NVDA key
- Virtual cursor behavior may differ
- Forms mode activation may differ

### Test Scenarios

Repeat all NVDA tests with JAWS, noting any differences:

#### Test 11: Virtual Cursor Navigation
**Steps**:
1. Use arrow keys to read line by line
2. Verify all content is accessible
3. Check that hidden content is not read

**Expected Results**:
- All visible content is read
- Hidden content (collapsed accordions) not read until expanded
- Smooth reading experience

**Status**: ⬜ Pass ⬜ Fail

#### Test 12: Table Navigation (if applicable)
**Steps**:
1. Navigate to any data tables
2. Use Ctrl + Alt + Arrow keys to navigate cells
3. Verify headers are announced

**Expected Results**:
- Table structure announced
- Row and column headers read with cells
- Navigation between cells works smoothly

**Status**: ⬜ Pass ⬜ Fail ⬜ N/A

## VoiceOver Testing (macOS)

### Setup
1. Press Cmd + F5 to enable VoiceOver
2. Open the landing page in Safari
3. Use VO + U to open rotor

### Basic Navigation Tests

#### Test 13: Rotor Navigation
**Steps**:
1. Press VO + U to open rotor
2. Use left/right arrows to switch between categories
3. Test Headings, Links, Form Controls, Landmarks

**Expected Results**:
- All headings listed in correct order
- All links listed with descriptive text
- All form controls listed with labels
- All landmarks identified

**Status**: ⬜ Pass ⬜ Fail

#### Test 14: VoiceOver Cursor
**Steps**:
1. Use VO + Right Arrow to move through content
2. Verify all elements are announced
3. Check that element types are identified

**Expected Results**:
- All content accessible via VO cursor
- Element types announced (heading, link, button, etc.)
- Smooth navigation experience

**Status**: ⬜ Pass ⬜ Fail

#### Test 15: Quick Nav
**Steps**:
1. Enable Quick Nav (Left + Right arrows)
2. Use H to navigate headings
3. Use L to navigate links
4. Use B to navigate buttons

**Expected Results**:
- Quick Nav shortcuts work correctly
- Navigation is efficient
- All elements reachable

**Status**: ⬜ Pass ⬜ Fail

### Interactive Element Tests

#### Test 16: Custom Controls
**Steps**:
1. Navigate to accordion, cards, and other custom controls
2. Verify they work with VoiceOver
3. Check that state changes are announced

**Expected Results**:
- Custom controls accessible
- States announced correctly
- Actions can be performed

**Status**: ⬜ Pass ⬜ Fail

## VoiceOver Testing (iOS)

### Setup
1. Settings > Accessibility > VoiceOver > On
2. Open Safari and navigate to landing page
3. Use swipe gestures to navigate

### Touch Gesture Tests

#### Test 17: Swipe Navigation
**Steps**:
1. Swipe right to move forward
2. Swipe left to move backward
3. Verify all elements are reachable

**Expected Results**:
- All interactive elements reachable
- Content read in logical order
- No elements skipped

**Status**: ⬜ Pass ⬜ Fail

#### Test 18: Rotor Gestures
**Steps**:
1. Rotate two fingers to open rotor
2. Swipe up/down to navigate by category
3. Test headings, links, buttons

**Expected Results**:
- Rotor opens correctly
- Categories available
- Navigation works smoothly

**Status**: ⬜ Pass ⬜ Fail

#### Test 19: Double-Tap Activation
**Steps**:
1. Navigate to buttons and links
2. Double-tap to activate
3. Verify actions are performed

**Expected Results**:
- Double-tap activates elements
- Actions performed correctly
- Feedback provided

**Status**: ⬜ Pass ⬜ Fail

## Common Issues and Solutions

### Issue: Links Not Descriptive
**Problem**: Links say "Learn More" without context
**Solution**: Add aria-label with full context
```tsx
<a href="/agents" aria-label="Learn more about Real Estate Agent advertising">
  Learn More
</a>
```

### Issue: Accordion State Not Announced
**Problem**: Screen reader doesn't announce expanded/collapsed
**Solution**: Use aria-expanded attribute
```tsx
<button aria-expanded={isOpen} aria-controls="panel-id">
  Question
</button>
```

### Issue: Images Missing Alt Text
**Problem**: Screen reader says "image" without description
**Solution**: Add descriptive alt text
```tsx
<img src="..." alt="Modern apartment building in Sandton" />
```

### Issue: Heading Hierarchy Broken
**Problem**: H1 followed by H3, skipping H2
**Solution**: Fix heading levels
```tsx
<h1>Main Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
```

### Issue: Form Inputs Without Labels
**Problem**: Input purpose unclear
**Solution**: Add proper labels
```tsx
<label htmlFor="email">Email Address</label>
<input id="email" type="email" />
```

## Testing Checklist Summary

### NVDA (Windows)
- [ ] Test 1: Page Structure
- [ ] Test 2: Landmarks
- [ ] Test 3: Links
- [ ] Test 4: Buttons
- [ ] Test 5: Lists
- [ ] Test 6: Images
- [ ] Test 7: Partner Type Cards
- [ ] Test 8: FAQ Accordion
- [ ] Test 9: CTA Buttons
- [ ] Test 10: Form Interactions

### JAWS (Windows)
- [ ] Test 11: Virtual Cursor Navigation
- [ ] Test 12: Table Navigation
- [ ] All NVDA tests repeated

### VoiceOver (macOS)
- [ ] Test 13: Rotor Navigation
- [ ] Test 14: VoiceOver Cursor
- [ ] Test 15: Quick Nav
- [ ] Test 16: Custom Controls

### VoiceOver (iOS)
- [ ] Test 17: Swipe Navigation
- [ ] Test 18: Rotor Gestures
- [ ] Test 19: Double-Tap Activation

## Reporting Issues

When reporting screen reader issues, include:

1. **Screen Reader**: Name and version
2. **Browser**: Name and version
3. **Operating System**: Name and version
4. **Issue Description**: What's wrong
5. **Expected Behavior**: What should happen
6. **Steps to Reproduce**: How to trigger the issue
7. **Severity**: Critical, High, Medium, Low

## Best Practices

1. **Test Early and Often**: Don't wait until the end
2. **Test with Real Users**: Include people who use screen readers daily
3. **Test Multiple Combinations**: Different screen readers + browsers
4. **Document Findings**: Keep detailed notes
5. **Prioritize Fixes**: Address critical issues first
6. **Retest After Fixes**: Verify issues are resolved

## Resources

- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)
- [JAWS Keyboard Shortcuts](https://www.freedomscientific.com/training/jaws/hotkeys/)
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/welcome/mac)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

## Certification

After completing all tests:

**Tested By**: ___________________
**Date**: ___________________
**Overall Result**: ⬜ Pass ⬜ Fail
**Notes**: ___________________
