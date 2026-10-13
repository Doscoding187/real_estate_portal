import { Router } from 'express';

const router = Router();
const interactionTypes = new Set([
  'page_view',
  'cta_click',
  'partner_type_click',
  'faq_expand',
  'scroll_depth',
  'sticky_cta_dismiss',
  'pricing_card_click',
  'feature_tile_hover',
  'funnel_step',
]);

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    router: 'analytics',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/** MVP interaction counts do not retain client identities, URLs or arbitrary metadata.
 * Provider request/security logs have their own policy; this does not erase them. */
router.post('/track', (req, res) => {
  const type: unknown = req.body?.eventType;
  if (typeof type !== 'string' || !interactionTypes.has(type)) {
    return res.status(400).json({ success: false, error: 'Invalid analytics payload' });
  }
  console.log('[Advertise interaction]', { type });
  return res.status(200).json({ success: true });
});

export default router;
export { router };
