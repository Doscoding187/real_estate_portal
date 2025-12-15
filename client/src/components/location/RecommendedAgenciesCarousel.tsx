import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";

export interface Agency {
  id: string | number;
  name: string;
  logo: string;
  type: string; // "Agency" or "Agent"
  badges: string[]; // e.g. ["PRO", "EXPERT", "TRUSTED"]
  areas: string[];
  experience: string; // e.g. "12 years"
  properties: number;
}

interface RecommendedAgenciesCarouselProps {
  agencies: Agency[];
  locationName: string;
}

export function RecommendedAgenciesCarousel({ agencies, locationName }: RecommendedAgenciesCarouselProps) {
    if (!agencies || agencies.length === 0) return null;

    // Group into pairs for 2-row layout (Couplets)
    const columns = [];
    for (let i = 0; i < agencies.length; i += 2) {
        columns.push(agencies.slice(i, i + 2));
    }

    const getBadgeStyle = (badge: string) => {
        const lower = badge.toLowerCase();
        if (lower.includes('pro')) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-none";
        if (lower.includes('expert')) return "bg-gray-200 text-gray-800 border-gray-300"; // Silver-ish
        if (lower.includes('trust')) return "bg-amber-700 text-white border-none"; // Bronze-ish
        return "bg-blue-100 text-blue-800 border-blue-200";
    };

  return (
    <section className="recommended-agencies w-full py-8" aria-labelledby="recommended-agencies-title">
      <header className="section-header mb-6 container">
        <h2 id="recommended-agencies-title" className="text-xl md:text-2xl font-bold text-gray-900">
          Recommended Agencies & Top Agents in {locationName}
        </h2>
        <p className="text-gray-600 mt-1 text-sm">Top rated professionals in your area</p>
      </header>

      <div className="agencies-carousel relative group/carousel">
        <Carousel
            opts={{ align: "start", loop: false }}
            className="w-full"
        >
            <CarouselContent className="-ml-4 pb-4 px-4">
                {columns.map((column, colIndex) => (
                    <CarouselItem key={colIndex} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/3">
                       <div className="flex flex-col gap-4 h-full">
                           {column.map((agency) => (
                               <article key={agency.id} className="agency-card bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all duration-300 overflow-hidden flex flex-row p-4 h-[160px] group box-border">
                                   {/* Left Column - Avatar */}
                                   <div className="agency-avatar w-[60px] flex-shrink-0 flex flex-col items-center justify-center gap-2 mr-4">
                                       <div className="w-[60px] h-[60px] rounded-full border-2 border-gray-100 overflow-hidden p-1 bg-white shadow-sm">
                                           <img 
                                             src={agency.logo} 
                                             alt={`${agency.name} logo`}
                                             className="w-full h-full object-cover rounded-full"
                                             loading="lazy"
                                           />
                                       </div>
                                       {/* Optional Verified Icon */}
                                       {agency.badges.some(b => b.includes('PRO')) && (
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] -mt-2 z-10 border-2 border-white">
                                                ✓
                                            </div>
                                       )}
                                   </div>
                                   
                                   {/* Right Column - Details */}
                                   <div className="agency-info flex flex-col justify-between flex-1 min-w-0">
                                       <div>
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                {agency.badges.map((badge, idx) => (
                                                    <Badge key={idx} variant="outline" className={`text-[10px] px-1.5 py-0 rounded-full font-bold uppercase tracking-wider ${getBadgeStyle(badge)}`}>
                                                        {badge}
                                                    </Badge>
                                                ))}
                                            </div>
                                           <h3 className="agency-name font-bold text-lg text-gray-900 leading-tight mb-1 line-clamp-1 group-hover:text-[#005AA3] transition-colors">
                                                {agency.name}
                                           </h3>
                                           <p className="agency-areas text-xs text-gray-500 mb-2 line-clamp-1">
                                               {agency.areas.join(' • ')}
                                           </p>
                                       </div>
                                       
                                       <div className="flex flex-col gap-1 mt-auto">
                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                <span className="text-[#DE3831] font-bold">{agency.experience}</span> Experience
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                <span className="font-bold">{agency.properties}</span> Properties Listed
                                            </div>
                                       </div>
                                   </div>
                               </article>
                           ))}
                       </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            {/* Arrows */}
            <div className="hidden md:block">
                 <CarouselPrevious className="-left-4 lg:left-0 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/95 shadow-lg border-gray-100 translate-x-1/2" />
                 <CarouselNext className="-right-4 lg:right-0 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/95 shadow-lg border-gray-100 -translate-x-1/2" />
            </div>
        </Carousel>
      </div>
    </section>
  );
}
