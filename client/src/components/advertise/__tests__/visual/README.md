# Visual Regression Testing Guide

This directory contains visual regression tests for the Advertise With Us landing page using Playwright.

## Overview

Visual regression testing captures screenshots of the page and its components across different viewports and interaction states. These screenshots serve as a baseline, and future test runs will compare against them to detect unintended visual changes.

## Test Coverage

### Full Page Screenshots
- Desktop (1440px)
- Tablet (768px)
- Mobile (375px)

### Section Screenshots
- Hero Section
- Partner Selection Section
- Value Proposition Section
- How It Works Section
- Features Grid Section
- Social Proof Section
- Pricing Preview Section
- Final CTA Section
- FAQ Section (collapsed and expanded)

### Interaction States
- **Hover States**: CTA buttons, partner cards, feature tiles, pricing cards, FAQ items
- **Animation States**: Fade-up, staggered, count-up, billboard hover
- **Loading States**: Skeleton loaders, loading spinners, progressive loading
- **Error States**: Error messages, error boundaries, retry buttons, fallback content
- **Focus States**: CTA buttons, FAQ items, partner cards
- **Active States**: Button pressed, FAQ expanded

## Requirements Validated

- **Requirement 10.2**: Mobile responsive layouts (< 768px)
- **Requirement 10.3**: Tablet responsive layouts (768px - 1024px)
- **Requirement 10.4**: Desktop responsive layouts (> 1024px)
- **Requirement 11.2**: Interactive element hover effects

## Running Tests

### First Time Setup

1. Install Playwright browsers:
   ```bash
   pnpm exec playwright install
   ```

2. Start the development server:
   ```bash
   pnpm dev:frontend
   ```

### Running All Visual Tests

```bash
# Run all visual regression tests
pnpm exec playwright test

# Run tests in UI mode (interactive)
pnpm exec playwright test --ui

# Run tests for specific viewport
pnpm exec playwright test --project="Desktop Chrome"
pnpm exec playwright test --project="Tablet iPad"
pnpm exec playwright test --project="Mobile iPhone"
```

### Running Specific Test Files

```bash
# Run only full page tests
pnpm exec playwright test AdvertisePage.visual.test.ts

# Run only interaction state tests
pnpm exec playwright test InteractionStates.visual.test.ts
```

### Updating Baseline Screenshots

When you intentionally change the UI, you need to update the baseline screenshots:

```bash
# Update all baselines
pnpm exec playwright test --update-snapshots

# Update baselines for specific test
pnpm exec playwright test AdvertisePage.visual.test.ts --update-snapshots

# Update baselines for specific viewport
pnpm exec playwright test --project="Desktop Chrome" --update-snapshots
```

## Screenshot Storage

Screenshots are stored in:
```
client/src/components/advertise/__tests__/visual/
├── AdvertisePage.visual.test.ts-snapshots/
│   ├── Desktop-Chrome/
│   │   ├── advertise-full-page-desktop.png
│   │   ├── hero-section.png
│   │   └── ...
│   ├── Tablet-iPad/
│   │   ├── advertise-full-page-tablet.png
│   │   └── ...
│   └── Mobile-iPhone/
│       ├── advertise-full-page-mobile.png
│       └── ...
└── InteractionStates.visual.test.ts-snapshots/
    └── ...
```

## Test Reports

After running tests, view the HTML report:

```bash
pnpm exec playwright show-report
```

The report includes:
- Test results (pass/fail)
- Screenshot comparisons (expected vs actual)
- Diff images highlighting changes
- Test execution timeline

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Visual Regression Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps
      
      - name: Run visual regression tests
        run: pnpm exec playwright test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

### 1. Disable Animations
Always disable animations in tests to prevent flakiness:
```typescript
await expect(element).toHaveScreenshot('name.png', {
  animations: 'disabled',
});
```

### 2. Wait for Stability
Wait for page to be fully loaded and stable:
```typescript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Additional buffer
```

### 3. Scroll Into View
Ensure elements are visible before capturing:
```typescript
await element.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
```

### 4. Handle Dynamic Content
Mock or stabilize dynamic content (dates, random data):
```typescript
await page.route('**/api/**', route => {
  route.fulfill({
    body: JSON.stringify(mockData),
  });
});
```

### 5. Use Test IDs
Add data-testid attributes to components for reliable selection:
```tsx
<section data-testid="hero-section">
  {/* content */}
</section>
```

## Troubleshooting

### Tests Failing Due to Minor Differences

Adjust the threshold in `playwright.config.ts`:
```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,  // Increase if needed
    threshold: 0.2,      // Increase for more tolerance (0-1)
  },
}
```

### Screenshots Look Different on CI

Ensure consistent font rendering:
```typescript
// In playwright.config.ts
use: {
  // Force consistent font rendering
  deviceScaleFactor: 1,
  hasTouch: false,
}
```

### Animations Causing Flakiness

Increase wait times or disable animations globally:
```typescript
await page.addStyleTag({
  content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }'
});
```

### Element Not Found

Check if element is rendered conditionally:
```typescript
const element = page.locator('[data-testid="element"]').first();
if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
  await expect(element).toHaveScreenshot('name.png');
}
```

## Maintenance

### Regular Updates

1. **After UI Changes**: Update baselines when you intentionally change the UI
2. **After Dependency Updates**: Re-run tests after updating UI libraries
3. **Quarterly Review**: Review and clean up unused screenshots

### Baseline Management

- Store baselines in version control (Git)
- Review baseline changes in pull requests
- Document reasons for baseline updates in commit messages

## Integration with Existing Tests

Visual regression tests complement existing unit and property-based tests:

- **Unit Tests**: Test component logic and behavior
- **Property Tests**: Test universal properties across inputs
- **Visual Tests**: Test visual appearance and layout

All three types work together to ensure comprehensive quality.

## Performance Considerations

- Visual tests are slower than unit tests (30-60s per test)
- Run visual tests in CI on pull requests, not on every commit
- Use `--project` flag to test specific viewports during development
- Consider running full suite nightly or before releases

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Visual Regression Testing Best Practices](https://playwright.dev/docs/test-snapshots)
- [Playwright Test Generator](https://playwright.dev/docs/codegen)
