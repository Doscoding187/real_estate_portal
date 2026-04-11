import React from 'react';
import PropertyDetailDesktopLegacy from './PropertyDetailDesktopLegacy';
import PropertyDetailMobileOptimized from './PropertyDetailMobileOptimized';

interface PropertyDetailProps {
  propertyId?: number;
}

export default function PropertyDetail(props: PropertyDetailProps & Record<string, unknown>) {
  const [isDesktopViewport, setIsDesktopViewport] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateViewport = () => setIsDesktopViewport(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  if (isDesktopViewport) {
    return <PropertyDetailDesktopLegacy {...props} />;
  }

  return <PropertyDetailMobileOptimized {...props} />;
}
