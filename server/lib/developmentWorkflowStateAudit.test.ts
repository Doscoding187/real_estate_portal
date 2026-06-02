import { describe, expect, it } from 'vitest';
import { getDevelopmentWorkflowStateReadiness } from './developmentWorkflowStateAudit';

function createFakeDb(results: unknown[]) {
  const calls: unknown[] = [];
  return {
    calls,
    db: {
      async execute(query: unknown) {
        calls.push(query);
        return results.shift() ?? [[]];
      },
    },
  };
}

describe('development workflow state readiness audit', () => {
  it('reports missing schema columns before row coverage is queried', async () => {
    const { db, calls } = createFakeDb([[{ column_name: 'workflow_id' }]]);

    const readiness = await getDevelopmentWorkflowStateReadiness({
      db,
      now: new Date('2026-05-27T00:00:00.000Z'),
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.schemaReady).toBe(false);
    expect(readiness.missingColumns).toEqual(['current_step_id', 'completed_steps']);
    expect(readiness.counts.totalDevelopments).toBe(0);
    expect(readiness.progressionWarnings).toEqual({
      nonCanonicalCompletedStepOrder: 0,
      currentStepBehindCompletedSteps: 0,
    });
    expect(readiness.migrationHints[0]).toContain('0063_add_development_workflow_state.sql');
    expect(calls).toHaveLength(1);
  });

  it('reports canonical workflow backfill coverage and invalid row shape', async () => {
    const { db, calls } = createFakeDb([
      [
        { column_name: 'workflow_id' },
        { column_name: 'current_step_id' },
        { column_name: 'completed_steps' },
      ],
      [
        {
          total_developments: 12,
          missing_workflow_id: 1,
          missing_current_step_id: 2,
          missing_completed_steps: 3,
          missing_any_workflow_state: 4,
          invalid_current_step_id: 5,
          invalid_completed_steps_shape: 6,
        },
      ],
      [],
    ]);

    const readiness = await getDevelopmentWorkflowStateReadiness({
      db,
      now: new Date('2026-05-27T00:00:00.000Z'),
    });

    expect(readiness).toMatchObject({
      checkedAt: '2026-05-27T00:00:00.000Z',
      ready: false,
      schemaReady: true,
      missingColumns: [],
      counts: {
        totalDevelopments: 12,
        missingWorkflowId: 1,
        missingCurrentStepId: 2,
        missingCompletedSteps: 3,
        missingAnyWorkflowState: 4,
        invalidCurrentStepId: 5,
        invalidCompletedStepsShape: 6,
        invalidCompletedStepValue: 0,
        duplicateCompletedSteps: 0,
        workflowTransactionMismatch: 0,
        publishedWorkflowStateDrift: 0,
      },
    });
    expect(readiness.progressionWarnings).toEqual({
      nonCanonicalCompletedStepOrder: 0,
      currentStepBehindCompletedSteps: 0,
    });
    expect(readiness.migrationHints[0]).toContain('0064_backfill_development_workflow_state.sql');
    expect(calls).toHaveLength(3);
  });

  it('reports semantic workflow drift after schema and shape are valid', async () => {
    const { db } = createFakeDb([
      [
        { column_name: 'workflow_id' },
        { column_name: 'current_step_id' },
        { column_name: 'completed_steps' },
      ],
      [
        {
          total_developments: 3,
          missing_workflow_id: 0,
          missing_current_step_id: 0,
          missing_completed_steps: 0,
          missing_any_workflow_state: 0,
          invalid_current_step_id: 0,
          invalid_completed_steps_shape: 0,
        },
      ],
      [
        {
          workflow_id: 'residential_rent',
          transaction_type: 'for_sale',
          current_step_id: 'unit_types',
          isPublished: 0,
          completed_steps: ['configuration', 'bogus_step'],
        },
        {
          workflow_id: 'residential_sale',
          transaction_type: 'for_sale',
          current_step_id: 'unit_types',
          isPublished: 0,
          completed_steps: ['configuration', 'configuration'],
        },
      ],
    ]);

    const readiness = await getDevelopmentWorkflowStateReadiness({
      db,
      now: new Date('2026-05-27T00:00:00.000Z'),
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.counts).toMatchObject({
      invalidCompletedStepValue: 1,
      duplicateCompletedSteps: 1,
      workflowTransactionMismatch: 1,
      publishedWorkflowStateDrift: 0,
    });
  });

  it('fails readiness when a published row is not at canonical final workflow state', async () => {
    const { db } = createFakeDb([
      [
        { column_name: 'workflow_id' },
        { column_name: 'current_step_id' },
        { column_name: 'completed_steps' },
      ],
      [
        {
          total_developments: 1,
          missing_workflow_id: 0,
          missing_current_step_id: 0,
          missing_completed_steps: 0,
          missing_any_workflow_state: 0,
          invalid_current_step_id: 0,
          invalid_completed_steps_shape: 0,
        },
      ],
      [
        {
          workflow_id: 'residential_auction',
          transaction_type: 'auction',
          current_step_id: 'review_publish',
          isPublished: 1,
          completed_steps: ['configuration', 'identity_market', 'location', 'unit_types'],
        },
      ],
    ]);

    const readiness = await getDevelopmentWorkflowStateReadiness({
      db,
      now: new Date('2026-05-27T00:00:00.000Z'),
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.counts.publishedWorkflowStateDrift).toBe(1);
    expect(readiness.migrationHints[0]).toContain('0064_backfill_development_workflow_state.sql');
  });

  it('surfaces progression warnings without failing canonical readiness', async () => {
    const { db } = createFakeDb([
      [
        { column_name: 'workflow_id' },
        { column_name: 'current_step_id' },
        { column_name: 'completed_steps' },
      ],
      [
        {
          total_developments: 2,
          missing_workflow_id: 0,
          missing_current_step_id: 0,
          missing_completed_steps: 0,
          missing_any_workflow_state: 0,
          invalid_current_step_id: 0,
          invalid_completed_steps_shape: 0,
        },
      ],
      [
        {
          workflow_id: 'residential_sale',
          transaction_type: 'for_sale',
          current_step_id: 'location',
          isPublished: 0,
          completed_steps: ['identity_market', 'configuration'],
        },
        {
          workflow_id: 'residential_sale',
          transaction_type: 'for_sale',
          current_step_id: 'location',
          isPublished: 0,
          completed_steps: ['configuration', 'unit_types'],
        },
      ],
    ]);

    const readiness = await getDevelopmentWorkflowStateReadiness({
      db,
      now: new Date('2026-05-27T00:00:00.000Z'),
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.progressionWarnings).toEqual({
      nonCanonicalCompletedStepOrder: 1,
      currentStepBehindCompletedSteps: 1,
    });
    expect(readiness.migrationHints).toEqual([]);
  });

  it('marks readiness green only when every development has valid canonical workflow state', async () => {
    const { db } = createFakeDb([
      [
        { column_name: 'workflow_id' },
        { column_name: 'current_step_id' },
        { column_name: 'completed_steps' },
      ],
      [
        {
          total_developments: 7,
          missing_workflow_id: 0,
          missing_current_step_id: 0,
          missing_completed_steps: 0,
          missing_any_workflow_state: 0,
          invalid_current_step_id: 0,
          invalid_completed_steps_shape: 0,
        },
      ],
      [
        {
          workflow_id: 'residential_sale',
          transaction_type: 'for_sale',
          current_step_id: 'location',
          isPublished: 0,
          completed_steps: ['configuration', 'identity_market'],
        },
        {
          workflow_id: 'residential_rent',
          transaction_type: 'for_rent',
          current_step_id: 'identity_market',
          isPublished: 0,
          completed_steps: ['configuration'],
        },
        {
          workflow_id: 'residential_auction',
          transaction_type: 'auction',
          current_step_id: 'review_publish',
          isPublished: 0,
          completed_steps: ['configuration', 'unit_types'],
        },
      ],
    ]);

    const readiness = await getDevelopmentWorkflowStateReadiness({
      db,
      now: new Date('2026-05-27T00:00:00.000Z'),
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.progressionWarnings).toEqual({
      nonCanonicalCompletedStepOrder: 0,
      currentStepBehindCompletedSteps: 0,
    });
    expect(readiness.migrationHints).toEqual([]);
  });
});
