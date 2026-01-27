import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { useComparison } from '@/contexts/ComparisonContext';
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
  GitCompare,
  X,
  Clock,
  MapPin,
  Bed,
  Bath,
  Square,
  Trash2,
  Play,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { normalizePropertyForUI } from '@/lib/normalizers';

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const { comparedProperties, removeFromComparison, clearComparison } = useComparison();

  // Fetch user dashboard data
  const { data: favorites, isLoading: favoritesLoading } = trpc.favorites.list.useQuery();
  const { data: savedSearches, isLoading: searchesLoading } = trpc.savedSearch.getAll.useQuery();
  const { data: allProperties } = trpc.properties.search.useQuery({
    status: 'available',
    limit: 100,
  });

  // Get comparison properties details
  const comparisonProperties = allProperties?.filter(p => comparedProperties.includes(p.id)) || [];

  const deleteSavedSearchMutation = trpc.savedSearch.delete.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  // Show loading spinner
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

  // Redirect if not authenticated
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (user?.role !== 'visitor') {
    setLocation('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <User className="h-8 w-8 text-emerald-600" />
          <h1 className="text-4xl font-bold text-slate-800">My Dashboard</h1>
          <Badge className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200">
            User
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card
            className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] hover:shadow-[0_12px_40px_rgba(8,_112,_184,_0.1)] transition-all cursor-pointer"
            onClick={() => document.getElementById('comparison-tab')?.click()}
          >
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-500 flex items-center gap-2">
                <GitCompare className="h-4 w-4" />
                Saved for Comparison
              </CardDescription>
              <CardTitle className="text-3xl text-slate-800">{comparedProperties.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card
            className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] hover:shadow-[0_12px_40px_rgba(8,_112,_184,_0.1)] transition-all cursor-pointer"
            onClick={() => document.getElementById('favorites-tab')?.click()}
          >
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-500 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Favorites
              </CardDescription>
              <CardTitle className="text-3xl text-slate-800">{favorites?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card
            className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] hover:shadow-[0_12px_40px_rgba(8,_112,_184,_0.1)] transition-all cursor-pointer"
            onClick={() => document.getElementById('searches-tab')?.click()}
          >
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-500 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Saved Searches
              </CardDescription>
              <CardTitle className="text-3xl text-slate-800">
                {savedSearches?.length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] hover:shadow-[0_12px_40px_rgba(8,_112,_184,_0.1)] transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="text-slate-500 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Appointments
              </CardDescription>
              <CardTitle className="text-3xl text-slate-800">0</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comparison" id="comparison-tab">
              Comparison
            </TabsTrigger>
            <TabsTrigger value="favorites" id="favorites-tab">
              Favorites
            </TabsTrigger>
            <TabsTrigger value="searches" id="searches-tab">
              Searches
            </TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Comparison Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitCompare className="h-5 w-5" />
                    Saved for Comparison
                  </CardTitle>
                  <CardDescription>Properties you're comparing</CardDescription>
                </CardHeader>
                <CardContent>
                  {comparedProperties.length === 0 ? (
                    <p className="text-muted-foreground">No properties saved for comparison.</p>
                  ) : (
                    <>
                      <div className="space-y-2 mb-4">
                        {comparisonProperties.slice(0, 3).map(property => {
                          const normalized = normalizePropertyForUI(property);
                          if (!normalized) return null;
                          return (
                            <div
                              key={property.id}
                              className="flex items-center justify-between border-b pb-2"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-sm">{normalized.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  R {normalized.price.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Button className="w-full" onClick={() => setLocation('/compare')}>
                        Compare Now ({comparedProperties.length})
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Favorites Summary */}
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
            </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Saved for Comparison</h2>
              {comparedProperties.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearComparison}>
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                  <Button
                    onClick={() => setLocation('/compare')}
                    disabled={comparedProperties.length < 2}
                  >
                    <GitCompare className="h-4 w-4 mr-2" />
                    Compare Now ({comparedProperties.length})
                  </Button>
                </div>
              )}
            </div>

            {comparedProperties.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <GitCompare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    You haven't saved any properties for comparison yet.
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click the + button on property cards to add them to your comparison list.
                  </p>
                  <Button onClick={() => setLocation('/properties')}>Browse Properties</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comparisonProperties.map(property => {
                  const normalized = normalizePropertyForUI(property);
                  if (!normalized) return null;

                  return (
                    <Card key={property.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-0">
                        <div className="relative h-48">
                          <img
                            src={normalized.images[0] || '/placeholder-property.jpg'}
                            alt={normalized.title}
                            className="w-full h-full object-cover rounded-t-lg"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full"
                            onClick={() => removeFromComparison(property.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-lg line-clamp-1 mb-2">
                            {normalized.title}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-3 w-3" />
                            {normalized.city}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-600 mb-3">
                            {normalized.bedrooms && (
                              <div className="flex items-center gap-1">
                                <Bed className="h-3 w-3" />
                                {normalized.bedrooms}
                              </div>
                            )}
                            {normalized.bathrooms && (
                              <div className="flex items-center gap-1">
                                <Bath className="h-3 w-3" />
                                {normalized.bathrooms}
                              </div>
                            )}
                            {normalized.area && (
                              <div className="flex items-center gap-1">
                                <Square className="h-3 w-3" />
                                {normalized.area}m²
                              </div>
                            )}
                          </div>
                          <div className="text-lg font-bold text-primary mb-3">
                            R {normalized.price.toLocaleString()}
                          </div>
                          <Button
                            variant="outline"
                            className="w-full"
                            size="sm"
                            onClick={() => setLocation(`/property/${property.id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
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
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {property.city}, {property.province}
                      </div>
                      <div className="text-lg font-bold text-primary mb-3">
                        R {property.price?.toLocaleString()}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        size="sm"
                        onClick={() => setLocation(`/property/${property.id}`)}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Saved Searches Tab */}
          <TabsContent value="searches" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Saved Searches</h2>
              <Button onClick={() => setLocation('/properties')}>
                <Search className="h-4 w-4 mr-2" />
                New Search
              </Button>
            </div>

            {searchesLoading ? (
              <p className="text-muted-foreground">Loading searches...</p>
            ) : (savedSearches?.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">You haven't saved any searches yet.</p>
                  <Button className="mt-4" onClick={() => setLocation('/properties')}>
                    Search Properties
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {savedSearches!.map((search: any) => (
                  <Card key={search.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{search.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            <Bell className="h-3 w-3 mr-1" />
                            {search.notificationFrequency}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSavedSearchMutation.mutate({ id: search.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {search.criteria &&
                          Object.entries(search.criteria as any).map(
                            ([key, value]: [string, any]) => {
                              if (!value || (Array.isArray(value) && value.length === 0))
                                return null;
                              return (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                                </Badge>
                              );
                            },
                          )}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          // Navigate to properties with search criteria
                          const params = new URLSearchParams(search.criteria as any);
                          setLocation(`/properties?${params.toString()}`);
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run Search Again
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Agent Appointments</h2>
            </div>

            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">You have no upcoming appointments.</p>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  Schedule viewings with agents from property detail pages.
                </p>
                <Button onClick={() => setLocation('/properties')}>Browse Properties</Button>
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
