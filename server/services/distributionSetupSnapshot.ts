import type { DistributionSetupSnapshot } from '../../shared/distributionSetup';
import type { DevelopmentDistributionAccessEvaluation } from './distributionAccessPolicy';

const PROGRESS_WEIGHTS: Record<string, number> = {
  added: 15,
  commission: 20,
  tier_policy: 15,
  primary_manager: 15,
  sales_pack: 20,
  submission_checklist: 15,
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasAnyCommissionMissing(missing: string[]) {
  return missing.some(value =>
    [
      'commissionModel',
      'defaultCommissionPercent',
      'defaultCommissionAmount',
      'defaultCommissionPercent_or_defaultCommissionAmount',
    ].includes(value),
  );
}

export function computeDistributionSetupSnapshot(input: {
  evaluation: DevelopmentDistributionAccessEvaluation;
  salesPackDocumentCount: number;
  submissionChecklistRequiredCount: number;
}): DistributionSetupSnapshot {
  const evaluation = input.evaluation;
  const readinessMissing = Array.isArray(evaluation.readiness?.reasons)
    ? evaluation.readiness.reasons.map(value => String(value || '')).filter(Boolean)
    : [];

  const added =
    Boolean(evaluation.brandProfileId) &&
    Boolean(evaluation.brandPartnershipId) &&
    Boolean(evaluation.developmentAccessId) &&
    Boolean(evaluation.programExists);

  const commission = added && !hasAnyCommissionMissing(readinessMissing);
  const tierPolicy = added && !readinessMissing.includes('tierAccessPolicy');
  const primaryManager = added && !readinessMissing.includes('primaryManagerAssignment');

  const salesPack = added && Number(input.salesPackDocumentCount || 0) > 0;
  const submissionChecklist = added && Number(input.submissionChecklistRequiredCount || 0) > 0;

  const items = [
    { key: 'added', label: 'Added to network', done: added, actor: 'admin' as const },
    { key: 'commission', label: 'Commission configured', done: commission, actor: 'admin' as const },
    { key: 'tier_policy', label: 'Access policy configured', done: tierPolicy, actor: 'admin' as const },
    { key: 'primary_manager', label: 'Primary manager assigned', done: primaryManager, actor: 'admin' as const },
    { key: 'sales_pack', label: 'Sales pack uploaded', done: salesPack, actor: 'either' as const },
    { key: 'submission_checklist', label: 'Submission checklist set', done: submissionChecklist, actor: 'either' as const },
  ] as const;

  const progressRaw = items.reduce((sum, item) => {
    const weight = PROGRESS_WEIGHTS[item.key] ?? 0;
    return sum + (item.done ? weight : 0);
  }, 0);
  const progressPercent = clampPercent(progressRaw);

  const missing = items.filter(item => !item.done).map(item => item.key);

  const readyToGoLive =
    added &&
    commission &&
    tierPolicy &&
    primaryManager &&
    salesPack &&
    submissionChecklist &&
    !evaluation.submitReady;

  const setupState = evaluation.submitReady
    ? ('submit_ready_live' as const)
    : !added
      ? ('not_in_program' as const)
      : !commission && !primaryManager && !salesPack && !submissionChecklist
        ? ('added_draft_setup' as const)
        : ('config_required' as const);

  const setupLabel = evaluation.submitReady
    ? 'Live'
    : !added
      ? 'Not in Program'
      : readyToGoLive
        ? 'Ready to Go Live'
        : setupState === 'added_draft_setup'
          ? 'Setup Required'
          : 'Config Required';

  return {
    setupState,
    setupLabel,
    readyToGoLive,
    progressPercent,
    items: items as any,
    missing,
    salesPackDocumentCount: Number(input.salesPackDocumentCount || 0),
    submissionChecklistRequiredCount: Number(input.submissionChecklistRequiredCount || 0),
  };
}
