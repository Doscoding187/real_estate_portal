import { Redirect } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import ExploreFeed from './ExploreFeed';

function canAccessLegacyFeed(userRole?: string): boolean {
  return userRole === 'super_admin' || userRole === 'agency_admin';
}

export default function ExploreFeedLegacyGate() {
  const { user, loading } = useAuth();

  if (import.meta.env.DEV || canAccessLegacyFeed(user?.role)) {
    return <ExploreFeed />;
  }

  if (loading) {
    return null;
  }

  return <Redirect to="/explore/feed" />;
}
