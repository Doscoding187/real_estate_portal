import type { RequestHandler } from 'express';
import { canonicalPlaceUrlRedirectByPath } from '../services/canonicalPlaceUrlService';

const canonicalPlaceUrlRedirect: RequestHandler = (req, res, next) => {
  const requestUrl = new URL(req.originalUrl, 'http://property-listify.local');
  const sourcePath = requestUrl.pathname.replace(/\/+$/, '') || '/';
  const redirect = canonicalPlaceUrlRedirectByPath(sourcePath);
  if (!redirect) return next();

  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.redirect(redirect.status_code, `${redirect.target_path}${requestUrl.search}`);
};

export default canonicalPlaceUrlRedirect;
