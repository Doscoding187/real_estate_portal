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
  BarChart3,
  FileText,
  Users,
  TrendingUp,
  Plus,
  MapPin,
} from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Overview', path: '/developer/dashboard' },
  { icon: Building2, label: 'Projects', path: '/developer/projects' },
  { icon: MapPin, label: 'Developments', path: '/developer/developments' },
  { icon: BarChart3, label: 'Analytics', path: '/developer/analytics' },
  { icon: FileText, label: 'Documents', path: '/developer/documents' },
];

export default function PropertyDeveloperDashboard() {
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

  if (user?.role !== 'property_developer') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <SoftDashboardLayout
      navItems={navItems}
      title="Developer Dashboard"
      subtitle="Manage your property developments and projects"
    >
      {/* Top KPI Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-4 gap-8 mb-12"
      >
        <div>
          <p className="text-slate-400 text-sm mb-2">Total Portfolio Value</p>
          <p className="text-4xl font-bold text-slate-800">R 45.2M</p>
          <div className="flex items-center gap-2 mt-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-600 text-sm font-medium">+22.5%</span>
          </div>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">Active Projects</p>
          <p className="text-4xl font-bold text-slate-800">8</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">Units Available</p>
          <p className="text-4xl font-bold text-slate-800">124</p>
          <div className="flex items-center gap-2 mt-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="text-blue-600 text-sm font-medium">32 sold this month</span>
          </div>
        </div>
        <div>
          <p className="text-slate-400 text-sm mb-2">Completion Rate</p>
          <p className="text-4xl font-bold text-slate-800">87%</p>
          <PastelBadge variant="mint" className="mt-2">On Track</PastelBadge>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Active Projects */}
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
                  Active Projects
                </h3>
                <p className="text-slate-400 text-sm">Your current developments</p>
              </div>
              <Button
                onClick={() => setLocation('/developer/projects/new')}
                className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>

            <div className="space-y-4">
              {[
                { name: 'Sandton Heights', location: 'Sandton, JHB', units: 45, sold: 32, progress: 87 },
                { name: 'Waterfront Residences', location: 'V&A, Cape Town', units: 38, sold: 28, progress: 92 },
                { name: 'Pretoria Gardens', location: 'Pretoria East', units: 41, sold: 18, progress: 65 },
              ].map((project, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-white/50 hover:bg-white/70 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-slate-800">{project.name}</div>
                      <div className="text-sm text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {project.location}
                      </div>
                    </div>
                    <PastelBadge variant="sky">{project.progress}% Complete</PastelBadge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{project.sold}/{project.units} units sold</span>
                    <span className="text-emerald-600 font-medium">R {(project.sold * 2.5).toFixed(1)}M revenue</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-600 h-2 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Sales Performance */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                  Sales Performance
                </h3>
                <p className="text-slate-400 text-sm">Monthly breakdown</p>
              </div>
              <PastelBadge variant="mint">This Month</PastelBadge>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50">
                <p className="text-slate-600 text-sm mb-2">Total Sales</p>
                <p className="text-4xl font-bold text-emerald-700">R 12.4M</p>
                <p className="text-emerald-600 text-sm font-medium mt-2">+18.5% from last month</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/50 text-center">
                  <p className="text-slate-400 text-sm mb-2">Units Sold</p>
                  <p className="text-3xl font-bold text-slate-800">32</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/50 text-center">
                  <p className="text-slate-400 text-sm mb-2">Avg Price</p>
                  <p className="text-3xl font-bold text-slate-800">R 3.9M</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/50">
                <p className="text-slate-600 text-sm mb-3">Top Selling Project</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">Waterfront Residences</p>
                    <p className="text-sm text-slate-500">Cape Town</p>
                  </div>
                  <PastelBadge variant="mint">28 sold</PastelBadge>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Project Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-6 w-6 text-purple-600" />
                Project Milestones
              </h3>
              <p className="text-slate-400 text-sm">Upcoming deadlines and completions</p>
            </div>
            <PastelBadge variant="lavender">Next 30 Days</PastelBadge>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {[
              { milestone: 'Foundation Complete', project: 'Sandton Heights', date: 'Dec 15', status: 'On Track' },
              { milestone: 'Roof Installation', project: 'Waterfront Res.', date: 'Dec 20', status: 'Ahead' },
              { milestone: 'Interior Finish', project: 'Pretoria Gardens', date: 'Dec 28', status: 'Delayed' },
              { milestone: 'Final Inspection', project: 'Sandton Heights', date: 'Jan 5', status: 'Scheduled' },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/50">
                <PastelBadge
                  variant={
                    item.status === 'On Track' ? 'mint' :
                    item.status === 'Ahead' ? 'sky' :
                    item.status === 'Delayed' ? 'rose' : 'lavender'
                  }
                  className="mb-3"
                >
                  {item.status}
                </PastelBadge>
                <p className="font-semibold text-slate-800 text-sm mb-1">{item.milestone}</p>
                <p className="text-xs text-slate-500 mb-2">{item.project}</p>
                <p className="text-xs text-purple-600 font-medium">{item.date}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </SoftDashboardLayout>
  );
}
