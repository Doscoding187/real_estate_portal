/**
 * Partner Lead Router
 * 
 * API endpoints for lead generation, management, and dispute handling
 * in the Explore Partner Marketplace.
 */

import { Router } from "express";
import { leadGenerationService, LeadCreate, LeadFilters } from "./services/leadGenerationService";

const router = Router();

/**
 * POST /api/partner-leads
 * Create a new lead
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
router.post("/", async (req, res) => {
  try {
    const leadData: LeadCreate = req.body;

    // Validate required fields
    if (!leadData.partnerId || !leadData.userId || !leadData.type || !leadData.contactInfo) {
      return res.status(400).json({
        error: "Missing required fields: partnerId, userId, type, contactInfo"
      });
    }

    // Validate lead type
    const validTypes = ['quote_request', 'consultation', 'eligibility_check'];
    if (!validTypes.includes(leadData.type)) {
      return res.status(400).json({
        error: `Invalid lead type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate contact info
    if (!leadData.contactInfo.name || !leadData.contactInfo.email || !leadData.contactInfo.phone) {
      return res.status(400).json({
        error: "Contact info must include name, email, and phone"
      });
    }

    const lead = await leadGenerationService.createLead(leadData);

    res.status(201).json({
      success: true,
      lead,
      message: "Lead created successfully. Partner has been notified."
    });
  } catch (error: any) {
    console.error("Error creating lead:", error);
    res.status(500).json({
      error: "Failed to create lead",
      details: error.message
    });
  }
});

/**
 * GET /api/partner-leads/partner/:partnerId
 * Get all leads for a partner
 * 
 * Requirements: 9.5
 */
router.get("/partner/:partnerId", async (req, res) => {
  try {
    const { partnerId } = req.params;
    const filters: LeadFilters = {
      status: req.query.status as any,
      type: req.query.type as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const leads = await leadGenerationService.getPartnerLeads(partnerId, filters);

    res.json({
      success: true,
      leads,
      count: leads.length
    });
  } catch (error: any) {
    console.error("Error fetching partner leads:", error);
    res.status(500).json({
      error: "Failed to fetch leads",
      details: error.message
    });
  }
});

/**
 * GET /api/partner-leads/:leadId
 * Get a single lead by ID
 */
router.get("/:leadId", async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await leadGenerationService.getLeadById(leadId);

    if (!lead) {
      return res.status(404).json({
        error: "Lead not found"
      });
    }

    res.json({
      success: true,
      lead
    });
  } catch (error: any) {
    console.error("Error fetching lead:", error);
    res.status(500).json({
      error: "Failed to fetch lead",
      details: error.message
    });
  }
});

/**
 * PUT /api/partner-leads/:leadId/status
 * Update lead status
 */
router.put("/:leadId/status", async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'contacted', 'converted', 'disputed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    await leadGenerationService.updateLeadStatus(leadId, status);

    res.json({
      success: true,
      message: "Lead status updated successfully"
    });
  } catch (error: any) {
    console.error("Error updating lead status:", error);
    res.status(500).json({
      error: "Failed to update lead status",
      details: error.message
    });
  }
});

/**
 * POST /api/partner-leads/:leadId/dispute
 * Dispute a lead
 * 
 * Requirements: 9.6
 */
router.post("/:leadId/dispute", async (req, res) => {
  try {
    const { leadId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: "Dispute reason is required"
      });
    }

    await leadGenerationService.disputeLead(leadId, reason);

    res.json({
      success: true,
      message: "Lead dispute submitted. Admin team will review within 48 hours."
    });
  } catch (error: any) {
    console.error("Error disputing lead:", error);
    res.status(500).json({
      error: "Failed to dispute lead",
      details: error.message
    });
  }
});

/**
 * POST /api/partner-leads/:leadId/dispute/process
 * Process a lead dispute (admin only)
 * 
 * Requirements: 9.6
 */
router.post("/:leadId/dispute/process", async (req, res) => {
  try {
    const { leadId } = req.params;
    const { decision } = req.body;

    if (!decision || !['refund', 'reject'].includes(decision)) {
      return res.status(400).json({
        error: "Decision must be either 'refund' or 'reject'"
      });
    }

    await leadGenerationService.processDispute(leadId, decision);

    res.json({
      success: true,
      message: `Dispute ${decision === 'refund' ? 'approved and refunded' : 'rejected'}`
    });
  } catch (error: any) {
    console.error("Error processing dispute:", error);
    res.status(500).json({
      error: "Failed to process dispute",
      details: error.message
    });
  }
});

/**
 * GET /api/partner-leads/partner/:partnerId/funnel
 * Get lead conversion funnel for a partner
 */
router.get("/partner/:partnerId/funnel", async (req, res) => {
  try {
    const { partnerId } = req.params;
    const funnel = await leadGenerationService.getLeadConversionFunnel(partnerId);

    res.json({
      success: true,
      funnel
    });
  } catch (error: any) {
    console.error("Error fetching conversion funnel:", error);
    res.status(500).json({
      error: "Failed to fetch conversion funnel",
      details: error.message
    });
  }
});

/**
 * GET /api/partner-leads/pricing/:type
 * Get pricing information for a lead type
 * 
 * Requirements: 9.1, 9.2, 9.3
 */
router.get("/pricing/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { partnerId } = req.query;

    const validTypes = ['quote_request', 'consultation', 'eligibility_check'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid lead type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    if (!partnerId) {
      return res.status(400).json({
        error: "partnerId query parameter is required"
      });
    }

    const price = await leadGenerationService.calculateLeadPrice(
      type as any,
      partnerId as string
    );

    res.json({
      success: true,
      type,
      price,
      currency: "ZAR"
    });
  } catch (error: any) {
    console.error("Error calculating lead price:", error);
    res.status(500).json({
      error: "Failed to calculate lead price",
      details: error.message
    });
  }
});

export default router;
