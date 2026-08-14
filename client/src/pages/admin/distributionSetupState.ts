export type PartnerDevelopmentRow = {
  developmentId?: number | string | null;
  cataloguePublisherId?: number | string | null;
  program?: unknown;
};

export type PartnerDevelopmentSetupState =
  | 'needs_publisher_link'
  | 'ready_to_add'
  | 'already_in_partner_developments';

export function isDevelopmentPublisherLinked(row: PartnerDevelopmentRow) {
  return Boolean(Number(row.cataloguePublisherId || 0));
}

export function isDevelopmentInPartnerProgram(
  row: PartnerDevelopmentRow,
  programByDevelopmentId: Map<number, unknown>,
) {
  return Boolean(row.program) || programByDevelopmentId.has(Number(row.developmentId || 0));
}

export function getPartnerDevelopmentSetupState(
  row: PartnerDevelopmentRow,
  programByDevelopmentId: Map<number, unknown>,
): PartnerDevelopmentSetupState {
  if (!isDevelopmentPublisherLinked(row)) {
    return 'needs_publisher_link';
  }

  if (isDevelopmentInPartnerProgram(row, programByDevelopmentId)) {
    return 'already_in_partner_developments';
  }

  return 'ready_to_add';
}

export function getPartnerDevelopmentSetupLabel(state: PartnerDevelopmentSetupState) {
  switch (state) {
    case 'needs_publisher_link':
      return 'Needs Publisher Link';
    case 'ready_to_add':
      return 'Ready to Add';
    case 'already_in_partner_developments':
      return 'Already in Partner Developments';
    default:
      return 'Unknown';
  }
}

export function getPartnerDevelopmentSetupDescription(state: PartnerDevelopmentSetupState) {
  switch (state) {
    case 'needs_publisher_link':
      return 'Needs a Catalogue Publisher link before it can be added to Partner Developments.';
    case 'ready_to_add':
      return 'Catalogue Publisher link is complete. This development can now be added to Partner Developments.';
    case 'already_in_partner_developments':
      return 'Distribution program already exists for this development.';
    default:
      return '';
  }
}
