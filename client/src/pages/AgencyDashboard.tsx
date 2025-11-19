import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { SoftDashboardLayout } from '@/components/layout/SoftDashboardLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { PastelBadge } from '@/components/ui/pastel-badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Home,
  Building2,
  Users,
  TrendingUp,
  UserPlus,
  Award,
  DollarSign,
} from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Overview', path: '/agency/dashboard' },
  { icon: Users, label: 'Agents', path: '/agency/agents' },
  { icon: Building2, label: 'Listings', path: '/agency/listings' },
  { icon: TrendingUp, label: 'Analytics', path: '/agency/analytics' },
  { icon: Award, label: 'Performance', path: '/agency/performance' },
];

export default function AgencyDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

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

  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (user?.role !== 'agency_admin') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <SoftDashboardLayout
      navItems={navItems}
      title="Agency Dashboard"
      subtitle="Manage your team and grow your agency"
    >
      {/* Top KPI Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-4 gap-8 mb-12"
      >
        <div>
          <p className="text-slate-400 text-sm mb-2">Total Revenue</p>
          <p className="text-4xl font-bold text-slate-800">R 2.4M</p>
          <div className="flex items-center gap-2 mt-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-600 text-sm font-medium">+18.2%</span>
          </div>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">Active Agents</p>
          <p className="text-4xl font-bold text-slate-800">24</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">Total Listings</p>
          <p className="text-4xl font-bold text-slate-800">156</p>
          <div className="flex items-center gap-2 mt-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="text-blue-600 text-sm font-medium">+12 this week</span>
          </div>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">Closed Deals</p>
          <p className="text-4xl font-bold text-slate-800">18</p>
          <PastelBadge variant="mint" className="mt-2">This Month</PastelBadge>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Top Performing Agents */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Award className="h-6 w-6 text-amber-600" />
                  Top Performers
                </h3>
                <p className="text-slate-400 text-sm">This month's stars</p>
              </div>
              <Button
                onClick={() => setLocation('/agency/agents/invite')}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Agent
              </Button>
            </div>

            <div className="space-y-4">
              {[
                { name: 'Sarah Johnson', deals: 8, revenue: 'R 1.2M', avatar: 'https://i.pravatar.cc/150?img=1' },
                { name: 'Michael Chen', deals: 6, revenue: 'R 890K', avatar: 'https://i.pravatar.cc/150?img=2' },
                { name: 'Amara Nkosi', deals: 5, revenue: 'R 750K', avatar: 'https://i.pravatar.cc/150?img=3' },
              ].map((agent, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 hover:bg-white/70 transition-all"
                >
                  <img
                    src={agent.avatar}
                    alt={agent.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">{agent.name}</div>
                    <div className="text-sm text-slate-500">{agent.deals} deals closed</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-600">{agent.revenue}</div>
                    <PastelBadge variant="mint" className="mt-1">Top {i + 1}</PastelBadge>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  Recent Listings
                </h3>
                <p className="text-slate-400 text-sm">Latest properties from your team</p>
              </div>
              <PastelBadge variant="sky">156 Total</PastelBadge>
            </div>

            <div className="space-y-4">
              {[
                { property: 'Modern Villa in Sandton', agent: 'Sarah Johnson', price: 'R 4.5M', status: 'Active' },
                { property: 'Luxury Apartment - V&A', agent: 'Michael Chen', price: 'R 3.2M', status: 'Pending' },
                { property: 'Family Home in Pretoria', agent: 'Amara Nkosi', price: 'R 2.8M', status: 'Active' },
              ].map((listing, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-white/50 hover:bg-white/70 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-slate-800">{listing.property}</div>
                    <PastelBadge variant={listing.status === 'Active' ? 'mint' : 'apricot'}>
                      {listing.status}
                    </PastelBadge>
                  </div>
                  <div className="text-sm text-slate-500">by {listing.agent}</div>
                  <div className="text-lg font-bold text-emerald-600 mt-2">{listing.price}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Agency Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-emerald-600" />
                Revenue Breakdown
              </h3>
              <p className="text-slate-400 text-sm">Monthly performance metrics</p>
            </div>
            <PastelBadge variant="mint">Last 30 Days</PastelBadge>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="text-center p-6 rounded-2xl bg-white/50">
              <p className="text-slate-400 text-sm mb-2">Sales Revenue</p>
              <p className="text-3xl font-bold text-slate-800">R 1.8M</p>
              <p className="text-emerald-600 text-sm font-medium mt-2">+15.3%</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/50">
              <p className="text-slate-400 text-sm mb-2">Rental Revenue</p>
              <p className="text-3xl font-bold text-slate-800">R 600K</p>
              <p className="text-blue-600 text-sm font-medium mt-2">+8.7%</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/50">
              <p className="text-slate-400 text-sm mb-2">Commission</p>
              <p className="text-3xl font-bold text-slate-800">R 240K</p>
              <p className="text-purple-600 text-sm font-medium mt-2">10% avg</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/50">
              <p className="text-slate-400 text-sm mb-2">Avg Deal Size</p>
              <p className="text-3xl font-bold text-slate-800">R 3.2M</p>
              <p className="text-amber-600 text-sm font-medium mt-2">+12.1%</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </SoftDashboardLayout>
  );
}
