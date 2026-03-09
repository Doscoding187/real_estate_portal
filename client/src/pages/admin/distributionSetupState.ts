export type PartnerDevelopmentRow = {
  developmentId?: number | string | null;
  brandProfileId?: number | string | null;
  marketingBrandProfileId?: number | string | null;
  program?: unknown;
};

export type PartnerDevelopmentSetupState =
  | 'needs_brand_link'
  | 'ready_to_add'
  | 'already_in_partner_developments';

export function isDevelopmentBrandLinked(row: PartnerDevelopmentRow) {
  return Boolean(Number(row.brandProfileId || 0) || Number(row.marketingBrandProfileId || 0));
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
  if (!isDevelopmentBrandLinked(row)) {
    return 'needs_brand_link';
  }

  if (isDevelopmentInPartnerProgram(row, programByDevelopmentId)) {
    return 'already_in_partner_developments';
  }

  return 'ready_to_add';
}

export function getPartnerDevelopmentSetupLabel(state: PartnerDevelopmentSetupState) {
  switch (state) {
    case 'needs_brand_link':
      return 'Needs Brand Link';
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
    case 'needs_brand_link':
      return 'Needs brand profile link before it can be added to Partner Developments.';
    case 'ready_to_add':
      return 'Brand link is complete. This development can now be added to Partner Developments.';
    case 'already_in_partner_developments':
      return 'Distribution program already exists for this development.';
    default:
      return '';
  }
}
