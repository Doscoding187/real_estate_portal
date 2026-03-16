import { Router } from 'express';
import { partnerService } from './services/partnerService';

const router = Router();

router.get('/:partnerId', async (req, res) => {
  try {
    const partnerId = String(req.params.partnerId || '').trim();
    if (!partnerId) {
      return res.status(400).json({ error: 'Invalid partnerId' });
    }

    const profile = await partnerService.getPartnerProfile(partnerId);
    if (!profile) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    return res.json(profile);
  } catch (error: any) {
    console.error('Error fetching partner profile:', error);
    return res.status(500).json({ error: error?.message || 'Failed to fetch partner profile' });
  }
});

router.get('/:partnerId/reviews', async (_req, res) => {
  return res.json([]);
});

export default router;
