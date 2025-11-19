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
  Calendar,
  TrendingUp,
  Plus,
  Eye,
  MessageSquare,
} from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Overview', path: '/agent/dashboard' },
  { icon: Building2, label: 'My Listings', path: '/agent/listings' },
  { icon: Users, label: 'Clients', path: '/agent/clients' },
  { icon: Calendar, label: 'Appointments', path: '/agent/appointments' },
  { icon: MessageSquare, label: 'Messages', path: '/agent/messages' },
];

export default function AgentDashboard() {
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

  if (user?.role !== 'agent') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <SoftDashboardLayout
      navItems={navItems}
      title="Agent Dashboard"
      subtitle="Manage your properties and grow your business"
    >
      {/* Top KPI Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-4 gap-8 mb-12"
      >
        <div>
          <p className="text-slate-400 text-sm mb-2">Active Listings</p>
          <p className="text-4xl font-bold text-slate-800">12</p>
          <div className="flex items-center gap-2 mt-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-600 text-sm font-medium">+3 this month</span>
          </div>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">Total Views</p>
          <p className="text-4xl font-bold text-slate-800">1,247</p>
          <div className="flex items-center gap-2 mt-2">
            <Eye className="h-4 w-4 text-blue-600" />
            <span className="text-blue-600 text-sm font-medium">+156 this week</span>
          </div>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">Active Clients</p>
          <p className="text-4xl font-bold text-slate-800">28</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">Appointments</p>
          <p className="text-4xl font-bold text-slate-800">5</p>
          <PastelBadge variant="apricot" className="mt-2">Today</PastelBadge>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Recent Listings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  Recent Listings
                </h3>
                <p className="text-slate-400 text-sm">Your latest properties</p>
              </div>
              <Button
                onClick={() => setLocation('/listings/create')}
                className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Listing
              </Button>
            </div>

            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/50 hover:bg-white/70 transition-all"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">Modern Villa in Sandton</div>
                    <div className="text-sm text-slate-500">Sandton, Johannesburg</div>
                    <div className="text-lg font-bold text-emerald-600 mt-1">R 4,500,000</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <PastelBadge variant="mint">Active</PastelBadge>
                    <span className="text-xs text-slate-400">156 views</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Upcoming Appointments */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-purple-600" />
                  Today's Appointments
                </h3>
                <p className="text-slate-400 text-sm">Your schedule for today</p>
              </div>
              <PastelBadge variant="lavender">5 Scheduled</PastelBadge>
            </div>

            <div className="space-y-4">
              {[
                { time: '10:00 AM', client: 'Sarah Johnson', property: 'Villa in Sandton' },
                { time: '2:00 PM', client: 'Michael Chen', property: 'Apartment - V&A' },
                { time: '4:30 PM', client: 'Amara Nkosi', property: 'House in Pretoria' },
              ].map((apt, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/50 hover:bg-white/70 transition-all"
                >
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">{apt.client}</div>
                    <div className="text-sm text-slate-500">{apt.property}</div>
                    <div className="text-xs text-purple-600 font-medium mt-1">{apt.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Performance Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
                Performance Overview
              </h3>
              <p className="text-slate-400 text-sm">Your monthly statistics</p>
            </div>
            <PastelBadge variant="mint">This Month</PastelBadge>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="text-center p-6 rounded-2xl bg-white/50">
              <p className="text-slate-400 text-sm mb-2">Total Views</p>
              <p className="text-3xl font-bold text-slate-800">1,247</p>
              <p className="text-emerald-600 text-sm font-medium mt-2">+12.5%</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/50">
              <p className="text-slate-400 text-sm mb-2">Inquiries</p>
              <p className="text-3xl font-bold text-slate-800">89</p>
              <p className="text-emerald-600 text-sm font-medium mt-2">+8.3%</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/50">
              <p className="text-slate-400 text-sm mb-2">Showings</p>
              <p className="text-3xl font-bold text-slate-800">34</p>
              <p className="text-blue-600 text-sm font-medium mt-2">+5.2%</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/50">
              <p className="text-slate-400 text-sm mb-2">Closed Deals</p>
              <p className="text-3xl font-bold text-slate-800">3</p>
              <p className="text-purple-600 text-sm font-medium mt-2">This month</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </SoftDashboardLayout>
  );
}
