const PRIVATE_DEVELOPER_ROUTE_SEGMENTS = new Set([
  'dashboard',
  'developments',
  'create-development',
  'drafts',
  'leads',
  'messages',
  'tasks',
  'reports',
  'analytics',
  'explore',
  'campaigns',
  'performance',
  'settings',
  'subscription',
  'plans',
  'notifications',
  'setup',
  'success',
]);

/** True only for a one-segment public developer brand URL. */
export function isPublicDeveloperProfilePath(pathname: string) {
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  const segments = path.split('/').filter(Boolean);

  return (
    segments.length === 2 &&
    segments[0] === 'developer' &&
    !PRIVATE_DEVELOPER_ROUTE_SEGMENTS.has(segments[1])
  );
}
