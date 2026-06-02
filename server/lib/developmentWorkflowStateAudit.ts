import { sql } from 'drizzle-orm';
import { getDb } from '../db-connection';
import { DEVELOPMENT_WORKFLOW_STEPS } from '../../shared/developmentWorkflow';

type QueryableDb = {
  execute: (query: unknown) => Promise<unknown>;
};

export type DevelopmentWorkflowStateReadiness = {
  checkedAt: string;
  ready: boolean;
  schemaReady: boolean;
  missingColumns: string[];
  counts: {
    totalDevelopments: number;
    missingWorkflowId: number;
    missingCurrentStepId: number;
    missingCompletedSteps: number;
    missingAnyWorkflowState: number;
    invalidCurrentStepId: number;
    invalidCompletedStepsShape: number;
    invalidCompletedStepValue: number;
    duplicateCompletedSteps: number;
    workflowTransactionMismatch: number;
    publishedWorkflowStateDrift: number;
  };
  progressionWarnings: {
    nonCanonicalCompletedStepOrder: number;
    currentStepBehindCompletedSteps: number;
  };
  migrationHints: string[];
};

const REQUIRED_WORKFLOW_COLUMNS = ['workflow_id', 'current_step_id', 'completed_steps'] as const;

function normalizeRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    const [rows] = result;
    if (Array.isArray(rows)) return rows as Array<Record<string, unknown>>;
    if (rows && typeof rows === 'object' && !('fieldCount' in rows)) {
      return result as Array<Record<string, unknown>>;
    }
    if (rows && typeof rows === 'object') return [rows as Record<string, unknown>];
  }
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Array<Record<string, unknown>>;
  }
  return [];
}

