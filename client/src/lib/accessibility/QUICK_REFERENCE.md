# Color Contrast Quick Reference

## ✅ WCAG AA Compliant Colors

All colors below meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).

### Text Colors

```typescript
// Primary text - Use for headings and body text
color: designTokens.colors.text.primary  // #1f2937 (12.63:1 on white)

// Secondary text - Use for descriptions and metadata
color: designTokens.colors.text.secondary  // #6b7280 (4.69:1 on white)

// Tertiary text - Use for labels and captions
color: designTokens.colors.text.tertiary  // #6b7280 (4.69:1 on white)

// Inverse text - Use on dark backgrounds
color: designTokens.colors.text.inverse  // #ffffff (12.63:1 on dark)
```

### Accent Colors

```typescript
// Primary accent - Use for buttons and links
color: designTokens.colors.accent.primary  // #4f46e5 (5.95:1 on white)

// Hover state - Use for interactive hover states
color: designTokens.colors.accent.hover  // #4338ca (7.35:1 on white)
```

### Status Colors

```typescript
// Success - Use for success messages
color: designTokens.colors.status.success  // #047857 (4.54:1 on white)

// Warning - Use for warning messages
color: designTokens.colors.status.warning  // #b45309 (4.58:1 on white)

// Error - Use for error messages
color: designTokens.colors.status.error  // #dc2626 (5.90:1 on white)

// Info - Use for informational messages
color: designTokens.colors.status.info  // #2563eb (5.14:1 on white)
```

## 🚫 Don't Use

```typescript
// ✗ Old tertiary color (too light)
color: '#9ca3af'  // 2.54:1 - FAILS WCAG AA

// ✗ Old accent color (too light)
color: '#6366f1'  // 4.47:1 - FAILS WCAG AA

// ✗ Old success color (too light)
color: '#10b981'  // 2.54:1 - FAILS WCAG AA

// ✗ Arbitrary colors (unknown contrast)
color: '#abc123'  // Not audited
```

## 📋 Tailwind Classes

```tsx
// Text colors (all compliant)
<p className="text-gray-800">Primary text</p>
<p className="text-gray-600">Secondary text</p>

// Accent colors
<button className="accent-btn text-white">Button</button>
<a className="text-indigo-700">Link</a>

// Status colors
<span className="text-green-700">Success</span>
<span className="text-amber-700">Warning</span>
<span className="text-red-600">Error</span>
<span className="text-blue-600">Info</span>
```

## 🧪 Testing

```bash
# Run automated tests
npm test -- client/src/lib/accessibility/__tests__/colorContrastAudit.test.ts --run

# Generate audit report
npx tsx client/src/lib/accessibility/generateContrastReport.ts
```

## 📊 Contrast Ratios

| Color Combination | Ratio | Status |
|------------------|-------|--------|
| Primary text on white | 12.63:1 | ✅ Excellent |
| Secondary text on white | 4.69:1 | ✅ Pass |
| Tertiary text on white | 4.69:1 | ✅ Pass |
| Accent on white | 5.95:1 | ✅ Pass |
| Success on white | 4.54:1 | ✅ Pass |
| Warning on white | 4.58:1 | ✅ Pass |
| Error on white | 5.90:1 | ✅ Pass |
| Info on white | 5.14:1 | ✅ Pass |
| White on dark | 12.63:1 | ✅ Excellent |

## 🎯 Quick Rules

1. **Always use design tokens** - Never use arbitrary colors
2. **Normal text needs 4.5:1** - For text < 18pt or < 14pt bold
3. **Large text needs 3:1** - For text ≥ 18pt or ≥ 14pt bold
4. **Test before shipping** - Run the audit tool
5. **Document new colors** - Add to audit if adding colors

## 🔗 Resources

- [Full Compliance Guide](./COLOR_CONTRAST_COMPLIANCE.md)
- [Audit Report](./COLOR_CONTRAST_AUDIT_REPORT.md)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
