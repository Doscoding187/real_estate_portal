import { Navbar } from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Heart, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { getLoginUrl } from '@/const';

export default function Favorites() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: favorites, isLoading } = trpc.favorites.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const removeFavoriteMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      toast.success('Removed from favorites');
      utils.favorites.list.invalidate();
    },
    onError: () => {
      toast.error('Failed to remove from favorites');
    },
  });

  const handleRemoveFavorite = (propertyId: string) => {
    removeFavoriteMutation.mutate({ propertyId: parseInt(propertyId) });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Heart className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-4">Login Required</h2>
          <p className="text-muted-foreground mb-6">
            Please login to view your favorite properties
          </p>
          <Button onClick={() => (window.location.href = getLoginUrl())}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Favorites</h1>
          <p className="text-muted-foreground">Properties you've saved for later</p>
        </div>

        {favorites && favorites.length > 0 ? (
          <div className="flex flex-col gap-6">
            {favorites.map(favorite => {
              const p = normalizePropertyForUI(favorite.property);
              return p ? (
                <PropertyCard
                  key={p.id}
                  {...p}
                  onFavoriteClick={() => handleRemoveFavorite(p.id)}
                />
              ) : null;
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-muted/30 rounded-lg">
            <Heart className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Favorites Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start browsing properties and save your favorites
            </p>
            <Button onClick={() => setLocation('/properties')}>Browse Properties</Button>
          </div>
        )}
      </div>

      <footer className="bg-muted/30 py-8 mt-12">
        <div className="container text-center text-muted-foreground">
          <p>&copy; 2025 Real Estate Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
