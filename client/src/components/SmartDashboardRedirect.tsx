import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function SmartDashboardRedirect() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }

    // Role-based redirection logic
    switch (user?.role) {
      case 'property_developer':
        setLocation('/developer/dashboard');
        break;
      case 'super_admin':
        setLocation('/admin/overview');
        break;
      case 'agency_admin':
        setLocation('/agency/dashboard');
        break;
      case 'agent':
        setLocation('/agent/dashboard');
        break;
      case 'visitor':
      default:
        setLocation('/user/dashboard');
        break;
    }
  }, [user, authLoading, isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
