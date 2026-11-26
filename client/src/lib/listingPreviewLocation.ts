type PreviewPrivateAddress = {
  streetNumber?: string | null;
  streetName?: string | null;
} | null;

const clean = (value?: string | null) => String(value ?? '').replace(/\s+/g, ' ').trim();

/**
 * The location line the public will see for the chosen privacy option. Mirrors the public
 * projection: street location hides the house number; full address shows number and street.
 * Unit numbers are never shown.
 */
export function previewPublicLocation(input: {
  privateAddress?: PreviewPrivateAddress;
  fallbackAddress?: string | null;
  publicLocationPrecision?: 'exact' | 'approximate' | null;
  areaLabel?: string | null;
}): string {
  const streetName = clean(input.privateAddress?.streetName);
  const streetNumber = clean(input.privateAddress?.streetNumber);
  const area = clean(input.areaLabel);
  const exact = input.publicLocationPrecision === 'exact';
  const street = exact ? [streetNumber, streetName].filter(Boolean).join(' ') : streetName;
  // Without structured street parts the free-text address cannot be safely redacted, so only
  // the full-address option may show it.
  const streetPart = street || (exact ? clean(input.fallbackAddress) : '');
  return [streetPart, area].filter(Boolean).join(', ');
}

/**
 * The detail-page address line. The server projection's publicAddress already follows the
 * chosen privacy option (street name and area, or full address), so the page shows it as is.
 */
export function publicDetailAddress(publicAddress: unknown): string {
  return typeof publicAddress === 'string' ? publicAddress.trim() : '';
}
