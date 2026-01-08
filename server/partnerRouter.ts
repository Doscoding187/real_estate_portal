import { Router } from "express";
import { partnerService } from "./services/partnerService";
import { requireAuth } from "./_core/auth";

const router = Router();

/**
 * POST /api/partners
 * Register a new partner
 * Requirement 1.1, 5.1, 5.2, 5.3, 5.4
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { tierId, companyName, description, logoUrl, serviceLocations } = req.body;

    if (!tierId || !companyName) {
      return res.status(400).json({
        error: "Missing required fields: tierId, companyName"
      });
    }

    const partner = await partnerService.registerPartner({
      userId: req.user!.id,
      tierId,
      companyName,
      description,
      logoUrl,
      serviceLocations
    });

    res.status(201).json(partner);
  } catch (error: any) {
    console.error("Error registering partner:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/partners/:id
 * Get partner profile
 * Requirement 5.1, 5.2, 5.3, 5.4
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await partnerService.getPartnerProfile(id);

    if (!profile) {
      return res.status(404).json({ error: "Partner not found" });
    }

    res.json(profile);
  } catch (error: any) {
    console.error("Error fetching partner profile:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/partners/:id
 * Update partner profile
 * Requirement 5.1, 5.2, 5.3, 5.4
 */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, description, logoUrl, serviceLocations } = req.body;

    // Verify ownership
    const profile = await partnerService.getPartnerProfile(id);
    if (!profile) {
      return res.status(404).json({ error: "Partner not found" });
    }

    if (profile.userId !== req.user!.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await partnerService.updateProfile(id, {
      companyName,
      description,
      logoUrl,
      serviceLocations
    });

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating partner profile:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/partners/:id/verify
 * Submit verification request
 * Requirement 5.5
 */
router.post("/:id/verify", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { credentials, documentUrls, licenseNumber } = req.body;

    // Verify ownership
    const profile = await partnerService.getPartnerProfile(id);
    if (!profile) {
      return res.status(404).json({ error: "Partner not found" });
    }

    if (profile.userId !== req.user!.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await partnerService.verifyPartner(id, {
      credentials,
      documentUrls,
      licenseNumber
    });

    res.json({ message: "Verification submitted successfully" });
  } catch (error: any) {
    console.error("Error submitting verification:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/partners/:id/tier
 * Assign partner tier (admin only)
 * Requirement 1.1, 1.6
 */
router.put("/:id/tier", requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { tierId } = req.body;

    if (!tierId) {
      return res.status(400).json({ error: "Missing required field: tierId" });
    }

    await partnerService.assignTier(id, tierId);

    res.json({ message: "Tier assigned successfully" });
  } catch (error: any) {
    console.error("Error assigning tier:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/partners/:id/trust-score
 * Recalculate trust score
 * Requirement 10.5
 */
router.post("/:id/trust-score", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const score = await partnerService.calculateTrustScore(id);

    res.json({ trustScore: score });
  } catch (error: any) {
    console.error("Error calculating trust score:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/partners/tier/:tierId
 * Get partners by tier
 */
router.get("/tier/:tierId", async (req, res) => {
  try {
    const { tierId } = req.params;

    const partners = await partnerService.getPartnersByTier(parseInt(tierId));

    res.json(partners);
  } catch (error: any) {
    console.error("Error fetching partners by tier:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
