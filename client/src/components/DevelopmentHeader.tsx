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
  price,
  isNewLaunch,
  completionDate,
  onContact,
  onShare,
  onFavorite,
}: DevelopmentHeaderProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="w-full py-4 space-y-3">
      {/* Meta Badges Row */}
      <div className="flex flex-wrap items-center gap-2">
        {isNewLaunch && (
          <Badge className="rounded-pill bg-blue-500 hover:bg-blue-600 text-white border-none px-3 py-1.5 text-xs font-bold shadow-sm tracking-wide">
            NEW LAUNCH
          </Badge>
        )}
        {completionDate && (
          <Badge variant="outline" className="rounded-pill border-slate-200 text-slate-600 px-3 py-1.5 text-xs font-semibold bg-white shadow-sm">
            Completion in {completionDate}
          </Badge>
        )}
      </div>

      {/* Title & Location - Actions Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        {/* Left: Title, Price & Location */}
        <div className="space-y-2 max-w-3xl">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
            {name}
          </h1>
          {price && (
            <p className="text-2xl lg:text-3xl font-bold text-blue-600">
              Priced from {formatPrice(price)}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{location}</span>
          </div>
        </div>

        {/* Right: Primary CTA Only */}
        <div className="flex items-center gap-2.5">
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
