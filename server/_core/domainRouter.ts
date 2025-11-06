import express from 'express';
import { getDb } from '../db';
import { agencyBranding } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Domain routing middleware
export const domainRoutingMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const db = await getDb();

  if (!db) {
    return next();
  }

  const host = req.headers.host;
  const subdomain = getSubdomain(host);

  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    try {
      // Find agency by subdomain
      const [branding] = await db
        .select()
        .from(agencyBranding)
        .where(eq(agencyBranding.subdomain, subdomain))
        .limit(1);

      if (branding && branding.isEnabled) {
        // Attach branding info to request for use in templates/controllers
        (req as any).agencyBranding = branding;
        (req as any).isWhiteLabel = true;
      }
    } catch (error) {
      console.error('Domain routing error:', error);
    }
  }

  next();
};

// Extract subdomain from hostname
function getSubdomain(hostname: string | undefined): string | null {
  if (!hostname) return null;

  // Remove port if present
  const host = hostname.split(':')[0];

  // Handle localhost for development
  if (host === 'localhost' || host.startsWith('localhost:')) {
    return null;
  }

  // Split by dots
  const parts = host.split('.');

  // For subdomains like agency.yourplatform.com
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

// Custom domain routing middleware
export const customDomainMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const db = await getDb();

  if (!db) {
    return next();
  }

  const host = req.headers.host?.split(':')[0]; // Remove port

  if (host) {
    try {
      // Find agency by custom domain
      const [branding] = await db
        .select()
        .from(agencyBranding)
        .where(eq(agencyBranding.customDomain, host))
        .limit(1);

      if (branding && branding.isEnabled) {
        // Attach branding info to request
        (req as any).agencyBranding = branding;
        (req as any).isWhiteLabel = true;
        (req as any).isCustomDomain = true;
      }
    } catch (error) {
      console.error('Custom domain routing error:', error);
    }
  }

  next();
};

// Branding context helper
export function getBrandingContext(req: express.Request) {
  const branding = (req as any).agencyBranding;
  const isWhiteLabel = (req as any).isWhiteLabel || false;

  if (!branding || !isWhiteLabel) {
    return null;
  }

  return {
    agencyId: branding.agencyId,
    primaryColor: branding.primaryColor || '#3b82f6',
    secondaryColor: branding.secondaryColor || '#64748b',
    accentColor: branding.accentColor,
    logoUrl: branding.logoUrl,
    faviconUrl: branding.faviconUrl,
    companyName: branding.companyName,
    tagline: branding.tagline,
    metaTitle: branding.metaTitle,
    metaDescription: branding.metaDescription,
    supportEmail: branding.supportEmail,
    supportPhone: branding.supportPhone,
    socialLinks: branding.socialLinks ? JSON.parse(branding.socialLinks) : {},
    customCss: branding.customCss,
    isCustomDomain: (req as any).isCustomDomain || false,
    subdomain: branding.subdomain,
    customDomain: branding.customDomain,
  };
}

// Domain availability checker
export const checkDomainAvailability = async (
  domain: string,
  type: 'subdomain' | 'custom',
): Promise<boolean> => {
  const db = await getDb();

  if (!db) {
    return false;
  }

  try {
    let existing;
    if (type === 'subdomain') {
      [existing] = await db
        .select()
        .from(agencyBranding)
        .where(eq(agencyBranding.subdomain, domain))
        .limit(1);
    } else {
      [existing] = await db
        .select()
        .from(agencyBranding)
        .where(eq(agencyBranding.customDomain, domain))
        .limit(1);
    }

    return !existing;
  } catch (error) {
    console.error('Domain availability check error:', error);
    return false;
  }
};

// DNS validation for custom domains (basic check)
export const validateDomainOwnership = async (domain: string): Promise<boolean> => {
  // In production, this would check DNS records or use a service like Vercel Domains
  // For now, we'll do basic validation
  try {
    // Check if domain is reachable (basic connectivity test)
    const https = await import('https');
    const url = `https://${domain}`;

    return new Promise(resolve => {
      const req = https.get(url, { timeout: 5000 }, res => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => resolve(false));
    });
  } catch (error) {
    return false;
  }
};

export default router;
