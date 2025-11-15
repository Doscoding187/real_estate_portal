import React, { useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';

export const RequireSuperAdmin = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Bail out while the auth status is still loading (prevents flash-of-unauthenticated)
    if (loading) return;

    // If NOT authorized → client-side navigation
    if (!isAuthenticated || user?.role !== 'super_admin') {
      // Only trigger if we're not already on the login page
      if (window.location.pathname !== '/login') {
        setLocation('/login');
      }
    }
  }, [isAuthenticated, user, loading, setLocation]);

  // While we decide whether to redirect, render nothing (or a loader)
  if (loading) {
    // Optionally render a spinner or skeleton
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-slate-600">Checking access…</span>
      </div>
    );
  }

  // If we made it here, the user is authorized
  if (!isAuthenticated || user?.role !== 'super_admin') {
    return null;
  }

  return <>{children}</>;
};
