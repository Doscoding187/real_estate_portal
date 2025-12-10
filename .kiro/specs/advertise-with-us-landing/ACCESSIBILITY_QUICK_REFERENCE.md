# Accessibility Quick Reference

## Quick Start

### 1. Import Focus Indicators
```tsx
import '@/styles/advertise-focus-indicators.css';
```

### 2. Initialize Focus Manager
```tsx
import { useFocusManager } from '@/hooks/useFocusManagement';

function App() {
  useFocusManager();
  return <YourApp />;
}
```

### 3. Add Skip Links
```tsx
import { SkipLinks } from '@/components/advertise/SkipLinks';

<SkipLinks />
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Next element |
| `Shift+Tab` | Previous element |
| `Arrow Keys` | Navigate grids |
| `Home` | First item |
| `End` | Last item |
| `Enter` | Activate |
| `Space` | Toggle |
| `Esc` | Close |
| `Shift+?` | Keyboard guide |

## ARIA Patterns

### Section
```tsx
<section
  aria-labelledby="heading-id"
  aria-describedby="description-id"
  role="region"
>
```

### List
```tsx
<div role="list">
  <div role="listitem">
```

### Accordion
```tsx
<button
  aria-expanded={isOpen}
  aria-controls="panel-id"
>
```

## Focus Indicators

- **Width**: 3px (exceeds 2px minimum)
- **Contrast**: 4.5:1 minimum
- **Offset**: 2px
- **Color**: #667eea (primary)

## Testing

### Run Audit
```tsx
import { runAccessibilityAudit } from '@/lib/accessibility/accessibilityAudit';

const result = runAccessibilityAudit();
console.log(result.score); // 0-100
```

### Screen Readers
- **NVDA**: Free, Windows
- **JAWS**: Commercial, Windows
- **VoiceOver**: Built-in, macOS/iOS

## Common Issues

### Missing Alt Text
```tsx
// ❌ Bad
<img src="..." />

// ✅ Good
<img src="..." alt="Description" />
```

### Generic Links
```tsx
// ❌ Bad
<a href="...">Learn More</a>

// ✅ Good
<a href="..." aria-label="Learn more about agents">
  Learn More
</a>
```

### Heading Hierarchy
```tsx
// ❌ Bad
<h1>Title</h1>
<h3>Subtitle</h3>

// ✅ Good
<h1>Title</h1>
<h2>Subtitle</h2>
```

## Files

### Utilities
- `ariaHelpers.ts` - ARIA generation
- `focusManager.ts` - Focus utilities
- `accessibilityAudit.ts` - Automated testing

### Components
- `SkipLinks.tsx` - Skip navigation
- `KeyboardNavigationGuide.tsx` - Shortcuts

### Hooks
- `useRovingTabIndex.ts` - Grid navigation
- `useFocusManagement.ts` - Focus hooks

### Styles
- `advertise-focus-indicators.css` - Focus styles

## Documentation

- `ACCESSIBILITY_IMPLEMENTATION.md` - Full guide
- `SCREEN_READER_TESTING_GUIDE.md` - Testing
- `TASK_13_ACCESSIBILITY_COMPLETE.md` - Summary

## WCAG Checklist

### Level A
- ✅ Alt text on images
- ✅ Keyboard accessible
- ✅ No keyboard traps
- ✅ Language attribute
- ✅ Valid HTML
- ✅ Proper labels

### Level AA
- ✅ 4.5:1 contrast
- ✅ Multiple navigation
- ✅ Descriptive headings
- ✅ Visible focus
- ✅ Consistent navigation
- ✅ Consistent identification

## Support

See full documentation for:
- Detailed implementation guides
- Complete testing procedures
- Troubleshooting tips
- WCAG compliance details
