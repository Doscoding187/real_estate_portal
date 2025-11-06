import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Home,
  Calendar,
  DollarSign,
  TrendingUp,
  Phone,
  Mail,
  Eye,
  MapPin,
  Bed,
  Square,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Share2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function AgentDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [selectedLeadStatus, setSelectedLeadStatus] = useState<string>('all');
  const [selectedListingStatus, setSelectedListingStatus] = useState<string>('all');
  const [selectedShowingStatus, setSelectedShowingStatus] = useState<string>('all');
  const [selectedCommissionStatus, setSelectedCommissionStatus] = useState<string>('all');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>(
    'month',
  );
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({
    min: 0,
    max: 100000000,
  });

  const utils = trpc.useUtils();

  // Queries
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = trpc.agent.getDashboardStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'agent',
    retry: false,
  });

  const { data: listings, isLoading: listingsLoading } = trpc.agent.getMyListings.useQuery(
    { status: selectedListingStatus as any, limit: 50, offset: 0 },
    { enabled: isAuthenticated && user?.role === 'agent', retry: false },
  );

  const { data: leads, isLoading: leadsLoading } = trpc.agent.getMyLeads.useQuery(
    { status: selectedLeadStatus as any, limit: 100 },
    { enabled: isAuthenticated && user?.role === 'agent', retry: false },
  );

  const { data: showings, isLoading: showingsLoading } = trpc.agent.getMyShowings.useQuery(
    { status: selectedShowingStatus as any },
    { enabled: isAuthenticated && user?.role === 'agent', retry: false },
  );

  const { data: commissions, isLoading: commissionsLoading } = trpc.agent.getMyCommissions.useQuery(
    { status: selectedCommissionStatus as any },
    { enabled: isAuthenticated && user?.role === 'agent', retry: false },
  );

  const { data: analytics, isLoading: analyticsLoading } =
    trpc.agent.getPerformanceAnalytics.useQuery(
      { period: analyticsPeriod },
      { enabled: isAuthenticated && user?.role === 'agent', retry: false },
    );

  // Mutations
  const updateLeadStatusMutation = trpc.agent.updateLeadStatus.useMutation({
    onSuccess: () => {
      toast.success('Lead status updated');
      utils.agent.getMyLeads.invalidate();
      utils.agent.getDashboardStats.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to update lead status');
    },
  });

  const updateShowingStatusMutation = trpc.agent.updateShowingStatus.useMutation({
    onSuccess: () => {
      toast.success('Showing status updated');
      utils.agent.getMyShowings.invalidate();
      utils.agent.getDashboardStats.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to update showing status');
    },
  });

  // Show loading spinner while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not agent
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (user?.role !== 'agent') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Agent Dashboard</h1>
          <Badge variant="secondary">Agent</Badge>
        </div>

        {statsError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            Failed to load dashboard stats. Please try again.
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Home className="h-4 w-4" />
                Active Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '—' : (stats?.activeListings ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                New Leads (7d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '—' : (stats?.newLeadsThisWeek ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Showings Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '—' : (stats?.showingsToday ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Offers In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '—' : (stats?.offersInProgress ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pending Commissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading
                  ? '—'
                  : `R ${((stats?.commissionsPending ?? 0) / 100).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="leads">Leads & CRM</TabsTrigger>
            <TabsTrigger value="showings">Calendar</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  {leadsLoading ? (
                    <p className="text-muted-foreground">Loading leads...</p>
                  ) : (leads?.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground">No leads found.</p>
                  ) : (
                    <ul className="space-y-3">
                      {leads!.slice(0, 5).map((l: any) => (
                        <li key={l.id} className="flex items-center justify-between border-b pb-2">
                          <div className="flex-1">
                            <div className="font-medium">{l.name || l.email || 'Lead'}</div>
                            <div className="text-sm text-muted-foreground">
                              {l.property ? `${l.property.title}` : 'No property'}
                            </div>
                          </div>
                          <Badge variant="outline">{l.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Showings</CardTitle>
                </CardHeader>
                <CardContent>
                  {showingsLoading ? (
                    <p className="text-muted-foreground">Loading showings...</p>
                  ) : (showings?.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground">No upcoming showings.</p>
                  ) : (
                    <ul className="space-y-3">
                      {showings!.slice(0, 5).map((s: any) => (
                        <li key={s.id} className="flex items-center justify-between border-b pb-2">
                          <div className="flex-1">
                            <div className="font-medium">
                              {s.property ? s.property.title : 'Property'}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(s.scheduledAt).toLocaleString()}
                            </div>
                          </div>
                          <Badge variant="outline">{s.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">My Listings</h2>
              <Button onClick={() => setLocation('/submit-property')} className="gap-2">
                <Plus className="h-4 w-4" />
                Add New Listing
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedListingStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedListingStatus('all')}
                >
                  All
                </Button>
                <Button
                  variant={selectedListingStatus === 'available' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedListingStatus('available')}
                >
                  Available
                </Button>
                <Button
                  variant={selectedListingStatus === 'published' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedListingStatus('published')}
                >
                  Published
                </Button>
                <Button
                  variant={selectedListingStatus === 'draft' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedListingStatus('draft')}
                >
                  Draft
                </Button>
                <Button
                  variant={selectedListingStatus === 'sold' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedListingStatus('sold')}
                >
                  Sold
                </Button>
                <Button
                  variant={selectedListingStatus === 'rented' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedListingStatus('rented')}
                >
                  Rented
                </Button>
                <Button
                  variant={selectedListingStatus === 'archived' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedListingStatus('archived')}
                >
                  Archived
                </Button>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">Price Range:</span>
                <select
                  className="px-3 py-1 border rounded-md text-sm"
                  onChange={e => {
                    const range = e.target.value.split('-');
                    if (range.length === 2) {
                      setPriceRange({ min: parseInt(range[0]), max: parseInt(range[1]) });
                    } else {
                      setPriceRange({ min: 0, max: 100000000 });
                    }
                  }}
                >
                  <option value="0-100000000">All Prices</option>
                  <option value="0-1000000">Under R1M</option>
                  <option value="1000000-3000000">R1M - R3M</option>
                  <option value="3000000-5000000">R3M - R5M</option>
                  <option value="5000000-10000000">R5M - R10M</option>
                  <option value="10000000-100000000">Above R10M</option>
                </select>
              </div>
            </div>

            {listingsLoading ? (
              <p className="text-muted-foreground">Loading listings...</p>
            ) : (listings?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No listings found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings!
                  .filter(p => {
                    const price = typeof p.price === 'number' ? p.price : parseInt(String(p.price));
                    return price >= priceRange.min && price <= priceRange.max;
                  })
                  .map(p => {
                    const daysSinceUpdate = p.updatedAt
                      ? Math.floor(
                          (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
                        )
                      : 0;
                    const lowEngagement =
                      daysSinceUpdate > 14 && (p.views || 0) < 10 && (p.enquiries || 0) === 0;

                    return (
                      <Card key={p.id} className="relative hover:shadow-lg transition-shadow">
                        {lowEngagement && (
                          <div className="absolute top-2 left-2 z-10">
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Low Engagement
                            </Badge>
                          </div>
                        )}
                        {p.primaryImage && (
                          <div
                            className="aspect-video relative overflow-hidden rounded-t-lg cursor-pointer"
                            onClick={() => setLocation(`/property/${p.id}`)}
                          >
                            <img
                              src={p.primaryImage}
                              alt={p.title}
                              className="w-full h-full object-cover"
                            />
                            <Badge className="absolute top-2 right-2">{p.status}</Badge>
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <CardTitle
                            className="text-lg cursor-pointer hover:text-primary"
                            onClick={() => setLocation(`/property/${p.id}`)}
                          >
                            {p.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {p.city}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-xl font-bold text-primary">
                            R {typeof p.price === 'number' ? p.price.toLocaleString() : p.price}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {p.bedrooms && (
                              <div className="flex items-center gap-1">
                                <Bed className="h-4 w-4" />
                                {p.bedrooms}
                              </div>
                            )}
                            {p.area && (
                              <div className="flex items-center gap-1">
                                <Square className="h-4 w-4" />
                                {p.area}m²
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {p.views || 0}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {p.enquiries || 0}
                            </div>
                          </div>
                          {p.updatedAt && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Updated {new Date(p.updatedAt).toLocaleDateString()}
                            </div>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={e => {
                                e.stopPropagation();
                                setLocation(`/edit-property/${p.id}`);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={e => {
                                e.stopPropagation();
                                const url = `${window.location.origin}/property/${p.id}`;
                                navigator.clipboard.writeText(url);
                                toast.success('Link copied to clipboard!');
                              }}
                            >
                              <Share2 className="h-3 w-3 mr-1" />
                              Share
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={e => {
                                e.stopPropagation();
                                window.open(`/property/${p.id}`, '_blank');
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* Leads & CRM Tab */}
          <TabsContent value="leads" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Leads & CRM</h2>
              <div className="flex gap-2">
                <Button
                  variant={selectedLeadStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLeadStatus('all')}
                >
                  All
                </Button>
                <Button
                  variant={selectedLeadStatus === 'new' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLeadStatus('new')}
                >
                  New
                </Button>
                <Button
                  variant={selectedLeadStatus === 'contacted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLeadStatus('contacted')}
                >
                  Contacted
                </Button>
                <Button
                  variant={selectedLeadStatus === 'qualified' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLeadStatus('qualified')}
                >
                  Qualified
                </Button>
                <Button
                  variant={selectedLeadStatus === 'converted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLeadStatus('converted')}
                >
                  Converted
                </Button>
                <Button
                  variant={selectedLeadStatus === 'viewing_scheduled' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLeadStatus('viewing_scheduled')}
                >
                  Viewing Scheduled
                </Button>
                <Button
                  variant={selectedLeadStatus === 'offer_sent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLeadStatus('offer_sent')}
                >
                  Offer Sent
                </Button>
                <Button
                  variant={selectedLeadStatus === 'lost' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLeadStatus('lost')}
                >
                  Lost
                </Button>
              </div>
            </div>

            {leadsLoading ? (
              <p className="text-muted-foreground">Loading leads...</p>
            ) : (leads?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No leads found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {leads!.map((l: any) => (
                  <Card key={l.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{l.name || 'Unnamed Lead'}</h3>
                            <Badge variant="outline">{l.status}</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {l.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {l.email}
                              </div>
                            )}
                            {l.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {l.phone}
                              </div>
                            )}
                            {l.property && (
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                {l.property.title} • {l.property.city} • R{' '}
                                {typeof l.property.price === 'number'
                                  ? l.property.price.toLocaleString()
                                  : l.property.price}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Created {new Date(l.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          {l.message && <p className="mt-2 text-sm italic">"{l.message}"</p>}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (l.status !== 'contacted') {
                                updateLeadStatusMutation.mutate({
                                  leadId: l.id,
                                  status: 'contacted',
                                  notes: 'Marked as contacted',
                                });
                              }
                            }}
                            disabled={
                              l.status === 'contacted' || updateLeadStatusMutation.isPending
                            }
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Contacted
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (l.status !== 'qualified') {
                                updateLeadStatusMutation.mutate({
                                  leadId: l.id,
                                  status: 'qualified',
                                  notes: 'Marked as qualified',
                                });
                              }
                            }}
                            disabled={
                              l.status === 'qualified' || updateLeadStatusMutation.isPending
                            }
                          >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Qualified
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (l.status !== 'converted') {
                                updateLeadStatusMutation.mutate({
                                  leadId: l.id,
                                  status: 'converted',
                                  notes: 'Marked as converted',
                                });
                              }
                            }}
                            disabled={
                              l.status === 'converted' || updateLeadStatusMutation.isPending
                            }
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Converted
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Calendar/Showings Tab */}
          <TabsContent value="showings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Showings Calendar</h2>
              <div className="flex gap-2">
                <Button
                  variant={selectedShowingStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedShowingStatus('all')}
                >
                  All
                </Button>
                <Button
                  variant={selectedShowingStatus === 'requested' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedShowingStatus('requested')}
                >
                  Requested
                </Button>
                <Button
                  variant={selectedShowingStatus === 'confirmed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedShowingStatus('confirmed')}
                >
                  Confirmed
                </Button>
                <Button
                  variant={selectedShowingStatus === 'completed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedShowingStatus('completed')}
                >
                  Completed
                </Button>
              </div>
            </div>

            {showingsLoading ? (
              <p className="text-muted-foreground">Loading showings...</p>
            ) : (showings?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No showings scheduled.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {showings!.map((s: any) => (
                  <Card key={s.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              {s.property ? s.property.title : 'Property'}
                            </h3>
                            <Badge variant="outline">{s.status}</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {new Date(s.scheduledAt).toLocaleString()}
                            </div>
                            {s.property?.address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {s.property.address}, {s.property.city}
                              </div>
                            )}
                            {s.client?.name && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {s.client.name}
                                {s.client.email && ` • ${s.client.email}`}
                              </div>
                            )}
                          </div>
                          {s.notes && <p className="mt-2 text-sm italic">{s.notes}</p>}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (s.status !== 'confirmed') {
                                updateShowingStatusMutation.mutate({
                                  showingId: s.id,
                                  status: 'confirmed',
                                  notes: 'Confirmed by agent',
                                });
                              }
                            }}
                            disabled={
                              s.status === 'confirmed' || updateShowingStatusMutation.isPending
                            }
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (s.status !== 'completed') {
                                updateShowingStatusMutation.mutate({
                                  showingId: s.id,
                                  status: 'completed',
                                  notes: 'Showing completed',
                                });
                              }
                            }}
                            disabled={
                              s.status === 'completed' || updateShowingStatusMutation.isPending
                            }
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (s.status !== 'cancelled') {
                                updateShowingStatusMutation.mutate({
                                  showingId: s.id,
                                  status: 'cancelled',
                                  notes: 'Cancelled by agent',
                                });
                              }
                            }}
                            disabled={
                              s.status === 'cancelled' || updateShowingStatusMutation.isPending
                            }
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Commission Tracker</h2>
              <div className="flex gap-2">
                <Button
                  variant={selectedCommissionStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCommissionStatus('all')}
                >
                  All
                </Button>
                <Button
                  variant={selectedCommissionStatus === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCommissionStatus('pending')}
                >
                  Pending
                </Button>
                <Button
                  variant={selectedCommissionStatus === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCommissionStatus('approved')}
                >
                  Approved
                </Button>
                <Button
                  variant={selectedCommissionStatus === 'paid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCommissionStatus('paid')}
                >
                  Paid
                </Button>
              </div>
            </div>

            {commissionsLoading ? (
              <p className="text-muted-foreground">Loading commissions...</p>
            ) : (commissions?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No commissions found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {commissions!.map((c: any) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              R{' '}
                              {((c.amount ?? 0) / 100).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </h3>
                            <Badge variant="outline">{c.status}</Badge>
                            <Badge variant="secondary">{c.transactionType}</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {c.property && (
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                {c.property.title}
                              </div>
                            )}
                            {c.client && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {c.client.name}
                              </div>
                            )}
                            {c.percentage && (
                              <div>Commission: {(c.percentage / 100).toFixed(2)}%</div>
                            )}
                            {c.payoutDate && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Payout: {new Date(c.payoutDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          {c.description && <p className="mt-2 text-sm">{c.description}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Performance Analytics</h2>
              <div className="flex gap-2">
                <Button
                  variant={analyticsPeriod === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalyticsPeriod('week')}
                >
                  Week
                </Button>
                <Button
                  variant={analyticsPeriod === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalyticsPeriod('month')}
                >
                  Month
                </Button>
                <Button
                  variant={analyticsPeriod === 'quarter' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalyticsPeriod('quarter')}
                >
                  Quarter
                </Button>
                <Button
                  variant={analyticsPeriod === 'year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalyticsPeriod('year')}
                >
                  Year
                </Button>
              </div>
            </div>

            {analyticsLoading ? (
              <p className="text-muted-foreground">Loading analytics...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Leads Contacted</CardTitle>
                    <CardDescription>Total leads in period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics?.leadsContacted ?? 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Properties Closed</CardTitle>
                    <CardDescription>Sales & rentals completed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics?.propertiesClosed ?? 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Conversion Rate</CardTitle>
                    <CardDescription>Lead to converted ratio</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analytics?.conversionRate ?? 0}%</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {analytics?.convertedLeads ?? 0} / {analytics?.totalLeads ?? 0} leads
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
