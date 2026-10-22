import { sql } from 'drizzle-orm';
import { unitTypes } from '../../drizzle/schema';

/**
 * The canonical unit_types model has no phase assignment. Its aggregate stock
 * is therefore marketable only for an explicitly selling development with no
 * phase records. For phased developments, this fails closed until inventory
 * has an approved phase relationship.
 */
export function unphasedSellingUnitTypeScope() {
  return sql`(
    NOT EXISTS (
      SELECT 1
      FROM development_phases existing_phase
      WHERE existing_phase.development_id = ${unitTypes.developmentId}
    )
    AND EXISTS (
      SELECT 1
      FROM developments selling_development
      WHERE selling_development.id = ${unitTypes.developmentId}
        AND selling_development.status = 'selling'
    )
  )`;
}
