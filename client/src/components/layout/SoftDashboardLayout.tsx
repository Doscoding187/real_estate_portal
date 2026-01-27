import React from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { Home, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface SoftDashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  title: string;
  subtitle?: string;
}

export const SoftDashboardLayout: React.FC<SoftDashboardLayoutProps> = ({
  children,
  navItems,
  title,
  subtitle,
}) => {
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      {/* Floating Glass Sidebar */}
      <motion.div
        className="fixed left-6 top-6 bottom-6 z-50"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        initial={{ width: 80 }}
        animate={{ width: isExpanded ? 240 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="h-full bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/40 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] p-4 flex flex-col">
          {/* Logo */}
          <div className="mb-8 flex items-center justify-center h-12">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Home className="h-5 w-5 text-white" />
            </div>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="ml-3 font-bold text-slate-800"
              >
                HomeFind
              </motion.span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location === item.path || location.startsWith(item.path + '/');

              return (
                <Link key={item.path} href={item.path}>
                  <a
                    className={cn(
                      'flex items-center h-12 rounded-2xl transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 shadow-lg'
                        : 'text-slate-600 hover:bg-slate-100/50',
                    )}
                  >
                    <div className="w-12 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="font-medium text-sm whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <button
            className={cn(
              'flex items-center h-12 rounded-2xl transition-all duration-200',
              'text-slate-600 hover:bg-red-50 hover:text-red-600',
            )}
          >
            <div className="w-12 flex items-center justify-center flex-shrink-0">
              <LogOut className="h-5 w-5" />
            </div>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-medium text-sm whitespace-nowrap"
              >
                Logout
              </motion.span>
            )}
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <main className="pl-32 p-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-5xl font-bold text-slate-800 mb-2">{title}</h1>
            {subtitle && <p className="text-slate-400 text-lg">{subtitle}</p>}
          </motion.div>

          {/* Content */}
          {children}
        </div>
      </main>
    </div>
  );
};
