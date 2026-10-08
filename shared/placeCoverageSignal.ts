/** Operational research signals never confer Place or reference authority. */
export const PLACE_COVERAGE_SIGNAL_VERSION = 'search-coverage-v1';
export const PLACE_COVERAGE_SUBJECT_LIMIT = 200;
export const coverageSignalNote = (kind: 'unresolved_query' | 'ambiguous_query') =>
  `search_coverage_signal:${kind};no Place may be created from this signal; it is research-priority input only`;

/** Validate the exact persisted discovery-writer contract, including repeat priority. */
export function isOperationalPlaceCoverageSignal(row: Record<string, unknown>): boolean {
  const kind = row.evidence_kind;
  return (
    (kind === 'unresolved_query' || kind === 'ambiguous_query') &&
    row.place_id === null &&
    row.evidence_state === 'recorded' &&
    typeof row.subject === 'string' &&
    row.subject.length > 0 &&
    row.subject.length <= PLACE_COVERAGE_SUBJECT_LIMIT &&
    row.provider === 'property_listify_search' &&
    row.provider_record_id === null &&
    (row.research_priority === 0 || row.research_priority === 1) &&
    row.note === coverageSignalNote(kind)
  );
}