function readNumber(row: Record<string, unknown>, key: string): number {
  const parsed = Number(row[key] ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readColumnName(row: Record<string, unknown>): string | null {
  const value = row.column_name ?? row.COLUMN_NAME ?? row.ColumnName;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseJsonArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function expectedWorkflowIdForTransaction(transactionType: unknown): string {
  if (transactionType === 'for_rent') return 'residential_rent';
  if (transactionType === 'auction') return 'residential_auction';
  return 'residential_sale';
}

function countSemanticWorkflowIssues(rows: Array<Record<string, unknown>>) {
  const allowedSteps = new Set<string>(DEVELOPMENT_WORKFLOW_STEPS);
  const stepOrder = new Map<string, number>(DEVELOPMENT_WORKFLOW_STEPS.map((step, index) => [step, index]));
  let invalidCompletedStepValue = 0;
  let duplicateCompletedSteps = 0;
  let workflowTransactionMismatch = 0;
  let publishedWorkflowStateDrift = 0;
  let nonCanonicalCompletedStepOrder = 0;
  let currentStepBehindCompletedSteps = 0;

  for (const row of rows) {
    const workflowId = typeof row.workflow_id === 'string' ? row.workflow_id.trim() : '';
    if (workflowId && workflowId !== expectedWorkflowIdForTransaction(row.transaction_type)) {
      workflowTransactionMismatch += 1;
    }

    const completedSteps = parseJsonArray(row.completed_steps);
    if (!completedSteps) continue;

    const normalizedSteps = completedSteps.map(step => (typeof step === 'string' ? step.trim() : ''));
    if (normalizedSteps.some(step => !allowedSteps.has(step))) {
      invalidCompletedStepValue += 1;
    }

    if (new Set(normalizedSteps).size !== normalizedSteps.length) {
      duplicateCompletedSteps += 1;
    }

    const validCompletedStepIndexes = normalizedSteps
      .map(step => stepOrder.get(step))
      .filter((index): index is number => typeof index === 'number');
    if (
      validCompletedStepIndexes.some((index, position) => {
        const previousIndex = validCompletedStepIndexes[position - 1];
        return typeof previousIndex === 'number' && index < previousIndex;
      })
    ) {
      nonCanonicalCompletedStepOrder += 1;
    }

    const currentStepId = typeof row.current_step_id === 'string' ? row.current_step_id.trim() : '';
    const isPublished = Number(row.isPublished ?? row.is_published ?? 0) === 1;
    if (
      isPublished &&
      (currentStepId !== 'review_publish' ||
        !completedSteps ||
        completedSteps.length !== DEVELOPMENT_WORKFLOW_STEPS.length ||
        DEVELOPMENT_WORKFLOW_STEPS.some((step, index) => completedSteps[index] !== step))
    ) {
      publishedWorkflowStateDrift += 1;
    }

    const currentStepIndex = stepOrder.get(currentStepId);
    if (
      typeof currentStepIndex === 'number' &&
      validCompletedStepIndexes.some(index => index > currentStepIndex)
    ) {
      currentStepBehindCompletedSteps += 1;
    }
  }

  return {
    invalidCompletedStepValue,
    duplicateCompletedSteps,
    workflowTransactionMismatch,
    publishedWorkflowStateDrift,
    progressionWarnings: {
      nonCanonicalCompletedStepOrder,
      currentStepBehindCompletedSteps,
    },
  };
}

export async function getDevelopmentWorkflowStateReadiness(options?: {
  db?: QueryableDb;
  now?: Date;
}): Promise<DevelopmentWorkflowStateReadiness> {
  const db = options?.db ?? (await getDb());
  if (!db) {
    throw new Error('Database connection is required to audit development workflow state readiness.');
  }

  const columnRows = normalizeRows(
    await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'developments'
        AND column_name IN ('workflow_id', 'current_step_id', 'completed_steps')
    `),
  );
  const existingColumns = new Set(columnRows.map(readColumnName).filter(Boolean));
  const missingColumns = REQUIRED_WORKFLOW_COLUMNS.filter(column => !existingColumns.has(column));

  const emptyCounts = {
    totalDevelopments: 0,
    missingWorkflowId: 0,
    missingCurrentStepId: 0,
    missingCompletedSteps: 0,
    missingAnyWorkflowState: 0,
    invalidCurrentStepId: 0,
    invalidCompletedStepsShape: 0,
    invalidCompletedStepValue: 0,
    duplicateCompletedSteps: 0,
    workflowTransactionMismatch: 0,
    publishedWorkflowStateDrift: 0,
  };
  const emptyProgressionWarnings = {
    nonCanonicalCompletedStepOrder: 0,
    currentStepBehindCompletedSteps: 0,
  };

  if (missingColumns.length > 0) {
    return {
      checkedAt: (options?.now ?? new Date()).toISOString(),
      ready: false,
      schemaReady: false,
      missingColumns,
      counts: emptyCounts,
      progressionWarnings: emptyProgressionWarnings,
      migrationHints: ['Run 0063_add_development_workflow_state.sql before auditing row backfill coverage.'],
    };
  }

  const allowedStepValues = DEVELOPMENT_WORKFLOW_STEPS.map(step => sql`${step}`);
  const rows = normalizeRows(
    await db.execute(sql`
      SELECT
        COUNT(*) AS total_developments,
        SUM(CASE WHEN workflow_id IS NULL OR TRIM(workflow_id) = '' THEN 1 ELSE 0 END) AS missing_workflow_id,
        SUM(CASE WHEN current_step_id IS NULL OR TRIM(current_step_id) = '' THEN 1 ELSE 0 END) AS missing_current_step_id,
        SUM(CASE WHEN completed_steps IS NULL THEN 1 ELSE 0 END) AS missing_completed_steps,
        SUM(
          CASE
            WHEN workflow_id IS NULL
              OR TRIM(workflow_id) = ''
              OR current_step_id IS NULL
              OR TRIM(current_step_id) = ''
              OR completed_steps IS NULL
              THEN 1
            ELSE 0
          END
        ) AS missing_any_workflow_state,
        SUM(
          CASE
            WHEN current_step_id IS NOT NULL
              AND TRIM(current_step_id) <> ''
              AND current_step_id NOT IN (${sql.join(allowedStepValues, sql`, `)})
              THEN 1
            ELSE 0
          END
        ) AS invalid_current_step_id,
        SUM(
          CASE
            WHEN completed_steps IS NOT NULL
              AND JSON_TYPE(completed_steps) <> 'ARRAY'
              THEN 1
            ELSE 0
          END
        ) AS invalid_completed_steps_shape
      FROM developments
    `),
  );
  const row = rows[0] ?? {};
  const semanticRows = normalizeRows(
    await db.execute(sql`
      SELECT id, workflow_id, transaction_type, current_step_id, completed_steps, isPublished
      FROM developments
      WHERE workflow_id IS NOT NULL
        AND TRIM(workflow_id) <> ''
        AND completed_steps IS NOT NULL
        AND JSON_TYPE(completed_steps) = 'ARRAY'
    `),
  );
  const semanticCounts = countSemanticWorkflowIssues(semanticRows);
  const counts = {
    totalDevelopments: readNumber(row, 'total_developments'),
    missingWorkflowId: readNumber(row, 'missing_workflow_id'),
    missingCurrentStepId: readNumber(row, 'missing_current_step_id'),
    missingCompletedSteps: readNumber(row, 'missing_completed_steps'),
    missingAnyWorkflowState: readNumber(row, 'missing_any_workflow_state'),
    invalidCurrentStepId: readNumber(row, 'invalid_current_step_id'),
    invalidCompletedStepsShape: readNumber(row, 'invalid_completed_steps_shape'),
    invalidCompletedStepValue: semanticCounts.invalidCompletedStepValue,
    duplicateCompletedSteps: semanticCounts.duplicateCompletedSteps,
    workflowTransactionMismatch: semanticCounts.workflowTransactionMismatch,
    publishedWorkflowStateDrift: semanticCounts.publishedWorkflowStateDrift,
  };
  const progressionWarnings = semanticCounts.progressionWarnings;
  const ready =
    counts.missingAnyWorkflowState === 0 &&
    counts.invalidCurrentStepId === 0 &&
    counts.invalidCompletedStepsShape === 0 &&
    counts.invalidCompletedStepValue === 0 &&
    counts.duplicateCompletedSteps === 0 &&
    counts.workflowTransactionMismatch === 0 &&
    counts.publishedWorkflowStateDrift === 0;
  const migrationHints = ready
    ? []
    : ['Run 0064_backfill_development_workflow_state.sql, then inspect invalid workflow rows before launch.'];

  return {
    checkedAt: (options?.now ?? new Date()).toISOString(),
    ready,
    schemaReady: true,
    missingColumns: [],
    counts,
    progressionWarnings,
    migrationHints,
  };
}
