import type { InferSelectModel } from 'drizzle-orm';
import type {
  cataloguePublishers,
  developmentApprovalQueue,
  developerOrganisations,
  developments,
  unitTypes,
} from '../../drizzle/schema';

export type CanonicalDevelopmentRow = InferSelectModel<typeof developments>;
export type CanonicalOrganisationRow = InferSelectModel<typeof developerOrganisations>;
export type CanonicalPublisherRow = InferSelectModel<typeof cataloguePublishers>;
export type CanonicalUnitTypeRow = InferSelectModel<typeof unitTypes>;
export type CanonicalApprovalHistoryRow = InferSelectModel<typeof developmentApprovalQueue>;

/**
 * The minimum authoritative catalogue shape used by public Developer Engine
 * policy.  `unitTypes` is deliberately part of the contract: a development
 * row without its canonical inventory is not a complete public catalogue.
 */
export type CanonicalDevelopmentCatalogue = {
  development: Pick<
    CanonicalDevelopmentRow,
    | 'id'
    | 'cataloguePublisherId'
    | 'developmentType'
    | 'transactionType'
    | 'isPublished'
    | 'approvalStatus'
  >;
  publisher: Pick<
    CanonicalPublisherRow,
    | 'id'
    | 'authorityKind'
    | 'developerOrganisationId'
    | 'isVisible'
    | 'sourceAttribution'
  > | null;
  organisation: Pick<CanonicalOrganisationRow, 'id' | 'status'> | null;
  unitTypes: Pick<CanonicalUnitTypeRow, 'id' | 'developmentId' | 'isActive'>[];
  /** First-party publication is also gated by organisation-owned Launch Access. */
  commercialAccess?: boolean;
  /** Optional SQL aggregate used when a consumer does not need full unit rows. */
  activeUnitTypeCount?: number;
  /** S2 defense-in-depth flag for an active curated-source supersession. */
  activeSupersessionSource?: boolean;
};

/**
 * Current public state is stored on developments; the decision that produced
 * it is stored in developmentApprovalQueue.  Keeping both in the contract
 * prevents public consumers from inventing their own approval history.
 */
export type CanonicalDevelopmentPublicationContract = {
  catalogue: CanonicalDevelopmentCatalogue;
  currentState: Pick<CanonicalDevelopmentRow, 'isPublished' | 'approvalStatus' | 'publishedAt'>;
  approvalHistory: Pick<
    CanonicalApprovalHistoryRow,
    | 'id'
    | 'developmentId'
    | 'submittedBy'
    | 'status'
    | 'submissionType'
    | 'submittedAt'
    | 'reviewedBy'
    | 'reviewedAt'
  >[];
};

export const SUPPORTED_PUBLIC_TRANSACTION_TYPES = ['for_sale', 'for_rent'] as const;
export type SupportedPublicTransactionType = (typeof SUPPORTED_PUBLIC_TRANSACTION_TYPES)[number];
