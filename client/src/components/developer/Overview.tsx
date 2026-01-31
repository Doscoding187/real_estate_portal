import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Users,
  Home,
  ClipboardList,
  DollarSign,
  Eye,
  Plus,
  Building2,
} from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { LeadCard } from '@/components/LeadCard';
import { TaskCard } from '@/components/TaskCard';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { WelcomeHeader } from './WelcomeHeader';
import { KPIGrid } from './KPIGrid';
import { ActivityFeed } from './ActivityFeed';
import { QuickActions } from './QuickActions';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function Overview() {
  // Time range state for KPI filtering
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Fetch developer profile - now works with brand emulation for super admins
  const {
    data: developerProfile,
    isLoading: profileLoading,
    error: profileError,
  } = trpc.developer.getProfile.useQuery(undefined, {
    retry: false,
  });
  const {
    data: developments,
    isLoading: developmentsLoading,
    error: developmentsError,
  } = trpc.developer.getDevelopments.useQuery();

  // Check if this is a new developer with no data
  const isNewDeveloper = !developments || developments.length === 0;

  // Handle loading state
  if (profileLoading || developmentsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Handle error state
  if (profileError || developmentsError) {
    return (
      <Card className="card">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Unable to Load Dashboard</h3>
              <p className="text-slate-600">
                {profileError?.message ||
                  developmentsError?.message ||
                  'An error occurred while loading your dashboard'}
              </p>
            </div>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle missing developer profile - redirect to setup
  // Only show this if profile truly doesn't exist (not just pending verification)
  if (!developerProfile) {
    return (
      <Card className="card">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Complete Your Developer Profile
              </h3>
              <p className="text-slate-600">
                You need to complete your developer profile before accessing the dashboard.
              </p>
            </div>
            <Button onClick={() => (window.location.href = '/developer/setup')}>
              Complete Profile Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show pending verification message if profile exists but not verified/approved
  if (developerProfile && developerProfile.status === 'pending') {
    return (
      <Card className="card">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Profile Under Review</h3>
              <p className="text-slate-600">
                Your developer profile has been submitted and is currently under review by our admin
                team. You'll receive an email notification once your profile is approved.
              </p>
              <p className="text-sm text-slate-500 mt-2">This usually takes 1-2 business days.</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => (window.location.href = '/developer/setup')}>
                Edit Profile
              </Button>
              <Button onClick={() => window.location.reload()}>Refresh Status</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show rejection message if profile was rejected
  if (developerProfile && developerProfile.status === 'rejected') {
    return (
      <Card className="card">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Profile Rejected</h3>
              <p className="text-slate-600">
                Unfortunately, your developer profile was not approved.
              </p>
              {developerProfile.rejectionReason && (
                <p className="text-sm text-slate-600 mt-2 p-3 bg-red-50 rounded-lg">
                  <strong>Reason:</strong> {developerProfile.rejectionReason}
                </p>
              )}
            </div>
            <Button onClick={() => (window.location.href = '/developer/setup')}>
              Update and Resubmit Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state for new developers
  if (isNewDeveloper) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 px-4">
        <div className="text-center space-y-6 max-w-2xl">
          {/* Animated Icon */}
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl rotate-6 opacity-20 blur-xl animate-pulse"></div>
            <div className="relative w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 transform hover:scale-105 transition-transform duration-300">
              <Building2 className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Welcome Text */}
          <div className="space-y-3">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome to Your Dashboard!
            </h2>
            <p className="text-slate-600 text-lg md:text-xl leading-relaxed">
              Get started by creating your first development project. Add units, capture leads, and
              watch your business grow.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            size="lg"
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 rounded-full px-8 py-6 text-base font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40"
            onClick={() => (window.location.href = '/developer/create-development')}
          >
            <Plus className="w-5 h-5" />
            Create Your First Development
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full px-8 py-6 text-base font-semibold border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
            onClick={() => window.open('https://docs.example.com', '_blank')}
          >
            View Documentation
          </Button>
        </div>

        {/* Quick Start Guide */}
        <Card className="w-full max-w-3xl mt-8 border-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50 pb-6">
            <CardTitle className="text-2xl font-bold text-slate-800">Quick Start Guide</CardTitle>
            <CardDescription className="text-base text-slate-600">
              Follow these steps to get your developer account up and running
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {[
                {
                  number: 1,
                  title: 'Create a Development',
                  description:
                    'Add your property development project with details, location, and images',
                  gradient: 'from-blue-500 to-blue-600',
                },
                {
                  number: 2,
                  title: 'Add Units',
                  description:
                    'Define your available units with pricing, floor plans, and specifications',
                  gradient: 'from-indigo-500 to-indigo-600',
                },
                {
                  number: 3,
                  title: 'Capture Leads',
                  description:
                    'Use the affordability calculator to qualify buyers and capture high-quality leads',
                  gradient: 'from-purple-500 to-purple-600',
                },
                {
                  number: 4,
                  title: 'Track Performance',
                  description: 'Monitor your leads, conversions, and sales analytics in real-time',
                  gradient: 'from-pink-500 to-pink-600',
                },
              ].map(step => (
                <div key={step.number} className="flex items-start gap-5 group">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center font-bold text-white text-lg flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    {step.number}
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-bold text-lg text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate metrics from real data
  const totalDevelopments = developments?.length || 0;
  // Note: Lead stats will come from KPI service
  const totalLeads = 0;
  const qualifiedLeads = 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header with Time Range Selector */}
      <WelcomeHeader
        developerName={developerProfile?.name || 'Developer'}
        selectedTimeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* KPI Dashboard */}
      <KPIGrid timeRange={timeRange} />

      {/* Quick Actions Panel */}
      <QuickActions />

      {/* Activity Feed and Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>

        {/* Quick Stats Card */}
        <div className="space-y-4">
          <Card className="card">
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
              <CardDescription>Your portfolio at a glance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-slate-600">Developments</span>
                </div>
                <span className="font-semibold">{totalDevelopments}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-slate-600">Total Leads</span>
                </div>
                <span className="font-semibold">{totalLeads}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-slate-600">Qualified</span>
                </div>
                <span className="font-semibold">{qualifiedLeads}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-slate-600">Units</span>
                </div>
                <span className="font-semibold">0</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
