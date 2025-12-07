import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/search';
import { MapPin } from 'lucide-react';

interface HeroLocationProps {
  title: string;
  subtitle?: string;
  breadcrumbs: { label: string; href: string }[];
  backgroundImage?: string;
  stats?: {
    totalListings?: number;
    avgPrice?: number;
  };
}

export function HeroLocation({ 
  title, 
  subtitle, 
  breadcrumbs, 
  backgroundImage, 
  stats 
}: HeroLocationProps) {
  return (
    <div className="relative bg-navy-900 text-white pt-24 pb-12 overflow-hidden">
      {/* Background Image / Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/90 to-navy-900/70 z-10" />
        {backgroundImage && (
          <img 
            src={backgroundImage} 
            alt={title} 
            className="w-full h-full object-cover opacity-50"
          />
        )}
      </div>

      <div className="container relative z-10">
        <div className="mb-6">
          <Breadcrumbs items={breadcrumbs} className="text-white/60 hover:text-white" />
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-primary-400" />
              <span className="text-primary-400 font-medium tracking-wide text-sm uppercase">
                Location Profile
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg text-white/80 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {stats && (
            <div className="flex bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <div className="pr-6 mr-6 border-r border-white/20">
                <p className="text-sm text-white/60 mb-1">Total Listings</p>
                <p className="text-2xl font-bold">{stats.totalListings?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">Average Price</p>
                <p className="text-2xl font-bold">R {stats.avgPrice?.toLocaleString() || 0}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
