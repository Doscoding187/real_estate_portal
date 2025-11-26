import React, { useState } from 'react';
import { Bell, Shield, ChevronDown, LogOut, User } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';

const TopNavigationBar: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const toggleProfileMenu = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/40 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-slate-800">Super Admin</span>
          </div>
          <span className="text-lg font-medium text-slate-600 hidden md:block">HomeFind.za Portal</span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Bell className="h-6 w-6 text-slate-600 cursor-pointer hover:text-blue-600 transition-colors" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white"></span>
          </div>

          <div className="relative">
            <button
              onClick={toggleProfileMenu}
              className="flex items-center space-x-2 cursor-pointer focus:outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-md">
                <span className="font-semibold">{user?.name?.charAt(0)?.toUpperCase() || 'A'}</span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-800">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-blue-600">Super Administrator</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 hidden md:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white/40 py-1 text-slate-900 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm font-medium">{user?.name || 'Admin User'}</p>
                  <p className="text-xs text-slate-500">Super Administrator</p>
                </div>
                <button className="flex items-center w-full px-4 py-2 text-sm hover:bg-blue-50 text-slate-700 transition-colors">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm hover:bg-red-50 text-red-600 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="btn-secondary bg-slate-100 hover:bg-slate-200 text-slate-700 md:hidden"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TopNavigationBar;
