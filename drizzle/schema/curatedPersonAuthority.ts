/**
 * Admission registry for mutable, curated person/relationship authorities.
 *
 * Source snapshots and transactional person fields are intentionally not
 * listed: the registry governs only the business relationship record that an
 * operator maintains as a person/contact authority.
 */
export const CURATED_PERSON_AUTHORITY = Object.freeze({
  canonicalTables: ['contacts'] as const,
  approvedDecision: 'AW-MVP-001',
  admissionRule:
    'A new mutable curated person, customer, or contact authority requires an explicit architecture decision before schema admission.',
  /**
   * The static authority contract treats schema tables using these semantic
   * authority terms as admission-sensitive. A future relationship link or
   * source table using one of them must be explicitly classified during
   * schema admission rather than silently becoming another CRM surface.
   */
  monitoredTableNameTerms: ['contact', 'customer', 'person', 'people', 'crm'] as const,
  sourceOrCaptureTables: [
    'leads',
    'seller_prospects',
    'listing_leads',
    'prospect_identities',
  ] as const,
});
