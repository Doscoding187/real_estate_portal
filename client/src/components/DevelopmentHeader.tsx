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
    <div className="w-full py-4 space-y-3">
      {/* Meta Badges Row */}
      <div className="flex flex-wrap items-center gap-2">
        {isNewLaunch && (
          <Badge className="rounded-pill bg-blue-500 hover:bg-blue-600 text-white border-none px-2.5 py-0.5 text-xs font-semibold shadow-none">
            NEW LAUNCH
          </Badge>
        )}
        {completionDate && (
          <Badge variant="outline" className="rounded-pill border-slate-300 text-slate-500 px-2.5 py-0.5 text-xs font-medium bg-white/50">
            Completion in {completionDate}
          </Badge>
        )}
      </div>

      {/* Title & Location - Actions Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        {/* Left: Title & Location */}
        <div className="space-y-1 max-w-3xl">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            {name}
          </h1>
          <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{location}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onFavorite}
              className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-red-500 transition-all shadow-sm"
              aria-label="Add to favorites"
            >
              <Heart className="h-4 w-4" />
            </button>
            <button
              onClick={onShare}
              className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-all shadow-sm"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          {/* Primary CTA */}
          <Button 
            onClick={onContact}
            className="rounded-pill bg-orange-500 hover:bg-orange-600 text-white px-6 h-10 text-sm font-semibold shadow-sm transition-all"
          >
            Contact Developer
          </Button>
        </div>
      </div>
    </div>
  );
}
