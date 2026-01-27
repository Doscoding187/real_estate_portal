import { Router } from 'express';
import { contentApprovalService } from './services/contentApprovalService';
import { requireAuth } from './_core/auth';

const router = Router();

/**
 * POST /api/content/submit
 * Submit content for approval
 * Requirements: 6.1, 6.2
 */
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { contentId, partnerId } = req.body;

    if (!contentId || !partnerId) {
      return res.status(400).json({
        error: 'Missing required fields: contentId, partnerId',
      });
    }

    // Verify user owns the partner account
    const { partnerService } = await import('./services/partnerService');
    const partner = await partnerService.getPartnerProfile(partnerId);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    if (partner.userId !== req.user!.id) {
      return res.status(403).json({ error: "Unauthorized: You don't own this partner account" });
    }

    const queueItem = await contentApprovalService.submitForApproval(contentId, partnerId);

    res.status(201).json(queueItem);
  } catch (error: any) {
    console.error('Error submitting content for approval:', error);

    if (error.message === 'Partner not found') {
      return res.status(404).json({ error: error.message });
    }

    if (error.message === 'Content already submitted for approval') {
      return res.status(409).json({ error: error.message });
    }

    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/content/approval-queue
 * Get approval queue (admin only)
 * Requirements: 6.1, 6.2, 6.3
 */
router.get('/approval-queue', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, partnerId, limit, offset } = req.query;

    const filters: any = {};

    if (status) {
      filters.status = status as string;
    }

    if (partnerId) {
      filters.partnerId = partnerId as string;
    }

    if (limit) {
      filters.limit = parseInt(limit as string);
    }

    if (offset) {
      filters.offset = parseInt(offset as string);
    }

    const queue = await contentApprovalService.getApprovalQueue(filters);

    res.json(queue);
  } catch (error: any) {
    console.error('Error fetching approval queue:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/content/:id/review
 * Review content (admin only)
 * Requirements: 6.5
 */
router.post('/:id/review', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { status, feedback, violationTypes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Missing required field: status' });
    }

    if (!['approved', 'rejected', 'revision_requested'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: approved, rejected, revision_requested',
      });
    }

    if ((status === 'rejected' || status === 'revision_requested') && !feedback) {
      return res.status(400).json({
        error: 'Feedback is required for rejected or revision-requested content',
      });
    }

    await contentApprovalService.reviewContent(
      id,
      {
        status,
        feedback,
        violationTypes,
      },
      req.user!.id,
    );

    res.json({ message: 'Content reviewed successfully' });
  } catch (error: any) {
    console.error('Error reviewing content:', error);

    if (error.message === 'Queue item not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/content/:id/flag
 * Flag content for review
 * Requirements: 6.3
 */
router.post('/:id/flag', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Missing required field: reason' });
    }

    if (reason.length < 10) {
      return res.status(400).json({
        error: 'Reason must be at least 10 characters long',
      });
    }

    await contentApprovalService.flagContent(id, reason, req.user!.id);

    res.json({ message: 'Content flagged successfully' });
  } catch (error: any) {
    console.error('Error flagging content:', error);

    if (error.message === 'Content not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/content/partner/:partnerId/stats
 * Get review statistics for a partner
 * Requirements: 6.5
 */
router.get('/partner/:partnerId/stats', requireAuth, async (req, res) => {
  try {
    const { partnerId } = req.params;

    // Verify user owns the partner account or is admin
    const { partnerService } = await import('./services/partnerService');
    const partner = await partnerService.getPartnerProfile(partnerId);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    if (partner.userId !== req.user!.id && req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const stats = await contentApprovalService.getPartnerReviewStats(partnerId);

    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching partner review stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/content/validate
 * Validate content against tier rules
 * Requirements: 1.6, 15.2, 15.3
 */
router.post('/validate', requireAuth, async (req, res) => {
  try {
    const { contentId, partnerId, contentType, metadata, ctas } = req.body;

    if (!partnerId || !contentType) {
      return res.status(400).json({
        error: 'Missing required fields: partnerId, contentType',
      });
    }

    // Verify user owns the partner account
    const { partnerService } = await import('./services/partnerService');
    const partner = await partnerService.getPartnerProfile(partnerId);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    if (partner.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const validation = await contentApprovalService.validateContentRules(
      {
        contentId: contentId || 'preview',
        partnerId,
        contentType,
        metadata,
        ctas,
      },
      partner,
    );

    res.json(validation);
  } catch (error: any) {
    console.error('Error validating content:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
