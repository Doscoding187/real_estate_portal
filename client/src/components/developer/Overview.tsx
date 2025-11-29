import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, Home, ClipboardList, DollarSign, Eye, Plus, Building2 } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { LeadCard } from '@/components/LeadCard';
import { TaskCard } from '@/components/TaskCard';
import { trpc } from '@/lib/trpc';
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
  // Fetch real data from API
  const { data: developerProfile } = trpc.developer.getProfile.useQuery();
  const { data: developments } = trpc.developer.listDevelopments.useQuery();
  const { data: leads } = trpc.developer.listLeads.useQuery();

  // Check if this is a new developer with no data
  const isNewDeveloper = !developments || developments.length === 0;

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
              Get started by creating your first development project. Add units, capture leads, and watch your business grow.
            </p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            size="lg" 
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 rounded-full px-8 py-6 text-base font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40"
          >
            <Plus className="w-5 h-5" />
            Create Your First Development
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="rounded-full px-8 py-6 text-base font-semibold border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300"
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
                  description: 'Add your property development project with details, location, and images',
                  gradient: 'from-blue-500 to-blue-600'
                },
                {
                  number: 2,
                  title: 'Add Units',
                  description: 'Define your available units with pricing, floor plans, and specifications',
                  gradient: 'from-indigo-500 to-indigo-600'
                },
                {
                  number: 3,
                  title: 'Capture Leads',
                  description: 'Use the affordability calculator to qualify buyers and capture high-quality leads',
                  gradient: 'from-purple-500 to-purple-600'
                },
                {
                  number: 4,
                  title: 'Track Performance',
                  description: 'Monitor your leads, conversions, and sales analytics in real-time',
                  gradient: 'from-pink-500 to-pink-600'
                }
              ].map((step) => (
                <div key={step.number} className="flex items-start gap-5 group">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center font-bold text-white text-lg flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {step.number}
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-bold text-lg text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
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
  const totalLeads = leads?.length || 0;
  const qualifiedLeads = leads?.filter(l => l.qualificationStatus === 'qualified').length || 0;

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Developments"
          value={totalDevelopments.toString()}
          change={totalDevelopments > 0 ? `${totalDevelopments} active` : 'No developments yet'}
          changeType={totalDevelopments > 0 ? 'positive' : 'neutral'}
          icon={Home}
        />
        <MetricCard
          title="Total Leads"
          value={totalLeads.toString()}
          change={totalLeads > 0 ? `${qualifiedLeads} qualified` : 'No leads yet'}
          changeType={totalLeads > 0 ? 'positive' : 'neutral'}
          icon={Users}
        />
        <MetricCard
          title="Qualified Leads"
          value={qualifiedLeads.toString()}
          change={totalLeads > 0 ? `${Math.round((qualifiedLeads / totalLeads) * 100)}% qualification rate` : 'Start capturing leads'}
          changeType={qualifiedLeads > 0 ? 'positive' : 'neutral'}
          icon={TrendingUp}
        />
        <MetricCard
          title="Units Available"
          value="0"
          change="Add units to your developments"
          changeType="neutral"
          icon={Building2}
        />
      </div>

      {/* Recent Leads */}
      {leads && leads.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="typ-h3">Recent Leads</h2>
            <Button variant="outline" size="sm">
              View All Leads
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.slice(0, 6).map((lead) => (
              <Card key={lead.id} className="card">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{lead.name}</h3>
                    <p className="text-sm text-slate-600">{lead.email}</p>
                    <p className="text-sm text-slate-600">{lead.phone}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        lead.qualificationStatus === 'qualified' ? 'bg-green-100 text-green-700' :
                        lead.qualificationStatus === 'partially_qualified' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {lead.qualificationStatus}
                      </span>
                      <span className="text-xs text-slate-500">
                        Score: {lead.qualificationScore}/100
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="card">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Users className="w-16 h-16 mx-auto text-slate-300" />
              <div>
                <h3 className="text-lg font-semibold text-slate-800">No Leads Yet</h3>
                <p className="text-slate-600">Start capturing leads with the affordability calculator</p>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Capture Your First Lead
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
