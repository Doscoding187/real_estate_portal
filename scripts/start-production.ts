#!/usr/bin/env tsx

console.error(
  'scripts/start-production.ts is retired. Run pnpm release:predeploy:production before deployment, then start the application with pnpm start:prod.',
);
process.exit(1);
