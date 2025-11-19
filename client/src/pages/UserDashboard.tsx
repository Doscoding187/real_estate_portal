import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Home,
  Heart,
  Eye,
  Calendar,
  MessageSquare,
  Search,
  Bell,
  Settings,
  User,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

  // Fetch user dashboard data using existing TRPC endpoints
  const { data: favorites, isLoading: favoritesLoading } = trpc.favorites.list.useQuery();

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

  // Redirect if not authenticated or not a regular user
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (user?.role !== 'visitor') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <Badge variant="secondary">User</Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Favorites</CardDescription>
              <CardTitle className="text-3xl">{favorites?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Recently Viewed</CardDescription>
              <CardTitle className="text-3xl">0</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Saved Searches</CardDescription>
              <CardTitle className="text-3xl">0</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Notifications</CardDescription>
              <CardTitle className="text-3xl">0</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="recent">Recently Viewed</TabsTrigger>
            <TabsTrigger value="searches">Saved Searches</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Favorite Properties
                  </CardTitle>
                  <CardDescription>Your saved properties</CardDescription>
                </CardHeader>
                <CardContent>
                  {favoritesLoading ? (
                    <p className="text-muted-foreground">Loading favorites...</p>
                  ) : (favorites?.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground">No favorites yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {favorites!.slice(0, 5).map((property: any) => (
                        <li
                          key={property.id}
                          className="flex items-center justify-between border-b pb-2"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{property.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {property.city}, {property.province}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/property/${property.id}`)}
                          >
                            View
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Recently Viewed
                  </CardTitle>
                  <CardDescription>Properties you've recently viewed</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No recently viewed properties.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">My Favorite Properties</h2>
            </div>

            {favoritesLoading ? (
              <p className="text-muted-foreground">Loading favorites...</p>
            ) : (favorites?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">You haven't favorited any properties yet.</p>
                  <Button className="mt-4" onClick={() => setLocation('/properties')}>
                    Browse Properties
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites!.map((property: any) => (
                  <Card key={property.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/property/${property.id}`)}
                        >
                          View
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {property.city}, {property.province}
                      </div>
                      <div className="text-lg font-bold text-primary">
                        R {property.price?.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Recently Viewed Tab */}
          <TabsContent value="recent" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Recently Viewed Properties</h2>
            </div>

            <Card>
              <CardContent className="py-8 text-center">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">You haven't viewed any properties recently.</p>
                <Button className="mt-4" onClick={() => setLocation('/properties')}>
                  Browse Properties
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Saved Searches Tab */}
          <TabsContent value="searches" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Saved Searches</h2>
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Save New Search
              </Button>
            </div>

            <Card>
              <CardContent className="py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">You haven't saved any searches yet.</p>
                <Button className="mt-4" onClick={() => setLocation('/properties')}>
                  Search Properties
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Notifications</h2>
            </div>

            <Card>
              <CardContent className="py-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications at this time.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
