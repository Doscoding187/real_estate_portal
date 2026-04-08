import { useAuth } from '@/_core/hooks/useAuth';
import { useGuestActivity } from '@/contexts/GuestActivityContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Eye, Heart, ArrowRight, Search } from 'lucide-react';
import { useLocation } from 'wouter';

interface GuestUserBannerProps {
  showAction?: boolean;
}

export function GuestUserBanner({ showAction = true }: GuestUserBannerProps) {
  const { isAuthenticated } = useAuth();
  const { getActivityCounts } = useGuestActivity();
  const [, setLocation] = useLocation();

  if (isAuthenticated) return null;

  const counts = getActivityCounts();
  const totalActivity = counts.viewed + counts.favorites + counts.searches;

  if (totalActivity === 0) return null;

  return (
    <Card className="border-slate-200 bg-slate-50/90 shadow-sm">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            <div>
              <h3 className="font-semibold text-slate-900">Continue where you left off</h3>
              <p className="mt-1 text-sm text-slate-600">
                Sign in to keep your recent guest activity across devices.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {counts.viewed > 0 && (
            <Badge variant="secondary" className="gap-1 bg-white text-slate-700">
              <Eye className="h-3.5 w-3.5" />
              {counts.viewed} viewed
            </Badge>
          )}
          {counts.favorites > 0 && (
            <Badge variant="secondary" className="gap-1 bg-white text-slate-700">
              <Heart className="h-3.5 w-3.5 text-red-500" />
              {counts.favorites} saved
            </Badge>
          )}
          {counts.searches > 0 && (
            <Badge variant="secondary" className="gap-1 bg-white text-slate-700">
              <Search className="h-3.5 w-3.5" />
              {counts.searches} searches
            </Badge>
          )}
        </div>

        {showAction && (
          <Button
            onClick={() => setLocation('/login')}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700"
          >
            Login / Register to Save Activity
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
