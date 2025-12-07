# Keyboard Navigation Guide

## Overview

The Explore feature includes comprehensive keyboard navigation support to ensure accessibility compliance (WCAG AA) and provide an excellent experience for keyboard users.

**Requirements:** 5.1, 5.6

## Features

### 1. Visible Focus Indicators

All interactive elements have clear, high-contrast focus indicators:

- **Buttons**: 2px indigo outline with 4px shadow
- **Links**: 2px indigo outline with underline
- **Form inputs**: 2px indigo outline with 3px shadow
- **Cards**: 2px indigo outline with 4px shadow

### 2. Keyboard Shortcuts

#### Navigation
- `↑` / `↓` - Navigate between items vertically
- `←` / `→` - Navigate between items horizontally
- `Home` - Go to first item
- `End` - Go to last item
- `Tab` - Move to next interactive element
- `Shift + Tab` - Move to previous interactive element

#### Actions
- `Enter` - Activate selected item
- `Space` - Activate button or toggle
- `Escape` - Close modal or panel

#### Filters
- `F` - Open filters panel
- `Ctrl + K` - Focus search
- `Ctrl + Shift + F` - Clear all filters

#### View
- `V` - Toggle view mode
- `M` - Toggle map view
- `G` - Toggle grid/list view

#### Video Controls (ExploreShorts)
- `Space` / `Enter` - Play/pause video
- `L` - Like video
- `S` - Share video
- `C` - Contact agent

#### Help
- `?` - Show keyboard shortcuts guide

### 3. Focus Management

#### Focus Trap
Modals and panels implement focus trapping:
- Focus stays within the modal
- Tab cycles through interactive elements
- Shift+Tab cycles backwards
- Escape closes and returns focus

#### Skip Links
Skip to main content link appears on Tab:
- Allows keyboard users to skip navigation
- Smooth scroll to main content
- Hidden until focused

#### Focus Restoration
When closing modals:
- Focus returns to triggering element
- Maintains user's place in navigation

### 4. Logical Tab Order

Tab order follows visual layout:
1. Skip link
2. Main navigation
3. Filter controls
4. Content cards
5. Action buttons
6. Footer

## Implementation

### Using Keyboard Navigation Hook

```typescript
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

function MyComponent() {
  const shortcuts = [
    {
      key: 'f',
      description: 'Open filters',
      action: () => setFiltersOpen(true),
    },
    {
      key: 'Escape',
      description: 'Close',
      action: () => onClose(),
    },
  ];

  useKeyboardNavigation({
    shortcuts,
    enabled: true,
    preventDefaultKeys: ['ArrowDown', 'ArrowUp'],
  });

  return <div>...</div>;
}
```

### Using Focus Trap

```typescript
import { useFocusTrap } from '@/hooks/useKeyboardNavigation';

function Modal({ isOpen }) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useFocusTrap(modalRef, isOpen);

  return (
    <div ref={modalRef} role="dialog">
      {/* Modal content */}
    </div>
  );
}
```

### Using Escape Key Handler

```typescript
import { useEscapeKey } from '@/hooks/useKeyboardNavigation';

function Panel({ onClose }) {
  useEscapeKey(onClose, true);

  return <div>...</div>;
}
```

### Using Arrow Key Navigation

```typescript
import { useArrowKeyNavigation } from '@/hooks/useKeyboardNavigation';

function List({ items }) {
  const handleNavigate = (index: number) => {
    // Scroll to item, highlight, etc.
  };

  useArrowKeyNavigation(items.length, handleNavigate, true);

  return <div>...</div>;
}
```

## Components with Keyboard Support

### IconButton
- Full keyboard support
- Visible focus indicator
- ARIA labels

### ModernCard
- Keyboard activatable when interactive
- Enter/Space to activate
- Visible focus indicator

### MicroPill
- Keyboard selectable
- ARIA pressed state
- Visible focus indicator

### FilterPanel
- Full keyboard navigation
- Focus trap when open
- Escape to close

### MobileFilterBottomSheet
- Full keyboard navigation
- Focus trap when open
- Escape to close
- Snap point keyboard controls

### VideoCard
- Space/Enter to play/pause
- L to like
- S to share
- C to contact
- Arrow keys to navigate

## Testing Keyboard Navigation

### Manual Testing Checklist

1. **Tab Order**
   - [ ] Tab through all interactive elements
   - [ ] Order follows visual layout
   - [ ] No focus traps (except intentional)
   - [ ] All elements reachable

2. **Focus Indicators**
   - [ ] All focused elements have visible indicator
   - [ ] Indicators have sufficient contrast
   - [ ] Indicators don't obscure content

3. **Keyboard Shortcuts**
   - [ ] All shortcuts work as expected
   - [ ] No conflicts with browser shortcuts
   - [ ] Shortcuts documented in guide

4. **Modals and Panels**
   - [ ] Focus trapped when open
   - [ ] Escape closes
   - [ ] Focus restored on close

5. **Skip Links**
   - [ ] Skip link appears on Tab
   - [ ] Skips to main content
   - [ ] Works on all pages

### Automated Testing

Run keyboard navigation tests:

```bash
npm test -- useKeyboardNavigation.test.ts
```

## Accessibility Compliance

### WCAG AA Requirements Met

- ✅ **2.1.1 Keyboard** - All functionality available via keyboard
- ✅ **2.1.2 No Keyboard Trap** - Focus can move away from all components
- ✅ **2.4.3 Focus Order** - Logical and consistent focus order
- ✅ **2.4.7 Focus Visible** - Keyboard focus indicator visible
- ✅ **3.2.1 On Focus** - No unexpected context changes on focus

### Testing Tools

- **Keyboard Only**: Navigate entire app with keyboard
- **Screen Reader**: Test with NVDA/JAWS
- **Lighthouse**: Run accessibility audit
- **axe DevTools**: Check for violations

## Browser Support

Keyboard navigation works in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Known Issues

None currently.

## Future Enhancements

- [ ] Customizable keyboard shortcuts
- [ ] Keyboard shortcut cheat sheet overlay
- [ ] Voice control integration
- [ ] Gamepad support

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Keyboard Navigation Best Practices](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [Focus Management](https://www.w3.org/WAI/ARIA/apg/practices/focus-management/)
