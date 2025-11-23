import { useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useGuestActivity } from '@/contexts/GuestActivityContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

/**
 * Hook to automatically migrate guest activity data to user account after login
 */
export function useGuestDataMigration() {
  const { isAuthenticated, loading } = useAuth();
  const { getGuestData, clearGuestData, getActivityCounts } = useGuestActivity();
  
  const migrationMutation = trpc.guestMigration.migrateGuestData.useMutation({
    onSuccess: (result) => {
      if (result.migratedViews > 0 || result.migratedFavorites > 0) {
        toast.success(
          `Welcome back! We've saved your ${result.migratedViews} viewed properties and ${result.migratedFavorites} favorites.`
        );
      }
      clearGuestData();
    },
    onError: (error) => {
      console.error('Guest migration error:', error);
      // Don't show error to user, just log it
    },
  });

  useEffect(() => {
    if (!loading && isAuthenticated && !migrationMutation.isLoading) {
      const counts = getActivityCounts();
      
      // Only migrate if there's data to migrate
      if (counts.viewed > 0 || counts.favorites > 0) {
        const guestData = getGuestData();
        
        migrationMutation.mutate({
          viewedProperties: guestData.viewedProperties,
          favoriteProperties: guestData.favoriteProperties,
        });
      }
    }
  }, [isAuthenticated, loading]); // Only run when auth status changes

  return {
    isMigrating: migrationMutation.isLoading,
  };
}
