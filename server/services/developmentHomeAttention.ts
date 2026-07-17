import type { DevelopmentHomeInventory } from './developmentInventorySummary';

export type DevelopmentHomeAttentionItem = {
  type:
    | 'review_rejected'
    | 'review_changes_requested'
    | 'lead_sla_breach'
    | 'readiness_blockers'
    | 'catalogue_invalid'
    | 'zero_aggregate_availability'
    | 'lead_sla_warning';
  severity: 'critical' | 'warning';
  explanation: string;
  actionLabel: string;
  href: string;
};

export type DevelopmentHomeAttention = {
  totalCount: number;
  items: DevelopmentHomeAttentionItem[];
};

type ReadinessBlocker = {
  field: string;
  message: string;
};

type CatalogueWarningClass =
  | 'no_active_unit_types'
  | 'invalid_aggregate_inventory'
  | 'missing_or_invalid_pricing'
  | 'sale_price_integrity_conflict'
  | 'rental_price_integrity_conflict';

const catalogueWarningClasses = new Set<CatalogueWarningClass>([
  'no_active_unit_types',
  'invalid_aggregate_inventory',
  'missing_or_invalid_pricing',
  'sale_price_integrity_conflict',
  'rental_price_integrity_conflict',
]);

const attentionPriority: Record<DevelopmentHomeAttentionItem['type'], number> = {
  review_rejected: 1,
  review_changes_requested: 2,
  lead_sla_breach: 3,
  readiness_blockers: 4,
  catalogue_invalid: 5,
  zero_aggregate_availability: 6,
  lead_sla_warning: 7,
};

/**
 * Maps persisted DOE-S0 field authority to the matching aggregate-catalogue
 * warning class. This is deliberately field/code based rather than message
 * based so one persisted catalogue problem cannot surface twice.
 */
export function catalogueWarningClassForReadinessBlocker(
  field: string,
): CatalogueWarningClass | null {
  if (field === 'unitTypes') return 'no_active_unit_types';
  if (!field.startsWith('unitTypes.')) return null;
  if (field.endsWith('.inventory')) return 'invalid_aggregate_inventory';
  if (field.endsWith('.salePriceConflict')) return 'sale_price_integrity_conflict';
  if (field.endsWith('.monthlyRentTo')) return 'rental_price_integrity_conflict';
  if (
    field.endsWith('.priceFrom') ||
    field.endsWith('.monthlyRentFrom') ||
    field.endsWith('.auction')
  ) {
    return 'missing_or_invalid_pricing';
  }
  return null;
}

function editorHref(developmentId: number) {
  return `/developer/create-development?id=${developmentId}`;
}

function crmAttentionHref(
  developmentId: number,
  range: '7d' | '30d' | '90d',
  sla: 'warning' | 'breach',
) {
  return `/developer/leads?${new URLSearchParams({
    developmentId: String(developmentId),
    range,
    view: 'attention',
    sla,
  }).toString()}`;
}

/**
 * Read-only, category-level attention projection from Home data that has
 * already passed Development Home ownership checks. It never reads leads,
 * reviews, inventory, or distribution data itself.
 */
export function buildDevelopmentHomeAttention(input: {
  developmentId: number;
  range: '7d' | '30d' | '90d';
  lifecycleState: string;
  latestReviewFeedback: string | null;
  blockers: readonly ReadinessBlocker[];
  inventory: Pick<DevelopmentHomeInventory, 'availableUnits' | 'totalUnits' | 'warnings'>;
  funnel: { slaWarningCount: number; slaBreachCount: number };
}): DevelopmentHomeAttention {
  const items: DevelopmentHomeAttentionItem[] = [];
  const feedback = input.latestReviewFeedback?.trim();
  const editHref = editorHref(input.developmentId);

  if (input.lifecycleState === 'rejected') {
    items.push({
      type: 'review_rejected',
      severity: 'critical',
      explanation: feedback
        ? `This development is currently rejected. ${feedback}`
        : 'This development is currently rejected. Review the submission and update it in the editor.',
      actionLabel: 'Open editor',
      href: editHref,
    });
  } else if (input.lifecycleState === 'changes_required') {
    items.push({
      type: 'review_changes_requested',
      severity: 'critical',
      explanation: feedback
        ? `Review changes were requested. ${feedback}`
        : 'Review changes were requested for this development.',
      actionLabel: 'Review requested changes',
      href: editHref,
    });
  }

  if (input.funnel.slaBreachCount > 0) {
    items.push({
      type: 'lead_sla_breach',
      severity: 'critical',
      explanation: `${input.funnel.slaBreachCount} Listify-captured lead SLA breach${input.funnel.slaBreachCount === 1 ? '' : 'es'} in the selected period.`,
      actionLabel: 'Work SLA breaches',
      href: crmAttentionHref(input.developmentId, input.range, 'breach'),
    });
  }

  const catalogueClasses = new Set<CatalogueWarningClass>();
  const nonCatalogueBlockers: ReadinessBlocker[] = [];
  for (const blocker of input.blockers) {
    const warningClass = catalogueWarningClassForReadinessBlocker(blocker.field);
    if (warningClass) catalogueClasses.add(warningClass);
    else nonCatalogueBlockers.push(blocker);
  }
  for (const warning of input.inventory.warnings) {
    if (catalogueWarningClasses.has(warning.code as CatalogueWarningClass)) {
      catalogueClasses.add(warning.code as CatalogueWarningClass);
    }
  }

  if (nonCatalogueBlockers.length > 0) {
    const count = nonCatalogueBlockers.length;
    items.push({
      type: 'readiness_blockers',
      severity: 'warning',
      explanation: `${count} persisted readiness blocker${count === 1 ? '' : 's'} remain. ${nonCatalogueBlockers[0].message}`,
      actionLabel: 'Fix readiness blockers',
      href: editHref,
    });
  }

  if (catalogueClasses.size > 0) {
    const highestPriorityWarning = input.inventory.warnings.find(warning =>
      catalogueWarningClasses.has(warning.code as CatalogueWarningClass),
    );
    const count = catalogueClasses.size;
    items.push({
      type: 'catalogue_invalid',
      severity: 'warning',
      explanation: highestPriorityWarning
        ? `${count} aggregate catalogue issue${count === 1 ? '' : 's'} require attention. ${highestPriorityWarning.message}`
        : `${count} aggregate catalogue issue${count === 1 ? '' : 's'} require attention.`,
      actionLabel: 'Edit catalogue',
      href: editHref,
    });
  }

  if (input.inventory.totalUnits !== null && input.inventory.availableUnits === 0) {
    items.push({
      type: 'zero_aggregate_availability',
      severity: 'warning',
      explanation: '0 aggregate units are marked available.',
      actionLabel: 'Review catalogue',
      href: editHref,
    });
  }

  if (input.funnel.slaWarningCount > 0) {
    items.push({
      type: 'lead_sla_warning',
      severity: 'warning',
      explanation: `${input.funnel.slaWarningCount} Listify-captured lead SLA warning${input.funnel.slaWarningCount === 1 ? '' : 's'} in the selected period.`,
      actionLabel: 'Work SLA warnings',
      href: crmAttentionHref(input.developmentId, input.range, 'warning'),
    });
  }

  const ordered = items.sort(
    (left, right) => attentionPriority[left.type] - attentionPriority[right.type],
  );
  return { totalCount: ordered.length, items: ordered.slice(0, 5) };
}
