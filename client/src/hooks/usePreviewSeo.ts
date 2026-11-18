import { useEffect } from 'react';
import { applySeo } from '@/lib/seo';

export function usePreviewSeo(title: string, description: string) {
  useEffect(() => {
    applySeo({ title, description, noindex: true });

    return () => {
      applySeo({ noindex: false });
    };
  }, [description, title]);
}
