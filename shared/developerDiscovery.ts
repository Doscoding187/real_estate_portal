import { PROVINCIAL_CONFIGS } from './provincialDiscovery';

export const DEVELOPER_DISCOVERY_PROVINCES = Object.values(PROVINCIAL_CONFIGS).map(
  config => config.name,
);

export function resolveDeveloperProvince(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return Object.values(PROVINCIAL_CONFIGS).find(
    config => config.name.toLowerCase() === normalized || config.slug === normalized,
  )?.name;
}

export function readDeveloperProvince(search: string) {
  const raw = new URLSearchParams(search).get('province');
  const province = resolveDeveloperProvince(raw);
  return { province, invalid: Boolean(raw && !province) };
}

export function developerDiscoveryHref(path: string, province?: string, projects = false) {
  const query = province ? `?${new URLSearchParams({ province }).toString()}` : '';
  return `${path}${query}${projects ? '#developments' : ''}`;
}
