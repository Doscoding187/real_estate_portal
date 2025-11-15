import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Menu } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import TopNavigationBar from '@/components/admin/TopNavigationBar';
import SidebarNavigation from '@/components/admin/SidebarNavigation';

export default function SuperAdminDashboard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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

  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      }
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-slate-600">Checking access…</span>
      </div>
    );
  }

  // If not authenticated or not a super admin, don't render anything
  // (redirect should have already happened)
  if (!isAuthenticated || user?.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TopNavigationBar />
      <div className="flex flex-1">
        {/* Sidebar */}
        <div
          className={`${
            isMobile ? 'absolute z-40' : 'relative'
          } ${isSidebarOpen ? 'block' : 'hidden'} md:block transition-all duration-300 ease-in-out`}
          style={{ width: '280px' }}
        >
          <SidebarNavigation />
        </div>

        {/* Main Content */}
        <main
          className={`flex-1 overflow-auto transition-all duration-300 ease-in-out ${
            isMobile ? 'pt-16' : ''
          }`}
        >
          {isMobile && (
            <div className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 bg-background border-b z-30">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md bg-background text-foreground hover:bg-muted"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Admin Dashboard</span>
                <Badge variant="destructive">Super Admin</Badge>
              </div>
              <div className="w-8"></div> {/* Spacer for symmetry */}
            </div>
          )}

          {/* Page Content */}
          <div className="p-4 md:p-6">
            {/* Render children routes or default content */}
            <div>
              {children || (
                <div className="text-center py-12">
                  <h2 className="text-xl font-semibold mb-2">
                    Welcome to the Super Admin Dashboard
                  </h2>
                  <p className="text-muted-foreground">
                    Select an option from the sidebar to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
