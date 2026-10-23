import type {
  CanonicalLocationDiscoveryResult,
  SearchDiscoveryResult,
} from '@shared/searchDiscovery';

/**
 * The context a location suggestion shows beneath its name.
 *
 * A suggestion reads as the place and the parent it sits in, so "Melville, Johannesburg".
 * The province is added only when another visible suggestion carries the same name and the
 * same parent, because then the parent does not tell the two apart. Two Melville suburbs in
 * different metros are already distinguishable; two Rooiwals in the same parent are not.
 *
 * The context never widens a scope. It is display only, and the identity that decides what a
 * selection means travels separately, as the canonical place id.
 */
export function suggestionContextLabel(
  result: CanonicalLocationDiscoveryResult,
  siblings: readonly SearchDiscoveryResult[] = [],
): string {
  const parent = result.display.contextLabel?.trim();
  const ambiguous =
    siblings.filter(
      sibling =>
        sibling.kind === 'canonical_location' &&
        sibling.label === result.label &&
        sibling.display.contextLabel === result.display.contextLabel,
    ).length > 1;

  const parts = [result.display.typeLabel, parent];
  if (ambiguous && result.provinceName) parts.push(result.provinceName);
  return parts.filter(Boolean).join(' · ');
}
