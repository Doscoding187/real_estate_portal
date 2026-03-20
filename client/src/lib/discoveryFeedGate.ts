export function isDiscoveryFeedEnabled(search: string): boolean {
  const params = new URLSearchParams(search);

  if (params.get('legacyExplore') === '1' || params.get('legacyExplore') === 'true') {
    return false;
  }

  if (params.get('discovery') === '1' || params.get('discovery') === 'true') {
    return true;
  }

  return String(import.meta.env.VITE_ENABLE_DISCOVERY_FEED || '').toLowerCase() === 'true';
}
