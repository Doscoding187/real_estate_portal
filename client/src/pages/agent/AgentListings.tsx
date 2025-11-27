import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { AgentSidebar } from '@/components/agent/AgentSidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Menu,
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  MapPin,
  Bed,
  Bath,
  Square,
  Home,
  Clock,
  AlertCircle
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatCurrency } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

export default function AgentListings() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  // Map tabs to status for API
  const getStatusForTab = (tab: string) => {
    switch (tab) {
      case 'active': return 'available';
      case 'pending': return 'pending';
      case 'sold': return 'sold';
      case 'archived': return 'archived';
      default: return 'all';
    }
  };

  // Fetch listings
  const { data: listings, isLoading } = trpc.agent.getMyListings.useQuery({
    status: getStatusForTab(activeTab) as any,
    limit: 50,
  }, {
    enabled: !!user,
  });

  // Redirect if not authenticated
  if (!loading && !isAuthenticated) {
    setLocation('/login');
    return null;
  }

  if (!loading && user?.role !== 'agent') {
    setLocation('/dashboard');
    return null;
  }

  const filteredListings = listings?.filter(listing => 
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#F4F7FA]">
      <AgentSidebar />

      {/* Mobile Menu */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <AgentSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-white/20 bg-white/80 backdrop-blur-xl px-6 transition-all duration-300">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Listings</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setLocation('/listings/create')}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Listing
            </Button>
          </div>
        </header>

        <main className="p-6 max-w-[1600px] mx-auto space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-sm">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search listings..." 
                className="pl-10 bg-white border-slate-200 focus:ring-emerald-500 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" className="bg-white border-slate-200 text-slate-600 hover:text-emerald-600 rounded-xl">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-4 p-1 bg-slate-100/50 backdrop-blur-sm rounded-2xl mb-6">
              <TabsTrigger value="active" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all duration-300">
                Active
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm transition-all duration-300">
                Pending
              </TabsTrigger>
              <TabsTrigger value="sold" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-300">
                Sold
              </TabsTrigger>
              <TabsTrigger value="archived" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-600 data-[state=active]:shadow-sm transition-all duration-300">
                Archived
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 space-y-4">
                      <Skeleton className="h-48 w-full rounded-xl" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredListings?.length === 0 ? (
                <div className="text-center py-20 bg-white/40 rounded-3xl border border-dashed border-slate-300">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Home className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">No listings found</h3>
                  <p className="text-slate-500 mt-1">
                    {searchQuery ? "Try adjusting your search terms" : `You don't have any ${activeTab} listings yet`}
                  </p>
                  {!searchQuery && activeTab === 'active' && (
                    <Button 
                      onClick={() => setLocation('/listings/create')}
                      className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                    >
                      Create Listing
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredListings?.map((listing) => (
                    <div 
                      key={listing.id}
                      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
                    >
                      {/* Image */}
                      <div className="relative h-56 overflow-hidden bg-slate-100">
                        <img 
                          src={listing.primaryImage || '/assets/placeholder.jpg'} 
                          alt={listing.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-3 left-3">
                          <Badge className={
                            listing.status === 'available' ? 'bg-emerald-500/90 text-white' :
                            listing.status === 'pending' ? 'bg-amber-500/90 text-white' :
                            listing.status === 'sold' ? 'bg-blue-500/90 text-white' :
                            'bg-slate-500/90 text-white'
                          }>
                            {listing.status === 'available' ? 'Active' : 
                             listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="absolute top-3 right-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                              <DropdownMenuItem onClick={() => setLocation(`/listings/create?id=${listing.id}&edit=true`)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit Listing
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setLocation(`/property/${listing.id}`)}>
                                <Eye className="h-4 w-4 mr-2" /> View Public Page
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" /> Archive Listing
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                              {listing.title}
                            </h3>
                          </div>
                          <p className="text-slate-500 text-sm flex items-center gap-1 mb-4">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="line-clamp-1">{listing.address}, {listing.city}</span>
                          </p>

                          <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                            <div className="flex items-center gap-1.5">
                              <Bed className="h-4 w-4 text-slate-400" />
                              <span className="font-medium">{listing.bedrooms}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Bath className="h-4 w-4 text-slate-400" />
                              <span className="font-medium">{listing.bathrooms}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Home className="h-4 w-4 text-slate-400" />
                              <span className="font-medium">{listing.houseAreaM2 || listing.floorAreaM2 || listing.unitSizeM2 || '-'} m²</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                          <div className="text-lg font-bold text-slate-900">
                            {formatCurrency(listing.price)}
                          </div>
                          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                            <div className="flex items-center gap-1" title="Views">
                              <Eye className="h-3.5 w-3.5" />
                              <span>{listing.views || 0}</span>
                            </div>
                            <div className="flex items-center gap-1" title="Enquiries">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>{listing.enquiries || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
