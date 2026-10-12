import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';

type NavigateOptions = {
  replace?: boolean;
};

export function useServicesLocation() {
  const [pathname, navigate] = useLocation();
  const [search, setSearch] = useState(() => window.location.search);

  const syncSearch = useCallback(() => {
    setSearch(window.location.search);
  }, []);

  useEffect(() => {
    syncSearch();
    const events = ['popstate', 'pushState', 'replaceState', 'hashchange'];
    events.forEach(event => window.addEventListener(event, syncSearch));
    return () => events.forEach(event => window.removeEventListener(event, syncSearch));
  }, [syncSearch]);

  const setLocation = useCallback(
    (to: string, options?: NavigateOptions) => {
      if (options) {
        navigate(to, options);
      } else {
        navigate(to);
      }
      setSearch(new URL(to, window.location.href).search);
    },
    [navigate],
  );

  return { pathname, search, setLocation };
}
