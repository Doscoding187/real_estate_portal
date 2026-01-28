import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { GlassCard } from '@/components/ui/glass-card';
import { PastelBadge } from '@/components/ui/pastel-badge';
import { TrendingUp, Users, Building2, FileText, CheckCircle2 } from 'lucide-react';

// Mock data for analytics
const analyticsData = [
  { month: 'Jan', value: 4000 },
  { month: 'Feb', value: 3000 },
  { month: 'Mar', value: 5000 },
  { month: 'Apr', value: 4500 },
  { month: 'May', value: 6000 },
  { month: 'Jun', value: 5500 },
];

// Mock pending approvals
const pendingApprovals = [
  {
    id: 1,
    agent: 'Sarah Johnson',
    avatar: 'https://i.pravatar.cc/150?img=1',
    task: 'Review Zoning - Sandton',
    badge: 'Design',
    badgeVariant: 'lavender' as const,
  },
  {
    id: 2,
    agent: 'Michael Chen',
    avatar: 'https://i.pravatar.cc/150?img=2',
    task: 'Property Inspection - Cape Town',
    badge: 'Screening',
    badgeVariant: 'mint' as const,
  },
  {
    id: 3,
    agent: 'Amara Nkosi',
    avatar: 'https://i.pravatar.cc/150?img=3',
    task: 'Document Verification - Durban',
    badge: 'Legal',
    badgeVariant: 'sky' as const,
  },
];

// Mock recent leads
const recentLeads = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
    title: 'Modern Villa in Sandton',
    price: 4500000,
    status: 'Active',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    title: 'Luxury Apartment - V&A Waterfront',
    price: 3200000,
    status: 'Active',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400',
    title: 'Family Home in Pretoria East',
    price: 2800000,
    status: 'Pending',
  },
];

export default function CommandCenterOverview() {
  return (
    <div className="min-h-screen bg-[#F4F7FA] p-8 pl-32">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-bold text-slate-800 mb-2">Command Center</h1>
          <p className="text-slate-400 text-lg">Your property empire at a glance</p>
        </motion.div>

        {/* Top KPI Area - Free-standing Typography */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-8 mb-12"
        >
          <div>
            <p className="text-slate-400 text-sm mb-2">Total Revenue</p>
            <p className="text-4xl font-bold text-slate-800">R 1,245,680</p>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-600 text-sm font-medium">+12.5%</span>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-2">Total Income</p>
            <p className="text-4xl font-bold text-slate-800">R 892,340</p>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-600 text-sm font-medium">+8.3%</span>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-2">Active Listings</p>
            <p className="text-4xl font-bold text-slate-800">1,247</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-2">Pending Approvals</p>
            <p className="text-4xl font-bold text-slate-800">23</p>
          </div>
        </motion.div>

        {/* Hero Analytics Layer with Overlapping House */}
        <div className="grid grid-cols-3 gap-8 mb-8">
          {/* Analytics Chart - Spans 2 columns */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-2 relative z-10"
          >
            <GlassCard className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Quick Analytics</h3>
                  <p className="text-slate-400 text-sm">Revenue trends over time</p>
                </div>
                <PastelBadge variant="mint">Last 6 Months</PastelBadge>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>

          {/* Pending Approvals Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            <GlassCard className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Pending Approvals</h3>
              <div className="space-y-4">
                {pendingApprovals.map(approval => (
                  <div key={approval.id} className="flex items-start gap-3">
                    <img
                      src={approval.avatar}
                      alt={approval.agent}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">{approval.agent}</p>
                      <p className="text-slate-500 text-xs">{approval.task}</p>
                      <PastelBadge variant={approval.badgeVariant} className="mt-1">
                        {approval.badge}
                      </PastelBadge>
                    </div>
                    <button className="text-emerald-600 hover:text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* House Image - Positioned to overlap */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute -bottom-20 -left-32 z-0 pointer-events-none"
            >
              <img
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop"
                alt="Modern Luxury House"
                className="w-96 h-64 object-cover rounded-[2rem] shadow-2xl opacity-20"
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Recent Leads Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-2xl font-bold text-slate-800 mb-6">Recent Leads</h3>
          <div className="grid grid-cols-3 gap-6">
            {recentLeads.map(lead => (
              <GlassCard key={lead.id} hover className="overflow-hidden">
                <img src={lead.image} alt={lead.title} className="w-full h-48 object-cover" />
                <div className="p-6">
                  <h4 className="font-bold text-slate-800 mb-2">{lead.title}</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-emerald-600">
                      R {lead.price.toLocaleString()}
                    </p>
                    <PastelBadge variant={lead.status === 'Active' ? 'mint' : 'apricot'}>
                      {lead.status}
                    </PastelBadge>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
