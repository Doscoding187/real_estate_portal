import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopNavigationBar from '../layout/TopNavigationBar';
import SidebarNavigation from '../layout/SidebarNavigation';
import { Menu } from 'lucide-react';

const DashboardLayout: React.FC = () => {
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
        <div className="flex-shrink-0" style={{ width: '300px' }}>
          <SidebarNavigation />
        </div>

        <main
          className={`${isMobile ? '' : ''} mt-16 flex-1 overflow-auto p-6`}
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
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
