export type DevelopmentPortfolioState = 'current' | 'archived' | 'unreleased';

export type DevelopmentPhaseLifecycle =
  | 'planning'
  | 'pre_launch'
  | 'selling'
  | 'sold_out'
  | 'completed';

/** Resolve partner portfolio visibility from the parent and phase lifecycle. */
export function resolveDevelopmentPortfolioState(
  developmentStatus: 'launching-soon' | 'selling' | 'sold-out',
  phaseStatuses: readonly DevelopmentPhaseLifecycle[],
): DevelopmentPortfolioState {
  if (developmentStatus === 'sold-out') return 'archived';
  if (phaseStatuses.length > 0) {
    if (phaseStatuses.every(status => status === 'sold_out' || status === 'completed')) {
      return 'archived';
    }
    if (developmentStatus === 'selling' && phaseStatuses.some(status => status === 'selling')) {
      return 'current';
    }
    return 'unreleased';
  }

  return developmentStatus === 'selling' ? 'current' : 'unreleased';
}
