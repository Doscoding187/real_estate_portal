import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { SoftSidebar } from '@/components/admin/SoftSidebar';

export default function SuperAdminDashboard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Check authentication and redirect if not authenticated
  useEffect(() => {
    // Wait for auth state to load
    if (loading) return;

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }

    // If user is not a super admin, redirect to login
    if (user?.role !== 'super_admin') {
      setLocation('/login');
      return;
    }
  }, [isAuthenticated, user, loading, setLocation]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated || user?.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      {/* Floating Glass Sidebar */}
      <SoftSidebar />

      {/* Main Content */}
      <main className="pl-32">
        {children}
      </main>
    </div>
  );
}
