import React, { useState } from 'react';
import { Bell, Shield, ChevronDown, LogOut, User } from 'lucide-react';

const TopNavigationBar: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const toggleProfileMenu = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
    // Implement logout logic here
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 to-blue-800 text-white shadow-md">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-white" />
            <span className="ml-2 text-xl font-bold">Super Admin</span>
          </div>
          <span className="text-lg font-medium hidden md:block">
            HomeFind.za Portal
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Bell className="h-6 w-6 cursor-pointer" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500"></span>
          </div>

          <div className="relative">
            <button
              onClick={toggleProfileMenu}
              className="flex items-center space-x-2 cursor-pointer focus:outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="font-semibold">A</span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-blue-200">Super Administrator</p>
              </div>
              <ChevronDown className="h-4 w-4 hidden md:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 text-slate-900 z-50">
                <div className="px-4 py-2 border-b border-slate-200">
                  <p className="text-sm font-medium">Admin User</p>
                  <p className="text-xs text-slate-500">Super Administrator</p>
                </div>
                <button className="flex items-center w-full px-4 py-2 text-sm hover:bg-slate-100">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm hover:bg-slate-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="btn-secondary bg-slate-800 hover:bg-slate-700 text-white md:hidden"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TopNavigationBar;
