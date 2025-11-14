import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Users,
  Building2,
  Activity,
  ArrowRight,
  TrendingUp,
  Eye,
  DollarSign,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

  console.log('[AdminDashboard] Rendering...');
  console.log('[AdminDashboard] loading:', loading);
  console.log('[AdminDashboard] isAuthenticated:', isAuthenticated);
  console.log('[AdminDashboard] user:', user);
  console.log('[AdminDashboard] user.role:', user?.role);

  const isAdmin = isAuthenticated && user?.role === 'super_admin';

  const { data: analytics, isLoading: analyticsLoading } = trpc.admin.getAnalytics.useQuery(
    undefined,
    { enabled: isAdmin },
  );
  const { data: listingStats } = trpc.admin.getListingStats.useQuery(undefined, {
    enabled: isAdmin,
  });

  // Get the TRPC utils to access the me query
  const utils = trpc.useUtils();
  const meQuery = utils.auth.me.getData();

  console.log('[AdminDashboard] Rendering...');
  console.log('[AdminDashboard] loading:', loading);
  console.log('[AdminDashboard] isAuthenticated:', isAuthenticated);
  console.log('[AdminDashboard] user:', user);
  console.log('[AdminDashboard] user.role:', user?.role);

  // Debug: Check if TRPC auth.me is working
  console.log('[AdminDashboard] TRPC meQuery data:', meQuery);

  // Wait for auth to load
  if (loading) {
    console.log('[AdminDashboard] Auth still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not super_admin
  if (!isAuthenticated) {
    console.log('[AdminDashboard] Not authenticated, redirecting to /login');
    setLocation('/login');
    return null;
  }

  if (user?.role !== 'super_admin') {
    console.log(
      '[AdminDashboard] Not super_admin (role is',
      user?.role,
      '), redirecting to /dashboard',
    );
    setLocation('/dashboard');
    return null;
  }

  console.log('[AdminDashboard] Access granted, rendering dashboard');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
            <Badge variant="destructive" className="ml-2">
              Super Admin
            </Badge>
          </div>
          <p className="text-muted-foreground">Welcome back, {user?.name || user?.email}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{analytics?.userGrowth || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agencies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalAgencies || 0}</div>
              <p className="text-xs text-muted-foreground">Real estate companies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.activeProperties || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{analytics?.propertyGrowth || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R{analytics?.monthlyRevenue?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Listing Status Overview</CardTitle>
              <CardDescription>Current distribution of property listings</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Active', value: listingStats?.approved || 0, fill: '#22c55e' },
                    { name: 'Pending', value: listingStats?.pending || 0, fill: '#f59e0b' },
                    { name: 'Rejected', value: listingStats?.rejected || 0, fill: '#ef4444' },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Growth Trends</CardTitle>
              <CardDescription>Monthly growth in users and properties</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={[
                    { name: 'Users', value: analytics?.userGrowth || 0, color: '#3b82f6' },
                    { name: 'Properties', value: analytics?.propertyGrowth || 0, color: '#10b981' },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Super admin management tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="justify-between h-auto py-4"
                onClick={() => setLocation('/admin/agencies')}
              >
                <div className="text-left">
                  <div className="font-semibold">Manage Agencies</div>
                  <div className="text-sm text-muted-foreground">View and manage all agencies</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="justify-between h-auto py-4"
                onClick={() => setLocation('/admin/users')}
              >
                <div className="text-left">
                  <div className="font-semibold">User Management</div>
                  <div className="text-sm text-muted-foreground">Manage user accounts</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="justify-between h-auto py-4"
                onClick={() => setLocation('/admin/audit-logs')}
              >
                <div className="text-left">
                  <div className="font-semibold">Audit Logs</div>
                  <div className="text-sm text-muted-foreground">View admin actions</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="justify-between h-auto py-4"
                onClick={() => setLocation('/admin/listings')}
              >
                <div className="text-left">
                  <div className="font-semibold">Listing Oversight</div>
                  <div className="text-sm text-muted-foreground">Moderate property listings</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="justify-between h-auto py-4"
                onClick={() => setLocation('/admin/subscriptions')}
              >
                <div className="text-left">
                  <div className="font-semibold">Subscriptions</div>
                  <div className="text-sm text-muted-foreground">Manage plans & billing</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="justify-between h-auto py-4"
                onClick={() => setLocation('/admin/settings')}
              >
                <div className="text-left">
                  <div className="font-semibold">Platform Settings</div>
                  <div className="text-sm text-muted-foreground">Configure global settings</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
