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
import { useSavedUnitTypes } from '@/lib/savedUnitTypes';
import { useSavedDevelopments } from '@/lib/savedDevelopments';
import { isInternalHref } from '@/lib/developmentListingNavigation';

export default function Favorites() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const deviceSaved = useSavedUnitTypes();
  const savedDevelopments = useSavedDevelopments();

  const { data: favorites, isLoading } = trpc.properties.getFavorites.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const removeFavoriteMutation = trpc.properties.setFavorite.useMutation({
    onSuccess: () => {
      toast.success('Removed from favorites');
      utils.properties.getFavorites.invalidate();
    },
    onError: () => {
      toast.error('Failed to remove from favorites');
    },
  });

  const handleRemoveFavorite = (propertyId: string) => {
    removeFavoriteMutation.mutate({ propertyId: parseInt(propertyId), saved: false });
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
        ) : deviceSaved.items.length > 0 || savedDevelopments.items.length > 0 ? null : (
          <EmptyState
            title="No favorites yet"
            description="Start browsing properties and save your favorites."
            action={<Button onClick={() => setLocation('/')}>Choose a search journey</Button>}
          />
        )}

        {deviceSaved.items.length > 0 ? (
          <section className="mt-10" aria-labelledby="device-saved-heading">
            <h2 id="device-saved-heading" className="text-lg font-bold text-slate-900">
              New-development units saved on this device
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              These are kept in this browser only and are not part of your account yet.
            </p>
            <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {deviceSaved.items
                .filter(item => isInternalHref(item.href))
                .map(item => (
                  <li
                    key={item.unitTypeId}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <a href={item.href} className="min-w-0 text-sm font-semibold text-[#2774AE]">
                      {item.title}
                      <span className="block truncate text-xs font-normal text-slate-600">
                        {item.developmentName}
                      </span>
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 shrink-0"
                      aria-label={`Remove ${item.title} at ${item.developmentName} from saved`}
                      onClick={() => deviceSaved.toggle(item)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        {savedDevelopments.items.length > 0 ? (
          <section className="mt-10" aria-labelledby="device-saved-developments-heading">
            <h2 id="device-saved-developments-heading" className="text-lg font-bold text-slate-900">
              Developments saved on this device
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              These are saved in this browser only and are not part of your account.
            </p>
            <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {savedDevelopments.items
                .filter(item => isInternalHref(item.href))
                .map(item => (
                  <li
                    key={item.developmentId}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <a href={item.href} className="flex min-w-0 items-center gap-3 text-[#2774AE]">
                      <img
                        src={item.image}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="h-14 w-20 shrink-0 rounded-md object-cover"
                      />
                      <span className="min-w-0 text-sm font-semibold">
                        {item.title}
                        <span className="block truncate text-xs font-normal text-slate-600">
                          {item.location}
                        </span>
                      </span>
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 shrink-0"
                      aria-label={`Remove ${item.title} from saved developments`}
                      onClick={() => savedDevelopments.toggle(item)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
      </PageFrame>

      <footer className="mt-12 bg-muted/30 py-8">
        <div className="container text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Property Listify. All rights reserved.</p>
        </div>
      </footer>
    </ProspectLayout>
  );
}
