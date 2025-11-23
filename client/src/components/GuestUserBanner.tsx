import { useAuth } from '@/_core/hooks/useAuth';
import { useGuestActivity } from '@/contexts/GuestActivityContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Eye, Heart, ArrowRight, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { useState } from 'react';

export function GuestUserBanner() {
  const { isAuthenticated } = useAuth();
  const { getActivityCounts } = useGuestActivity();
  const [, setLocation] = useLocation();
  const [isMinimized, setIsMinimized] = useState(false);

  // Only show for non-authenticated users
  if (isAuthenticated) return null;

  const counts = getActivityCounts();
  const totalActivity = counts.viewed + counts.favorites;

  // Don't show if no activity yet
  if (totalActivity === 0) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <User className="h-4 w-4 mr-2" />
          Guest Activity ({totalActivity})
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-xl border-blue-200 bg-white">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Guest User</h3>
              <p className="text-xs text-slate-500">Your Recent Activity</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Activity Stats */}
        <div className="flex gap-4 mb-4">
          {counts.viewed > 0 && (
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-slate-500" />
              <div>
                <div className="text-2xl font-bold text-slate-900">{counts.viewed}</div>
                <div className="text-xs text-slate-500">Viewed</div>
              </div>
            </div>
          )}
          {counts.favorites > 0 && (
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-slate-900">{counts.favorites}</div>
                <div className="text-xs text-slate-500">Favorites</div>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-blue-50 rounded-lg p-3 mb-3">
          <p className="text-sm font-medium text-blue-900 mb-1">
            Save your activity permanently!
          </p>
          <p className="text-xs text-blue-700">
            Login or register to access your activities across all devices.
          </p>
        </div>

        <Button
          onClick={() => setLocation('/login')}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          Login / Register to Save Activity
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
