export type AgentShowingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type ShowingsSchemaDetails = {
  table: boolean;
  listingIdColumn: boolean;
  propertyIdColumn: boolean;
  leadIdColumn: boolean;
  agentIdColumn: boolean;
  scheduledTimeColumn: boolean;
  scheduledAtColumn: boolean;
  statusColumn: boolean;
  notesColumn: boolean;
};

export type ShowingsSchemaVariant = 'legacy' | 'current' | 'hybrid' | 'missing';

export function getShowingsSchemaVariant(details: ShowingsSchemaDetails): ShowingsSchemaVariant {
  if (!details.table || !details.agentIdColumn || !details.statusColumn) {
    return 'missing';
  }

  const hasCanonicalScheduledAtShape =
    details.notesColumn && details.scheduledAtColumn && (details.propertyIdColumn || details.listingIdColumn);
  const hasCurrentShape = details.listingIdColumn && details.scheduledTimeColumn;

  if (hasCanonicalScheduledAtShape && hasCurrentShape) return 'hybrid';
  if (hasCanonicalScheduledAtShape) return 'legacy';
  if (hasCurrentShape) return 'current';
  return 'missing';
}

export function isShowingsSchemaReady(details: ShowingsSchemaDetails): boolean {
  return getShowingsSchemaVariant(details) !== 'missing';
}

export function mapAgentShowingStatusToStorage(
  status: AgentShowingStatus,
  variant: ShowingsSchemaVariant,
): string {
  if (variant === 'current') {
    return status;
  }

  switch (status) {
    case 'scheduled':
      return 'confirmed';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'no_show':
      return 'no_show';
  }
}

export function mapStorageShowingStatusToAgent(
  status: string | null | undefined,
  variant: ShowingsSchemaVariant,
): AgentShowingStatus {
  if (variant === 'current') {
    switch (status) {
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      case 'no_show':
        return 'no_show';
      case 'scheduled':
      default:
        return 'scheduled';
    }
  }

  switch (status) {
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'no_show':
      return 'no_show';
    case 'requested':
    case 'confirmed':
    default:
      return 'scheduled';
  }
}
