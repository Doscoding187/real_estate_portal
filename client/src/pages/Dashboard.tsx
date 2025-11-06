import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Home as HomeIcon,
  DollarSign,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [deletePropertyId, setDeletePropertyId] = useState<number | null>(null);

  const isAdmin = user?.role === 'admin';

  // Redirect if not authenticated
  if (!isAuthenticated) {
    setLocation('/');
    return null;
  }

  const { data: properties, isLoading, refetch } = trpc.properties.myProperties.useQuery();

  const deletePropertyMutation = trpc.properties.delete.useMutation({
    onSuccess: () => {
      toast.success('Property deleted successfully');
      refetch();
      setDeletePropertyId(null);
    },
    onError: error => {
      toast.error(error.message || 'Failed to delete property');
    },
  });

  const handleDelete = (propertyId: number) => {
    deletePropertyMutation.mutate({ id: propertyId });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'sold':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'rented':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">
                {isAdmin ? 'All Properties (Admin)' : 'My Properties'}
              </h1>
              {isAdmin && (
                <Badge variant="destructive" className="text-xs">
                  ADMIN
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {isAdmin
                ? 'Manage all property listings on the platform'
                : 'Manage your property listings'}
            </p>
          </div>
          <Button onClick={() => setLocation('/list-property')} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            List New Property
          </Button>
        </div>

        {/* Stats Cards */}
        {!isLoading && properties && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Properties</CardDescription>
                <CardTitle className="text-3xl">{properties.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Available</CardDescription>
                <CardTitle className="text-3xl">
                  {properties.filter(p => p.status === 'available').length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Sold/Rented</CardDescription>
                <CardTitle className="text-3xl">
                  {properties.filter(p => p.status === 'sold' || p.status === 'rented').length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Views</CardDescription>
                <CardTitle className="text-3xl">
                  {properties.reduce((sum, p) => sum + (p.views || 0), 0)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Properties List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(property => {
              const primaryImage = (property as any).primaryImage;
              const imageCount = (property as any).imageCount || 0;

              return (
                <Card
                  key={property.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Property Image */}
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <HomeIcon className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Badge className={getStatusColor(property.status)}>{property.status}</Badge>
                      {imageCount > 1 && (
                        <Badge variant="secondary" className="bg-black/50 text-white border-none">
                          +{imageCount - 1}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4">
                    {/* Title */}
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">{property.title}</h3>

                    {/* Location */}
                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.city}, {property.province}
                    </div>

                    {/* Price */}
                    <div className="flex items-center mb-3">
                      <DollarSign className="h-5 w-5 text-primary mr-1" />
                      <span className="font-bold text-xl text-primary">
                        {formatPrice(property.price)}
                      </span>
                      {property.listingType === 'rent' && (
                        <span className="text-sm text-muted-foreground ml-1">/month</span>
                      )}
                    </div>

                    {/* Property Details */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      {property.bedrooms && <span>{property.bedrooms} bed</span>}
                      {property.bathrooms && <span>{property.bathrooms} bath</span>}
                      <span>{property.area} sqm</span>
                    </div>

                    {/* Owner Info (Admin Only) */}
                    {isAdmin && (
                      <div className="mb-3 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        Owner ID: {property.ownerId}
                      </div>
                    )}

                    {/* Property Type & Views */}
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline">{getPropertyTypeLabel(property.propertyType)}</Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Eye className="h-4 w-4 mr-1" />
                        {property.views || 0} views
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setLocation(`/property/${property.id}`)}
                      >
                        View
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setLocation(`/edit-property/${property.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletePropertyId(property.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <HomeIcon className="h-20 w-20 mx-auto text-muted-foreground opacity-50" />
              <div>
                <h3 className="text-xl font-semibold mb-2">No Properties Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start listing your properties to reach potential buyers and renters
                </p>
                <Button onClick={() => setLocation('/list-property')} size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  List Your First Property
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletePropertyId !== null}
        onOpenChange={open => !open && setDeletePropertyId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your property listing and
              remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePropertyId && handleDelete(deletePropertyId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePropertyMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
