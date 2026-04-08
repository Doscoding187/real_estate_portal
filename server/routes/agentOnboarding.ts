import { type Request, type Response, Router } from 'express';
import { ZodError, z } from 'zod';
import { requireAuth } from '../_core/auth';
import {
  AGENT_ONBOARDING_TIER_VALUES,
  agentOnboardingService,
} from '../services/agentOnboardingService';

const router = Router();

type AuthenticatedRequest = Request & {
  user: {
    id: number;
    role?: string | null;
  };
};

const selectPackageSchema = z.object({
  tier: z.enum(AGENT_ONBOARDING_TIER_VALUES),
});

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(160).optional(),
  phone: z.string().trim().min(5).max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(5000).optional(),
  profileImage: z.string().trim().max(2048).optional(),
  profilePhoto: z.string().trim().max(2048).optional(),
  licenseNumber: z.string().trim().max(120).optional(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  focus: z.enum(['sales', 'rentals', 'both']).optional(),
  areasServed: z.array(z.string().trim().min(1)).max(50).optional(),
  specializations: z.array(z.string().trim().min(1)).max(50).optional(),
  propertyTypes: z.array(z.string().trim().min(1)).max(50).optional(),
  languages: z.array(z.string().trim().min(1)).max(30).optional(),
  socialLinks: z.record(z.string().trim().max(2048)).optional(),
  slug: z.string().trim().max(160).optional(),
  agencyId: z.number().int().positive().nullable().optional(),
  onboardingStep: z.number().int().min(0).max(10).optional(),
});

function respondForError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Invalid request payload',
      issues: error.flatten(),
    });
  }

  const message = error instanceof Error ? error.message : 'Request failed';
  const normalized = message.toLowerCase();
  const status = normalized.includes('not found')
    ? 404
    : normalized.includes('only available to agents') ||
        normalized.includes('only available to agent') ||
        normalized.includes('only available to')
      ? 403
      : normalized.includes('required') ||
          normalized.includes('already taken') ||
          normalized.includes('url-safe')
        ? 400
        : 500;

  return res.status(status).json({ error: message });
}

router.use(requireAuth);

router.use((req, res, next) => {
  const user = (req as Partial<AuthenticatedRequest>).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user.role !== 'agent') {
    return res.status(403).json({ error: 'Agent onboarding is only available to agents' });
  }

  next();
});

router.get('/onboarding-status', async (req, res) => {
  try {
    const userId = Number((req as AuthenticatedRequest).user.id);
    const result = await agentOnboardingService.getOnboardingStatus(userId);
    res.json(result);
  } catch (error) {
    respondForError(res, error);
  }
});

router.post('/select-package', async (req, res) => {
  try {
    const input = selectPackageSchema.parse(req.body);
    const userId = Number((req as AuthenticatedRequest).user.id);
    const result = await agentOnboardingService.selectPackage(userId, input.tier);
    res.json(result);
  } catch (error) {
    respondForError(res, error);
  }
});

router.post('/profile', async (req, res) => {
  try {
    const input = profileSchema.parse(req.body);
    const userId = Number((req as AuthenticatedRequest).user.id);
    const result = await agentOnboardingService.saveProfile(userId, input);
    res.json(result);
  } catch (error) {
    respondForError(res, error);
  }
});

export default router;
