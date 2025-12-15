import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";

export interface Project {
  id: string | number;
  title: string;
  developer: string;
  image: string;
  priceRange: string;
  location: string;
  config: string; // e.g. "2, 3 Beds"
}

interface HighDemandProjectsCarouselProps {
  projects: Project[];
  locationName: string;
}

export function HighDemandProjectsCarousel({ projects, locationName }: HighDemandProjectsCarouselProps) {
    if (!projects || projects.length === 0) return null;

  return (
    <section className="high-demand-projects w-full" aria-labelledby="high-demand-title">
      <header className="section-header mb-6 flex items-baseline justify-between">
        <div>
            <h2 id="high-demand-title" className="text-2xl font-bold text-gray-900">
            High-demand projects to invest now
            </h2>
            <p className="text-gray-600 mt-1 text-sm md:text-base">Leading projects in high demand in {locationName}</p>
        </div>
      </header>

      <div className="projects-carousel relative group/carousel">
        <Carousel
            opts={{ align: "start", loop: true }}
            className="w-full"
        >
            <CarouselContent className="-ml-4 pb-4">
                {projects.map((project) => (
                    <CarouselItem key={project.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                       <article className="project-card h-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group">
                           {/* Image */}
                           <div className="project-image h-48 relative overflow-hidden bg-gray-100">
                               <img 
                                 src={project.image} 
                                 alt={`${project.title} development`}
                                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                 loading="lazy"
                               />
                               {/* Badge */}
                               <div className="absolute top-3 left-3">
                                    <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-wider text-[10px] shadow-sm">
                                        High Demand
                                    </Badge>
                               </div>
                           </div>
                           
                           {/* Content */}
                           <div className="project-content p-4 flex flex-col flex-grow">
                               <h3 className="project-title font-bold text-lg text-gray-900 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                   {project.title}
                               </h3>
                               <p className="project-developer text-sm text-gray-500 mb-4">
                                   by <span className="text-gray-700 font-medium">{project.developer}</span>
                               </p>
                               
                               <div className="mt-auto space-y-2 pt-3 border-t border-gray-50">
                                   <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-dashboard w-4 h-4 text-gray-400"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                                       <p className="project-config font-medium">{project.config}</p>
                                   </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin w-4 h-4 text-gray-400"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                       <p className="project-location line-clamp-1">{project.location}</p>
                                   </div>
                                   
                                   <p className="project-price text-lg font-bold text-blue-600 pt-1">
                                       {project.priceRange}
                                   </p>
                               </div>
                           </div>
                       </article>
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/95 hover:bg-white text-blue-900 border-0 shadow-lg hover:scale-110" />
            <CarouselNext className="hidden md:flex -right-4 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/95 hover:bg-white text-blue-900 border-0 shadow-lg hover:scale-110" />
        </Carousel>
      </div>
    </section>
  );
}
