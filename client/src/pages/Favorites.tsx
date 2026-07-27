import { ProspectLayout } from '@/components/ProspectLayout';
import PropertyCard from '@/components/PropertyCard';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/feedback-state';
import { PageFrame, PageHeader } from '@/components/ui/page-frame';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { getLoginUrl } from '@/const';

export default function Favorites() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: favorites, isLoading } = trpc.properties.getFavorites.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const removeFavoriteMutation = trpc.properties.toggleFavorite.useMutation({
    onSuccess: () => {
      toast.success('Removed from favorites');
      utils.properties.getFavorites.invalidate();
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
      <ProspectLayout>
        <PageFrame>
          <LoadingState title="Loading favorites" />
        </PageFrame>
      </ProspectLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <ProspectLayout>
        <PageFrame>
          <EmptyState
            title="Login required"
            description="Please login to view your favorite properties."
            action={<Button onClick={() => (window.location.href = getLoginUrl())}>Login</Button>}
          />
        </PageFrame>
      </ProspectLayout>
    );
  }

  return (
    <ProspectLayout>
      <PageFrame contentClassName="py-8">
        <PageHeader
          title="My Favorites"
          description="Properties you've saved for later"
          className="mb-8"
        />

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
          <EmptyState
            title="No favorites yet"
            description="Start browsing properties and save your favorites."
            action={<Button onClick={() => setLocation('/properties')}>Browse properties</Button>}
          />
        )}
      </PageFrame>

      <footer className="mt-12 bg-muted/30 py-8">
        <div className="container text-center text-muted-foreground">
          <p>&copy; 2025 Real Estate Portal. All rights reserved.</p>
        </div>
      </footer>
    </ProspectLayout>
  );
}
