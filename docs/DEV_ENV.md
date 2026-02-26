# Development Environment

## Runtime Baseline

- Node.js: `22.x`
- pnpm: `>=10`

`package.json` already enforces this via `engines`. Use the same Node major locally and in CI to avoid drift.

## Local Setup

```bash
nvm install 22
nvm use 22
pnpm install
pnpm check
```

## CI Expectation

All build, typecheck, and test jobs should run on Node `22.x` to match local development and prevent cross-version regressions.
