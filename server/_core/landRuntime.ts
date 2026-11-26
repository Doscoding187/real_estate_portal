import { isLandVerticalAvailable, setLandRuntimeOverride } from '../../shared/landLaunchPolicy';
import { isLocalParityLandActive } from './localParityPreview';

// Importing this module registers the local-preview Land opt-in with the shared
// policy. Hosted, production and test runtimes never satisfy the gate.
setLandRuntimeOverride(() => isLocalParityLandActive());

/** The single server-side Land gate (committed policy OR local preview opt-in). */
export function isLandVerticalEnabled(): boolean {
  return isLandVerticalAvailable();
}
