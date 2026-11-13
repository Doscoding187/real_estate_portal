/**
 * Homepage province pills. The label is what visitors see; the place id addresses the province
 * in the public search, which returns every published listing inside that province
 * (searchPublicInventory -> publicSearchService.ts:354 sets provincePlaceId for a
 * province-scope place; propertySearchService.ts:410-432 keeps only rows whose place is a
 * member of that province; canonicalPlaceSearchMembers in canonicalPlaceSearchService.ts:244
 * returns every place whose provincePlaceId is the selected province).
 *
 * Ids come from entries with place_type "province", search_eligible, publication_eligible and
 * lifecycle_status "active" in data/place-url-projection-national-v0.1.json (origin/main,
 * checked 2026-11-12). The projection names two of them differently: "North-West" is shown as
 * "North West" and "Noord-Kaap" (URL segment /noord-kaap) is shown as "Northern Cape".
 */
export const HOME_PROVINCES = [
  { name: 'Gauteng', placeId: 'pl-place-01-131e3e75ad70424e0f9c869a' },
  { name: 'Western Cape', placeId: 'pl-place-01-203f5f71cb3565521db4718f' },
  { name: 'KwaZulu-Natal', placeId: 'pl-place-01-153d9daaed02608619c762aa' },
  { name: 'Eastern Cape', placeId: 'pl-place-01-9892b872a77f27e90c5cf091' },
  { name: 'Mpumalanga', placeId: 'pl-place-01-c987af17ca8c4427cb59abf5' },
  { name: 'Limpopo', placeId: 'pl-place-01-191d11b42d5b13319fa7fca2' },
  { name: 'North West', placeId: 'pl-place-01-ee7ac2ac3ad791ae7a83a4e9' },
  { name: 'Free State', placeId: 'pl-place-01-a5e69690b90509167e54a142' },
  { name: 'Northern Cape', placeId: 'pl-place-01-e7be97ff5aaae9fa7ff7d28f' },
] as const;

export const HOME_PROVINCE_OPTIONS: string[] = HOME_PROVINCES.map(province => province.name);

export function homeProvincePlaceId(name: string): string | undefined {
  return HOME_PROVINCES.find(province => province.name === name)?.placeId;
}
