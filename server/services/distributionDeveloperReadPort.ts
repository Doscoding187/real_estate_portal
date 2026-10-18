/**
 * Distribution's consumer-side boundary for Developer-owned facts.
 *
 * Keep the provider and its contract types in the Developer Engine. This
 * module exists so Distribution consumers have one stable import path; it
 * must not reconstruct development, publication, contact, or inventory facts.
 */
export { getDevelopmentSalesProjection } from './developmentSalesProjectionService';
export type {
  DevelopmentSalesModeProjection,
  DevelopmentSalesProjection,
} from './developmentSalesProjectionService';

export {
  getDevelopmentSalesWorkspaceReference,
  listDevelopmentSalesWorkspaceReferences,
} from './developmentSalesWorkspaceService';
export type {
  DevelopmentSalesWorkspaceReference,
  ListDevelopmentSalesWorkspaceReferencesInput as DevelopmentSalesWorkspaceReferenceQuery,
} from './developmentSalesWorkspaceService';
