import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Home,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  Settings,
  Plus,
  Eye,
  MapPin,
  Bed,
  Square,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function PropertyDeveloperDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

  // Fetch developer dashboard data using existing TRPC endpoints
  const { data: properties, isLoading: propertiesLoading } =
    trpc.properties.myProperties.useQuery();

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

  // Redirect if not authenticated or not a property developer
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (user?.role !== 'agency_admin') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Developer Dashboard</h1>
          <Badge variant="secondary">Property Developer</Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Projects</CardDescription>
              <CardTitle className="text-3xl">0</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Listings</CardDescription>
              <CardTitle className="text-3xl">{properties?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Team Members</CardDescription>
              <CardTitle className="text-3xl">0</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Views</CardDescription>
              <CardTitle className="text-3xl">0</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Active Projects
                  </CardTitle>
                  <CardDescription>Currently active development projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No active projects.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Recent Listings
                  </CardTitle>
                  <CardDescription>Recently added property listings</CardDescription>
                </CardHeader>
                <CardContent>
                  {propertiesLoading ? (
                    <p className="text-muted-foreground">Loading listings...</p>
                  ) : (properties?.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground">No listings yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {properties!.slice(0, 3).map((listing: any) => (
                        <li
                          key={listing.id}
                          className="flex items-center justify-between border-b pb-2"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{listing.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {listing.city}, {listing.province}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/property/${listing.id}`)}
                          >
                            View
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Development Projects</h2>
              <Button onClick={() => setLocation('/developer/create-project')}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>

            <Card>
              <CardContent className="py-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  You haven't created any development projects yet.
                </p>
                <Button className="mt-4" onClick={() => setLocation('/developer/create-project')}>
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Property Listings</h2>
              <Button onClick={() => setLocation('/developer/create-listing')}>
                <Plus className="h-4 w-4 mr-2" />
                New Listing
              </Button>
            </div>

            {propertiesLoading ? (
              <p className="text-muted-foreground">Loading listings...</p>
            ) : (properties?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    You haven't created any property listings yet.
                  </p>
                  <Button className="mt-4" onClick={() => setLocation('/developer/create-listing')}>
                    Create Your First Listing
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties!.map((listing: any) => (
                  <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">{listing.title}</h3>
                        <Badge variant="outline">{listing.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {listing.city}, {listing.province}
                      </div>
                      <div className="text-lg font-bold text-primary mb-2">
                        R {listing.price?.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        {listing.bedrooms && (
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            {listing.bedrooms}
                          </div>
                        )}
                        {listing.area && (
                          <div className="flex items-center gap-1">
                            <Square className="h-4 w-4" />
                            {listing.area}m²
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {listing.views || 0} views
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setLocation(`/property/${listing.id}`)}
                        >
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Development Team</h2>
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Invite Team Member
              </Button>
            </div>

            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">You haven't added any team members yet.</p>
                <Button className="mt-4">Invite Team Member</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Performance Analytics</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Project Performance
                  </CardTitle>
                  <CardDescription>Overall project metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Completion Rate</span>
                        <span className="text-sm font-medium">75%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">On-time Delivery</span>
                        <span className="text-sm font-medium">82%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: '82%' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue Overview
                  </CardTitle>
                  <CardDescription>Financial performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Revenue</span>
                      <span className="font-bold">R 12,500,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Properties Sold</span>
                      <span className="font-bold">24</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg. Sale Price</span>
                      <span className="font-bold">R 520,833</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Milestones
                  </CardTitle>
                  <CardDescription>Key project dates</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Project A Completion</div>
                        <div className="text-sm text-muted-foreground">June 15, 2024</div>
                      </div>
                      <Badge variant="secondary">In Progress</Badge>
                    </li>
                    <li className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Project B Launch</div>
                        <div className="text-sm text-muted-foreground">August 30, 2024</div>
                      </div>
                      <Badge variant="outline">Planning</Badge>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
