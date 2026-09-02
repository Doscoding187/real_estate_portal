import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';

type AgentJourneyStatusErrorStateProps = {
  title?: string;
  onRetry: () => void;
};

/**
 * A status request failure must not impersonate an account or commercial
 * state. Reuse this recovery state across Agent surfaces so every route tells
 * the agent what happened and gives them a safe next action.
 */
export function AgentJourneyStatusErrorState({
  title = 'We could not confirm your Agent workspace',
  onRetry,
}: AgentJourneyStatusErrorStateProps) {
  return (
    <AgentFeatureLockedState
      title={title}
      description="Your listings, leads and profile have not been changed. Check your connection and try again; if this keeps happening, contact Property Listify support."
      actionLabel="Try again"
      onAction={onRetry}
    />
  );
}
