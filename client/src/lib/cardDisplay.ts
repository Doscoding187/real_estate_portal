export const cleanLocationPart = (value?: string | null) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const STREET_WORD_PATTERN =
  /\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|crescent|cres|close|cl|boulevard|blvd|way|place|pl|court|ct|terrace|terr|circle|cir|highway|hwy)\b/i;

const splitLocationParts = (value?: string | null) =>
  cleanLocationPart(value)
    .split(',')
    .map(part => cleanLocationPart(part))
    .filter(Boolean);

const normalizeForCompare = (value?: string | null) =>
  cleanLocationPart(value).toLowerCase();

const looksLikeStreetAddress = (value?: string | null) => {
  const text = cleanLocationPart(value);
  return /\d/.test(text) && STREET_WORD_PATTERN.test(text);
};

const uniqueNonStreetParts = (...values: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  const parts: string[] = [];

  for (const value of values) {
    for (const part of splitLocationParts(value)) {
      const key = normalizeForCompare(part);
      if (!key || seen.has(key) || looksLikeStreetAddress(part)) continue;

      seen.add(key);
      parts.push(part);
    }
  }

  return parts;
};

const firstStreetAddressPart = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    const street = splitLocationParts(value).find(looksLikeStreetAddress);
    if (street) return street;
  }

  return undefined;
};

export const getShortCardLocation = ({
  address,
  suburb,
  city,
}: {
  address?: string | null;
  suburb?: string | null;
  city?: string | null;
}) => {
  const street = firstStreetAddressPart(address, suburb);
  const areaParts = uniqueNonStreetParts(suburb, city);

  const primaryArea = areaParts[0];
  const secondaryArea = areaParts.find(
    part => normalizeForCompare(part) !== normalizeForCompare(primaryArea),
  );

  if (street && primaryArea) return `${street}, ${primaryArea}`;
  if (primaryArea && secondaryArea) return `${primaryArea}, ${secondaryArea}`;
  if (primaryArea) return primaryArea;

  return cleanLocationPart(city) || 'Location available';
};

export const formatCompactRand = (value?: number | null) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price on request';

  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = (millions >= 10 ? millions.toFixed(1) : millions.toFixed(2))
      .replace(/\.00$/, '')
      .replace(/(\.\d)0$/, '$1');
    return `R ${formatted}m`;
  }

  if (amount >= 100_000) {
    return `R ${Math.round(amount / 1_000)}k`;
  }

  return `R ${amount.toLocaleString('en-ZA')}`;
};
