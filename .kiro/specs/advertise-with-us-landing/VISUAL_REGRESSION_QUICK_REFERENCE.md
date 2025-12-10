# Visual Regression Testing - Quick Reference

## Quick Start

```bash
# 1. Install Playwright browsers (first time only)
pnpm exec playwright install

# 2. Start dev server (in separate terminal)
pnpm dev:frontend

# 3. Run visual tests
pnpm test:visual

# 4. View report
pnpm test:visual:report
```

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm test:visual` | Run all visual regression tests |
| `pnpm test:visual:ui` | Run tests in interactive UI mode |
| `pnpm test:visual:update` | Update baseline screenshots |
| `pnpm test:visual:report` | View HTML test report |

## Test by Viewport

```bash
# Desktop
pnpm exec playwright test --project="Desktop Chrome"

# Tablet
pnpm exec playwright test --project="Tablet iPad"

# Mobile
pnpm exec playwright test --project="Mobile iPhone"
```

## Test Specific Files

```bash
# Full page tests
pnpm exec playwright test AdvertisePage.visual.test.ts

# Interaction states
pnpm exec playwright test InteractionStates.visual.test.ts
```

## Update Baselines

```bash
# Update all
pnpm test:visual:update

# Update specific viewport
pnpm exec playwright test --project="Desktop Chrome" --update-snapshots

# Update specific test
pnpm exec playwright test AdvertisePage.visual.test.ts --update-snapshots
```

## Test Coverage

### Viewports
- ✅ Desktop (1440px) - Chrome, Firefox, Safari
- ✅ Tablet (768px) - iPad, Landscape
- ✅ Mobile (375px) - iPhone, Pixel

### Sections
- ✅ Hero Section
- ✅ Partner Selection
- ✅ Value Proposition
- ✅ How It Works
- ✅ Features Grid
- ✅ Social Proof
- ✅ Pricing Preview
- ✅ Final CTA
- ✅ FAQ (collapsed & expanded)

### Interaction States
- ✅ Hover (buttons, cards, tiles)
- ✅ Focus (keyboard navigation)
- ✅ Active (pressed states)
- ✅ Animations (fade-up, staggered, count-up)
- ✅ Loading (skeletons, spinners)
- ✅ Error (messages, boundaries, fallbacks)

## Configuration

Location: `playwright.config.ts`

Key settings:
- **Timeout**: 30s per test
- **Max Diff Pixels**: 100
- **Threshold**: 0.2 (20% tolerance)
- **Animations**: Disabled
- **Retries**: 2 on CI, 0 locally

## Screenshot Storage

```
client/src/components/advertise/__tests__/visual/
├── AdvertisePage.visual.test.ts-snapshots/
│   ├── Desktop-Chrome/
│   ├── Tablet-iPad/
│   └── Mobile-iPhone/
└── InteractionStates.visual.test.ts-snapshots/
    └── ...
```

## Troubleshooting

### Tests Failing with Minor Differences
```typescript
// Increase tolerance in playwright.config.ts
maxDiffPixels: 200,  // Default: 100
threshold: 0.3,      // Default: 0.2
```

### Element Not Found
```bash
# Check if page is loading correctly
pnpm exec playwright test --debug
```

### Animations Causing Flakiness
```bash
# Already disabled in config, but can increase wait times
# Edit test file and increase waitForTimeout values
```

### CI/CD Differences
```bash
# Regenerate baselines on CI environment
pnpm exec playwright test --update-snapshots
```

## Best Practices

1. **Always disable animations** in tests
2. **Wait for stability** before capturing
3. **Use data-testid** for reliable element selection
4. **Update baselines** after intentional UI changes
5. **Review diffs** carefully in pull requests
6. **Run locally** before pushing to CI

## Requirements Validated

- ✅ **10.2**: Mobile responsive layouts (< 768px)
- ✅ **10.3**: Tablet responsive layouts (768px - 1024px)
- ✅ **10.4**: Desktop responsive layouts (> 1024px)
- ✅ **11.2**: Interactive element hover effects

## Integration

Visual tests complement existing tests:
- **Unit Tests** → Component logic
- **Property Tests** → Universal properties
- **Visual Tests** → Appearance & layout

## Performance

- **Duration**: ~2-5 minutes for full suite
- **Frequency**: Run on pull requests
- **Scope**: Use `--project` flag during development

## Next Steps

1. Run initial baseline capture
2. Review all screenshots
3. Integrate into CI/CD pipeline
4. Set up automated PR checks
5. Document baseline update process

## Support

- 📖 [Full Documentation](./README.md)
- 🎭 [Playwright Docs](https://playwright.dev/)
- 🐛 [Report Issues](../../../../../../.github/ISSUE_TEMPLATE.md)
