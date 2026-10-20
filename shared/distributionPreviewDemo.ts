/**
 * Governed preview-fixture marker for synthetic demonstration developments.
 *
 * Property Listify keeps real Development inventory fail-closed until a phase/batch
 * release and inventory state-change authority exists. This marker only authorizes
 * synthetic, clearly labelled demonstration data owned by the platform reference
 * publisher so local partner journeys can be reviewed safely.
 */
export const DISTRIBUTION_PREVIEW_DEMO_SLUG_PREFIX = 'distribution-preview-demo-';

export const DISTRIBUTION_PREVIEW_DEMO_SOURCE_ATTRIBUTION =
  'Property Listify governed preview fixture (synthetic demonstration data)';

export function isDistributionPreviewDemoSlug(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(DISTRIBUTION_PREVIEW_DEMO_SLUG_PREFIX);
}
