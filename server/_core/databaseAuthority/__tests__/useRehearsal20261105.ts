import { join } from 'node:path';

// Binds the authority module to the 2026-11-05 window-scoped rehearsal
// registration before any test imports it. The default without this import
// remains the committed, revoked registration with unchanged behaviour.
process.env.PROPERTYLISTIFY_REHEARSAL_REGISTRATION = join(
  process.cwd(),
  'docs/database-authority/disposable-rehearsal-authorization-20261105.json',
);
