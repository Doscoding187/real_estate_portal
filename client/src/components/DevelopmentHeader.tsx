import { MapPin, Share2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DevelopmentHeaderProps {
  name: string;
  location: string;
  isNewLaunch?: boolean;
  completionDate?: string;
  onContact: () => void;
  onShare?: () => void;
  onFavorite?: () => void;
}

export function DevelopmentHeader({
  name,
  location,
  isNewLaunch,
  completionDate,
  onContact,
  onShare,
  onFavorite,
}: DevelopmentHeaderProps) {
  return (
    <div className="w-full py-fluid-lg space-y-fluid-md">
      {/* Meta Badges Row */}
      <div className="flex flex-wrap items-center gap-fluid-sm">
        {isNewLaunch && (
          <Badge className="rounded-pill bg-blue-500 hover:bg-blue-600 text-white border-none px-4 py-1.5 text-sm font-semibold shadow-sm">
            NEW LAUNCH
          </Badge>
        )}
        {completionDate && (
          <Badge variant="outline" className="rounded-pill border-slate-300 text-slate-600 px-4 py-1.5 text-sm font-medium bg-white/50">
            Completion in {completionDate}
          </Badge>
        )}
      </div>

      {/* Title & Location - Actions Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-fluid-md">
        {/* Left: Title & Location */}
        <div className="space-y-fluid-xs max-w-3xl">
          <h1 className="text-fluid-h1 font-bold text-slate-900 tracking-tight leading-tight">
            {name}
          </h1>
          <div className="flex items-center gap-2 text-slate-500 text-body-m">
            <MapPin className="h-5 w-5 flex-shrink-0" />
            <span>{location}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onFavorite}
              className="p-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-red-500 transition-all shadow-sm hover:shadow-md"
              aria-label="Add to favorites"
            >
              <Heart className="h-5 w-5" />
            </button>
            <button
              onClick={onShare}
              className="p-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-all shadow-sm hover:shadow-md"
              aria-label="Share"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          {/* Primary CTA */}
          <Button 
            onClick={onContact}
            className="rounded-pill bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-base font-semibold shadow-soft hover:shadow-lg transition-all"
          >
            Contact Developer
          </Button>
        </div>
      </div>
    </div>
  );
}
