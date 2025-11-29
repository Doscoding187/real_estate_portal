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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-teal-600 rounded-full flex items-center justify-center">
            <Building2 className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Welcome to Your Dashboard!</h2>
          <p className="text-slate-600 text-lg">
            Get started by creating your first development project. Add units, capture leads, and watch your business grow.
          </p>
        </div>
        
        <div className="flex gap-4">
          <Button size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Create Your First Development
          </Button>
          <Button size="lg" variant="outline">
            View Documentation
          </Button>
        </div>

        {/* Quick Start Guide */}
        <Card className="w-full max-w-2xl mt-8">
          <CardHeader>
            <CardTitle>Quick Start Guide</CardTitle>
            <CardDescription>Follow these steps to get your developer account up and running</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Create a Development</h3>
                  <p className="text-sm text-slate-600">Add your property development project with details, location, and images</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Add Units</h3>
                  <p className="text-sm text-slate-600">Define your available units with pricing, floor plans, and specifications</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Capture Leads</h3>
                  <p className="text-sm text-slate-600">Use the affordability calculator to qualify buyers and capture high-quality leads</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Track Performance</h3>
                  <p className="text-sm text-slate-600">Monitor your leads, conversions, and sales analytics in real-time</p>
                </div>
              </div>
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
