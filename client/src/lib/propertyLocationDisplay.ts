const cleanLocationPart = (value?: string | null) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const splitLocationParts = (value?: string | null) =>
  cleanLocationPart(value)
    .split(',')
    .map(part => cleanLocationPart(part))
    .filter(Boolean);

const normalizeForCompare = (value?: string | null) =>
  cleanLocationPart(value).toLowerCase();

export const formatFullPropertyLocation = ({
  address,
  suburb,
  city,
  province,
}: {
  address?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
}) => {
  const seen = new Set<string>();
  const parts: string[] = [];

  for (const value of [address, suburb, city, province]) {
    for (const part of splitLocationParts(value)) {
      const key = normalizeForCompare(part);
      if (!key || seen.has(key)) continue;

      seen.add(key);
      parts.push(part);
    }
  }

  return parts.join(', ') || 'Location available';
};
