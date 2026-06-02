import {
  DEVELOPMENT_WORKFLOW_STEPS,
  normalizeDevelopmentWorkflowState,
} from '../../shared/developmentWorkflow';
import { deriveDevelopmentWorkflowId } from './developmentCanonicalSnapshot';

export function buildDevelopmentWorkflowStateColumns(
  source: Record<string, any>,
): Record<string, any> {
  const hasWorkflowInput =
    Object.prototype.hasOwnProperty.call(source, 'workflowId') ||
    Object.prototype.hasOwnProperty.call(source, 'currentStepId') ||
    Object.prototype.hasOwnProperty.call(source, 'completedSteps');

  if (!hasWorkflowInput) return {};

  const workflowState = normalizeDevelopmentWorkflowState(source);
  const columns: Record<string, any> = {
    workflowId: workflowState.workflowId,
    currentStepId: workflowState.currentStepId,
  };

  if (Object.prototype.hasOwnProperty.call(source, 'completedSteps')) {
    columns.completedSteps = workflowState.completedSteps;
  }

  return columns;
}

export function buildPublishedDevelopmentWorkflowStateColumns(
  source: Record<string, any>,
): Record<string, any> {
  return buildDevelopmentWorkflowStateColumns({
    workflowId:
      typeof source.workflowId === 'string' && source.workflowId.trim()
        ? source.workflowId
        : deriveDevelopmentWorkflowId(source),
    currentStepId: 'review_publish',
    completedSteps: DEVELOPMENT_WORKFLOW_STEPS,
  });
}
