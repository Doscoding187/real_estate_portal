import { sql, type SQL } from 'drizzle-orm';

import { landListingLinks, listings, properties } from '../../drizzle/schema';

/**
 * Identifies an intentional first-cohort Land policy rejection. Callers must
 * not treat operational lookup failures as this policy outcome.
 */
export class LandLaunchContainmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LandLaunchContainmentError';
  }
}

/**
 * Generic property projections are not a second Land authority.  Land uses
 * the dedicated parcel, authority, evidence and review lifecycle, so generic
 * public reads must exclude both its canonical plot rows and any projection
 * linked to an active Land listing.  The latter also contains malformed or
 * historical rows whose property type was not preserved correctly.
 */
export function excludeLandFromGenericPublicProjection(): SQL {
  return sql`(
    ${properties.propertyType} <> 'plot'
    AND NOT EXISTS (
      SELECT 1
      FROM ${landListingLinks}
      WHERE ${landListingLinks.listingId} = ${properties.sourceListingId}
        AND ${landListingLinks.linkStatus} = 'active'
    )
  )`;
}

/**
 * Generic listing workspaces must not become an alternate Land authoring or
 * review surface. The active link is the canonical specialist-workflow
 * identity; the plot check also contains old rows whose link was not retained.
 */
export function excludeLandFromGenericListingWorkflow(): SQL {
  return sql`(
    ${listings.propertyType} NOT IN ('plot', 'land')
    AND NOT EXISTS (
      SELECT 1
      FROM ${landListingLinks}
      WHERE ${landListingLinks.listingId} = ${listings.id}
        AND ${landListingLinks.linkStatus} = 'active'
    )
  )`;
}
