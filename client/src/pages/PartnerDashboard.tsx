/**
 * Partner Dashboard Page
 * 
 * Comprehensive dashboard for partners showing:
 * - Analytics overview with key metrics
 * - Performance trends and charts
 * - Content list with performance data
 * - Lead management interface
 * - Boost campaign ROI metrics
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  Eye, 
  Users, 
  DollarSign,
  Calendar,
  Filter,
  Download,
  Plus,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  MessageSquare,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Types from the analytics service
interface PartnerAnalyticsSummary {
  totalViews: number;
  engagementRate: number;
  leadConversions: number;
  totalLeads: number;
  totalContent: number;
  averageQualityScore: number;
}

interface TrendData {
  date: string;
  views: number;
  engagements: number;
  leads: number;
}

interface ContentPerformance {
  contentId: string;
  title: string;
  type: 'video' | 'card' | 'short';
  views: number;
  engagements: number;
  engagementRate: number;
  qualityScore: number;
  createdAt: Date;
}

interface Lead {
  id: string;
  type: 'quote_request' | 'consultation' | 'eligibility_check';
  status: 'new' | 'contacted' | 'converted' | 'disputed' | 'refunded';
  price: number;
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  intentDetails?: string;
  createdAt: string;
}

interface BoostROI {
  campaignId: string;
  campaignName: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  leads: number;
  roi: number;
}

interface DashboardData {
  summary: PartnerAnalyticsSummary;
  trends: TrendData[];
  topContent: ContentPerformance[];
  boostROI: BoostROI[];
}

// Mock partner ID - in real app this would come from auth context
const PARTNER_ID = 'partner-123';

function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: string; 
  change?: string; 
  icon: React.ElementType; 
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-green-500" />}
            {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsOverview({ data }: { data: DashboardData }) {
  const chartConfig = {
    views: {
      label: 'Views',
      color: 'hsl(var(--chart-1))',
    },
    engagements: {
      label: 'Engagements',
      color: 'hsl(var(--chart-2))',
    },
    leads: {
      label: 'Leads',
      color: 'hsl(var(--chart-3))',
    },
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics - Requirement 13.1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Views"
          value={data.summary.totalViews.toLocaleString()}
          change="+12% from last month"
          trend="up"
          icon={Eye}
        />
        <MetricCard
          title="Engagement Rate"
          value={`${data.summary.engagementRate.toFixed(1)}%`}
          change="+2.1% from last month"
          trend="up"
          icon={TrendingUp}
        />
        <MetricCard
          title="Total Leads"
          value={data.summary.totalLeads.toString()}
          change="+8 from last month"
          trend="up"
          icon={Users}
        />
        <MetricCard
          title="Lead Conversions"
          value={data.summary.leadConversions.toString()}
          change="+3 from last month"
          trend="up"
          icon={DollarSign}
        />
      </div>

      {/* Performance Trends Chart - Requirement 13.2 */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>
            Your content performance over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={data.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="views" 
                stroke="var(--color-views)" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="engagements" 
                stroke="var(--color-engagements)" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="leads" 
                stroke="var(--color-leads)" 
                strokeWidth={2}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Quality Score and Content Count */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Content Quality</CardTitle>
            <CardDescription>Average quality score across all content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-3xl font-bold">
                {data.summary.averageQualityScore.toFixed(0)}
              </div>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= data.summary.averageQualityScore / 20
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Based on engagement, metadata completeness, and user feedback
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Library</CardTitle>
            <CardDescription>Total published content pieces</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.summary.totalContent}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Across videos, cards, and shorts
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ContentList({ data }: { data: ContentPerformance[] }) {
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'short': return '📱';
      case 'card': return '📄';
      default: return '📄';
    }
  };

  const getQualityBadge = (score: number) => {
    if (score >= 80) return <Badge variant="default" className="bg-green-500">Excellent</Badge>;
    if (score >= 60) return <Badge variant="secondary">Good</Badge>;
    if (score >= 40) return <Badge variant="outline">Fair</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Top Performing Content</CardTitle>
            <CardDescription>Your best content ranked by engagement</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Content
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Engagement Rate</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((content) => (
              <TableRow key={content.contentId}>
                <TableCell>
                  <div className="font-medium">{content.title}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{getContentTypeIcon(content.type)}</span>
                    <span className="capitalize">{content.type}</span>
                  </div>
                </TableCell>
                <TableCell>{content.views.toLocaleString()}</TableCell>
                <TableCell>{content.engagementRate.toFixed(1)}%</TableCell>
                <TableCell>{getQualityBadge(content.qualityScore)}</TableCell>
                <TableCell>
                  {new Date(content.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit Content</DropdownMenuItem>
                      <DropdownMenuItem>Boost Content</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LeadManagement() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch leads for the partner
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['partner-leads', PARTNER_ID, statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      
      const response = await fetch(`/api/partner-leads/partner/${PARTNER_ID}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      const result = await response.json();
      return result.leads || [];
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'contacted': return <MessageSquare className="h-4 w-4 text-yellow-500" />;
      case 'converted': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disputed': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'refunded': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge variant="secondary">New</Badge>;
      case 'contacted': return <Badge variant="outline">Contacted</Badge>;
      case 'converted': return <Badge variant="default" className="bg-green-500">Converted</Badge>;
      case 'disputed': return <Badge variant="destructive">Disputed</Badge>;
      case 'refunded': return <Badge variant="destructive">Refunded</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getLeadTypeLabel = (type: string) => {
    switch (type) {
      case 'quote_request': return 'Quote Request';
      case 'consultation': return 'Consultation';
      case 'eligibility_check': return 'Eligibility Check';
      default: return type;
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/partner-leads/${leadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) throw new Error('Failed to update lead status');
      
      // Refetch leads
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lead Management</CardTitle>
            <CardDescription>Manage and track your leads</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="quote_request">Quote Request</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="eligibility_check">Eligibility Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No leads found matching your filters
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.contactInfo.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {lead.contactInfo.email}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {lead.contactInfo.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getLeadTypeLabel(lead.type)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(lead.status)}
                      {getStatusBadge(lead.status)}
                    </div>
                  </TableCell>
                  <TableCell>R{lead.price.toFixed(0)}</TableCell>
                  <TableCell>
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {lead.status === 'new' && (
                          <DropdownMenuItem 
                            onClick={() => updateLeadStatus(lead.id, 'contacted')}
                          >
                            Mark as Contacted
                          </DropdownMenuItem>
                        )}
                        {lead.status === 'contacted' && (
                          <DropdownMenuItem 
                            onClick={() => updateLeadStatus(lead.id, 'converted')}
                          >
                            Mark as Converted
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Contact Customer</DropdownMenuItem>
                        {['new', 'contacted'].includes(lead.status) && (
                          <DropdownMenuItem className="text-red-600">
                            Dispute Lead
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function BoostCampaigns({ data }: { data: BoostROI[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Boost Campaign Performance</CardTitle>
            <CardDescription>ROI metrics for your boost campaigns</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No boost campaigns yet. Create your first campaign to increase content visibility.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((campaign) => (
                <TableRow key={campaign.campaignId}>
                  <TableCell>
                    <div className="font-medium">{campaign.campaignName}</div>
                  </TableCell>
                  <TableCell>R{campaign.budget.toFixed(0)}</TableCell>
                  <TableCell>R{campaign.spent.toFixed(0)}</TableCell>
                  <TableCell>{campaign.impressions.toLocaleString()}</TableCell>
                  <TableCell>{campaign.clicks.toLocaleString()}</TableCell>
                  <TableCell>{campaign.leads}</TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-1 ${
                      campaign.roi >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {campaign.roi >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {campaign.roi.toFixed(1)}%
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function PartnerDashboard() {
  const [dateRange, setDateRange] = useState('30d');

  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }
    
    return { start, end };
  };

  const { start, end } = getDateRange();

  // Fetch dashboard data
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['partner-dashboard', PARTNER_ID, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: dateRange === '7d' ? 'daily' : 'weekly',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      
      const response = await fetch(`/api/partner-analytics/${PARTNER_ID}/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const result = await response.json();
      return result.data;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          Failed to load dashboard data. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Partner Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your content performance and manage leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AnalyticsOverview data={data} />
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <ContentList data={data.topContent} />
        </TabsContent>

        <TabsContent value="leads" className="space-y-6">
          <LeadManagement />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <BoostCampaigns data={data.boostROI} />
        </TabsContent>
      </Tabs>
    </div>
  );
}