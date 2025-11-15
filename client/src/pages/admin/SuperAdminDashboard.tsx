import { useState, useEffect } from 'react';
import { Route, Switch, Redirect } from 'wouter';
import TopNavigationBar from '@/components/admin/TopNavigationBar';
import SidebarNavigation from '@/components/admin/SidebarNavigation';
import OverviewPage from '@/pages/admin/OverviewPage';
import AgenciesPage from '@/pages/admin/AgenciesPage';
import { useAuth } from '@/_core/hooks/useAuth';
import { Menu } from 'lucide-react';

export default function SuperAdminDashboard() {
  useAuth({ redirectOnUnauthenticated: true });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopNavigationBar />

      <div className="flex flex-1">
        <div
          className={`${
            isMobile ? 'absolute z-40' : 'relative'
          } ${isSidebarOpen ? 'block' : 'hidden'} md:block transition-all duration-300 ease-in-out`}
          style={{ width: '280px' }}
        >
          <SidebarNavigation />
        </div>

        <main
          className="mt-16 flex-1 overflow-auto p-6"
          style={isMobile ? {} : { marginLeft: '0px' }}
        >
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="fixed top-20 left-4 z-30 p-2 rounded-md bg-white shadow-md text-slate-700 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Switch>
            <Route path="/admin/overview" component={OverviewPage} />
            <Route path="/admin/agencies" component={AgenciesPage} />
            <Route path="/admin">
              <Redirect to="/admin/overview" />
            </Route>
            {/* Add other routes here */}
          </Switch>
        </main>
      </div>
    </div>
  );
}
