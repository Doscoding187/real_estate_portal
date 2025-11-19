import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { SoftDashboardLayout } from '@/components/layout/SoftDashboardLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { PastelBadge } from '@/components/ui/pastel-badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Home,
  Heart,
  Eye,
  Search,
  Bell,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

const navItems = [
  { icon: Home, label: 'Overview', path: '/dashboard' },
  { icon: Heart, label: 'Favorites', path: '/favorites' },
  { icon: Search, label: 'Search', path: '/properties' },
  { icon: Bell, label: 'Notifications', path: '/dashboard/notifications' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

  // Fetch user dashboard data
  const { data: favorites, isLoading: favoritesLoading } = trpc.favorites.list.useQuery();

  // Show loading spinner while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not a regular user
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (user?.role !== 'visitor') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <SoftDashboardLayout
      navItems={navItems}
      title="My Dashboard"
      subtitle="Your personalized property search hub"
    >
      {/* Top KPI Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-4 gap-8 mb-12"
      >
        <div>
          <p className="text-slate-400 text-sm mb-2">Favorites</p>
          <p className="text-4xl font-bold text-slate-800">{favorites?.length || 0}</p>
          <div className="flex items-center gap-2 mt-2">
            <Heart className="h-4 w-4 text-rose-600" />
            <span className="text-rose-600 text-sm font-medium">Saved</span>
          </div>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">Recently Viewed</p>
          <p className="text-4xl font-bold text-slate-800">0</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">Saved Searches</p>
          <p className="text-4xl font-bold text-slate-800">0</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">Notifications</p>
          <p className="text-4xl font-bold text-slate-800">0</p>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Favorite Properties */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Heart className="h-6 w-6 text-rose-600" />
                  Favorite Properties
                </h3>
                <p className="text-slate-400 text-sm">Your saved properties</p>
              </div>
              <PastelBadge variant="rose">{favorites?.length || 0} Saved</PastelBadge>
            </div>

            {favoritesLoading ? (
              <p className="text-slate-400">Loading favorites...</p>
            ) : (favorites?.length ?? 0) === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">No favorites yet</p>
                <Button
                  onClick={() => setLocation('/properties')}
                  className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700"
                >
                  Browse Properties
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {favorites!.slice(0, 5).map((property: any) => (
                  <div
                    key={property.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/50 hover:bg-white/70 transition-all"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">{property.title}</div>
                      <div className="text-sm text-slate-500">
                        {property.city}, {property.province}
                      </div>
                      <div className="text-lg font-bold text-emerald-600 mt-1">
                        R {property.price?.toLocaleString()}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/property/${property.id}`)}
                      className="rounded-xl"
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Recently Viewed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Eye className="h-6 w-6 text-blue-600" />
                  Recently Viewed
                </h3>
                <p className="text-slate-400 text-sm">Properties you've checked out</p>
              </div>
            </div>

            <div className="text-center py-12">
              <Eye className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No recently viewed properties</p>
              <Button
                onClick={() => setLocation('/properties')}
                className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
              >
                Explore Properties
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Saved Searches */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Search className="h-6 w-6 text-purple-600" />
                Saved Searches
              </h3>
              <p className="text-slate-400 text-sm">Quick access to your search criteria</p>
            </div>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
              <Search className="h-4 w-4 mr-2" />
              Save New Search
            </Button>
          </div>

          <div className="text-center py-12">
            <Search className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No saved searches yet</p>
            <Button
              onClick={() => setLocation('/properties')}
              variant="outline"
              className="rounded-xl"
            >
              Search Properties
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </SoftDashboardLayout>
  );
}
