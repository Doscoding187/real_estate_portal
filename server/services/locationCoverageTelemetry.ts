import type { SearchJourneyId } from '../../shared/searchScope';

/**
 * Interim privacy-safe coverage telemetry for governed location discovery.
 *
 * Emits structured, identifier-free events so no-result and low-confidence
 * queries become observable before the dedicated coverage-events table lands
 * through a schema-authority workstream. Events never widen a search and
 * never promote geography; they only feed the research queue.
 */
export interface LocationSearchCoverageOutcome {
  normalizedQuery: string;
  journey?: SearchJourneyId;
  canonicalResultCount: number;
  searchAreaResultCount: number;
  topMatchReason?: string;
  matchedAlias?: string;
}

export interface LocationCoverageEvent {
  event: 'location_search_outcome';
  occurredAt: string;
  outcome: LocationSearchCoverageOutcome & {
    coverageSignal: 'resolved' | 'no_result';
  };
}

export type LocationCoverageEventSink = (event: LocationCoverageEvent) => void;

function defaultSink(event: LocationCoverageEvent): void {
  console.warn(`[location-coverage] ${JSON.stringify(event)}`);
}

let activeSink: LocationCoverageEventSink = defaultSink;

export function setLocationCoverageEventSinkForTests(
  sink: LocationCoverageEventSink | null,
): void {
  activeSink = sink ?? defaultSink;
}

export function emitLocationSearchOutcome(outcome: LocationSearchCoverageOutcome): void {
  const coverageSignal =
    outcome.canonicalResultCount > 0 ? 'resolved' : ('no_result' as const);
  activeSink({
    event: 'location_search_outcome',
    occurredAt: new Date().toISOString(),
    outcome: {
      ...outcome,
      coverageSignal,
    },
  });
}
