/**
 * House type order and short labels, shared by the public development page, the
 * wizard (when an existing development is loaded) and the review.
 */

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const positive = (value: unknown): number | null => {
  const n = num(value);
  return n !== null && n > 0 ? n : null;
};

const priceOf = (unit: any): number | null =>
  positive(
    unit?.publicFacts?.priceFrom ??
      unit?.basePriceFrom ??
      unit?.priceFrom ??
      unit?.monthlyRentFrom ??
      unit?.startingBid,
  );

const sizeOf = (unit: any): number | null => positive(unit?.floorSize ?? unit?.unitSize);

const bedsOf = (unit: any): number | null => num(unit?.publicFacts?.bedrooms ?? unit?.bedrooms);

const bathsOf = (unit: any): number | null => num(unit?.publicFacts?.bathrooms ?? unit?.bathrooms);

/**
 * Cheapest first, then the smaller home, then by name (never insertion or id
 * order). Types without a price go last. Returns a new array.
 */
export function sortHouseTypes<T>(units: T[] | null | undefined): T[] {
  return (units ?? [])
    .map((unit, index) => ({ unit, index }))
    .sort((a, b) => {
      const pa = priceOf(a.unit);
      const pb = priceOf(b.unit);
      if (pa !== null && pb !== null && pa !== pb) return pa - pb;
      if (pa !== null && pb === null) return -1;
      if (pa === null && pb !== null) return 1;
      const sa = sizeOf(a.unit);
      const sb = sizeOf(b.unit);
      if (sa !== null && sb !== null && sa !== sb) return sa - sb;
      if (sa !== null && sb === null) return -1;
      if (sa === null && sb !== null) return 1;
      const na = String((a.unit as any)?.name ?? '');
      const nb = String((b.unit as any)?.name ?? '');
      return na.localeCompare(nb) || a.index - b.index;
    })
    .map(entry => entry.unit);
}

const PARKING_NAMES: Record<string, string> = {
  open: 'Open bay',
  covered: 'Covered bay',
  carport: 'Carport',
  garage: 'Garage',
};

/** "Carport · 2 bays" for a known parking type with bays; null when there is none or it is unknown. */
export function publicParkingLabel(type: unknown, bays: unknown): string | null {
  const key = String(type ?? '').trim().toLowerCase();
  const name = PARKING_NAMES[key];
  const count = positive(bays);
  if (!name || count === null) return null;
  return `${name} · ${count} ${count === 1 ? 'bay' : 'bays'}`;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(n));

export const formatSquareMetres = (n: number): string => `${fmt(n)} m²`;

/**
 * A short, UNIQUE chip label per house type: the size ("130 m²") when no other type
 * shares it; otherwise the size plus the first thing that tells them apart
 * ("130 m² · 4 bed", "130 m² · 2.5 bath", then both), then the full name, and as a
 * last resort a number. Two chips never read the same.
 */
export function uniqueHouseTypeLabels(units: any[]): Map<string, string> {
  const labels = new Map<string, string>();
  const entries = (units ?? []).map(unit => ({
    id: String(unit?.id ?? ''),
    unit,
    base: sizeOf(unit) !== null ? formatSquareMetres(sizeOf(unit) as number) : String(unit?.name ?? 'House type'),
  }));
  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    groups.set(entry.base, [...(groups.get(entry.base) ?? []), entry]);
  }
  const bedLabel = (u: any) => (bedsOf(u) === null ? null : bedsOf(u) === 0 ? 'studio' : `${fmt(bedsOf(u) as number)} bed`);
  const bathLabel = (u: any) => (bathsOf(u) === null ? null : `${fmt(bathsOf(u) as number)} bath`);
  const join = (...parts: Array<string | null>) => parts.filter(Boolean).join(' · ');

  for (const [base, group] of groups) {
    if (group.length === 1) {
      labels.set(group[0].id, base);
      continue;
    }
    const attempts: Array<(u: any) => string> = [
      u => join(base, bedLabel(u)),
      u => join(base, bathLabel(u)),
      u => join(base, bedLabel(u), bathLabel(u)),
      u => String(u?.name ?? base),
    ];
    let chosen: string[] | null = null;
    for (const attempt of attempts) {
      const candidate = group.map(entry => attempt(entry.unit));
      if (new Set(candidate).size === candidate.length) {
        chosen = candidate;
        break;
      }
    }
    if (!chosen) {
      const names = group.map(entry => join(base, bedLabel(entry.unit), bathLabel(entry.unit)));
      const seen = new Map<string, number>();
      chosen = names.map(label => {
        const count = (seen.get(label) ?? 0) + 1;
        seen.set(label, count);
        return count === 1 ? label : `${label} (${count})`;
      });
    }
    group.forEach((entry, i) => labels.set(entry.id, (chosen as string[])[i]));
  }
  return labels;
}
