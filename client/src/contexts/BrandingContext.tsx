import React, { createContext, useContext, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

export interface BrandingConfig {
  agencyId: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  companyName?: string;
  tagline?: string;
  metaTitle?: string;
  metaDescription?: string;
  supportEmail?: string;
  supportPhone?: string;
  socialLinks?: Record<string, string>;
  customCss?: string;
  isCustomDomain?: boolean;
  subdomain?: string;
  customDomain?: string;
}

interface BrandingContextType {
  branding: BrandingConfig | null;
  isWhiteLabel: boolean;
  isLoading: boolean;
  refreshBranding: () => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

interface BrandingProviderProps {
  children: React.ReactNode;
}

// Detect if we're on a white-label domain
const detectWhiteLabel = (): { isWhiteLabel: boolean; branding?: BrandingConfig } => {
  // Check for branding data injected by server
  const brandingElement = document.getElementById('agency-branding');
  if (brandingElement) {
    try {
      const branding = JSON.parse(brandingElement.textContent || '{}');
      return { isWhiteLabel: true, branding };
    } catch (error) {
      console.error('Failed to parse branding data:', error);
    }
  }

  // Check URL for subdomain (development fallback)
  const host = window.location.hostname;
  if (host !== 'localhost' && !host.includes('yourplatform.com')) {
    // This could be a custom domain or subdomain
    // In production, the server would inject the branding data
    return { isWhiteLabel: true };
  }

  return { isWhiteLabel: false };
};

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [isWhiteLabel, setIsWhiteLabel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // API call to get branding (fallback if server injection fails)
  const { data: apiBranding } = trpc.agency.getBranding.useQuery(undefined, {
    enabled: isWhiteLabel && !branding,
  });

  useEffect(() => {
    const { isWhiteLabel: detectedWhiteLabel, branding: detectedBranding } = detectWhiteLabel();

    setIsWhiteLabel(detectedWhiteLabel);

    if (detectedBranding) {
      setBranding(detectedBranding);
    } else if (detectedWhiteLabel && apiBranding) {
      setBranding(apiBranding);
    }

    setIsLoading(false);
  }, [apiBranding]);

  const refreshBranding = () => {
    const { branding: detectedBranding } = detectWhiteLabel();
    if (detectedBranding) {
      setBranding(detectedBranding);
    }
    // Force refetch if using API
    // This would trigger the tRPC query to refetch
  };

  // Apply branding styles to CSS variables
  useEffect(() => {
    if (branding) {
      const root = document.documentElement;

      // Set CSS custom properties for branding
      root.style.setProperty('--branding-primary', branding.primaryColor || '#3b82f6');
      root.style.setProperty('--branding-secondary', branding.secondaryColor || '#64748b');
      root.style.setProperty(
        '--branding-accent',
        branding.accentColor || branding.primaryColor || '#3b82f6',
      );

      // Update meta tags
      if (branding.metaTitle) {
        document.title = branding.metaTitle;
      }
      if (branding.metaDescription) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute('content', branding.metaDescription);
        }
      }
      if (branding.faviconUrl) {
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (favicon) {
          favicon.href = branding.faviconUrl;
        }
      }

      // Apply custom CSS
      if (branding.customCss) {
        const styleId = 'agency-custom-css';
        let styleElement = document.getElementById(styleId) as HTMLStyleElement;

        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = styleId;
          document.head.appendChild(styleElement);
        }

        styleElement.textContent = branding.customCss;
      }
    }
  }, [branding]);

  const value: BrandingContextType = {
    branding,
    isWhiteLabel,
    isLoading,
    refreshBranding,
  };

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};
