import { Router } from 'express';
import { normalizeDevelopmentRootPath } from '../services/developmentRouteAuthority';
import { resolveActiveDevelopmentSupersessionRedirect } from '../services/developmentSupersessionService';

const router = Router();

router.get('/development/:routeKey', async (req, res, next) => {
  const sourcePath = normalizeDevelopmentRootPath(req.path);
  if (!sourcePath) return next();

  try {
    const redirect = await resolveActiveDevelopmentSupersessionRedirect(sourcePath);
    if (!redirect || redirect.targetPath === sourcePath) return next();

    const requestUrl = new URL(req.originalUrl, 'http://property-listify.local');
    const target = `${redirect.targetPath}${requestUrl.search}`;

    // The origin resolves redirects dynamically so reversal remains possible;
    // cached/materialized public projections are invalidated after cutover.
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(307, target);
  } catch (error) {
    return next(error);
  }
});

export default router;
