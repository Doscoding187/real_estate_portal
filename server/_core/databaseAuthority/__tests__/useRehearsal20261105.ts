import { join } from 'node:path';

// Binds the authority module to the 2026-11-05 window-scoped rehearsal
// registration before any test imports it. The default without this import is
// the committed, revoked, pending 0197-to-0200 registration.
// That window's source digest binds the guarded files as they were at the 0197
// release, so the source root is the frozen byte-exact evidence copy.
process.env.PROPERTYLISTIFY_REHEARSAL_REGISTRATION = join(
  process.cwd(),
  'docs/database-authority/disposable-rehearsal-authorization-20261105.json',
);
process.env.PROPERTYLISTIFY_REHEARSAL_SOURCE_ROOT = join(
  process.cwd(),
  'docs/database-authority/evidence/rehearsal-source-20261105',
);
