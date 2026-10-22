import { isNull, or, sql, type SQL } from 'drizzle-orm';
import { developmentPhases, unitTypes } from '../../drizzle/schema';

/**
 * A type without a phase is existing development-level inventory. Once a type
 * is assigned to a phase, it is externally marketable only while that phase is
 * in the released `selling` state. Match the development as well as phase ID
 * so a malformed cross-development reference fails closed.
 */
export function marketableDevelopmentUnitTypeCondition(): SQL {
  return or(
    isNull(unitTypes.phaseId),
    sql`EXISTS (
      SELECT 1
      FROM ${developmentPhases}
      WHERE ${developmentPhases.id} = ${unitTypes.phaseId}
        AND ${developmentPhases.developmentId} = ${unitTypes.developmentId}
        AND ${developmentPhases.status} = 'selling'
    )`,
  )!;
}
