import { TRPCError } from '@trpc/server';

/**
 * Authority-defining publisher fields are creation-time business truth. They
 * are deliberately absent from every supported content-update command.
 */
export const IMMUTABLE_CATALOGUE_PUBLISHER_AUTHORITY_FIELDS = Object.freeze([
  'authorityKind',
  'developerOrganisationId',
  'authority_kind',
  'developer_organisation_id',
] as const);

export function assertCataloguePublisherContentMutation(input: unknown): void {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Publisher update data is invalid.' });
  }
  const record = input as Record<string, unknown>;
  const forbidden = IMMUTABLE_CATALOGUE_PUBLISHER_AUTHORITY_FIELDS.find(field =>
    Object.prototype.hasOwnProperty.call(record, field),
  );
  if (forbidden) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Catalogue Publisher authority and organisation custody are immutable.',
    });
  }
}
