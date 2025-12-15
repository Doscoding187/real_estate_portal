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
    <section className="high-demand-projects w-full py-8" aria-labelledby="high-demand-title">
      <header className="section-header mb-6 container">
        <h2 id="high-demand-title" className="text-2xl font-bold text-gray-900">
          High-demand projects to invest now
        </h2>
        <p className="text-gray-600 mt-1">Leading projects in high demand in {locationName}</p>
      </header>

      <div className="projects-carousel relative group/carousel">
        <Carousel
            opts={{ align: "start", loop: true }}
            className="w-full"
        >
            <CarouselContent className="-ml-4 pb-4 px-4">
                {projects.map((project) => (
                    <CarouselItem key={project.id} className="pl-4 md:basis-1/2 lg:basis-1/2 xl:basis-1/3">
                       <article className="project-card h-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-row group">
                           {/* Left Column - Image */}
                           <div className="project-image w-[40%] md:w-[180px] lg:w-[200px] relative overflow-hidden bg-gray-100 flex-shrink-0">
                               <img 
                                 src={project.image} 
                                 alt={`${project.title} development`}
                                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                 loading="lazy"
                               />
                               {/* Badge */}
                               <div className="absolute top-2 left-2">
                                    <Badge variant="default" className="bg-blue-600/90 hover:bg-blue-700 font-bold uppercase tracking-wider text-[10px] shadow-sm backdrop-blur-sm">
                                        High Demand
                                    </Badge>
                               </div>
                           </div>
                           
                           {/* Right Column - Content */}
                           <div className="project-info p-4 flex flex-col justify-between flex-1 min-w-0 bg-white">
                               <div>
                                   <div className="flex justify-between items-start gap-2">
                                       <h3 className="project-title font-bold text-lg text-gray-900 leading-tight mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                            {project.title}
                                       </h3>
                                   </div>
                                   <p className="project-developer text-xs text-gray-500 mb-2">
                                       by <span className="text-gray-700 font-medium">{project.developer}</span>
                                   </p>

                                   <p className="project-config text-sm font-medium text-gray-700 mb-1 line-clamp-1">
                                       {project.config}
                                   </p>
                                   <p className="project-location text-sm text-gray-500 line-clamp-1 mb-3">
                                       {project.location}
                                   </p>
                               </div>
                               
                               <div className="pt-3 border-t border-gray-50 mt-auto">
                                   <p className="project-price text-lg font-bold text-blue-600">
                                       {project.priceRange}
                                   </p>
                               </div>
                           </div>
                       </article>
                    </CarouselItem>
                ))}
            </CarouselContent>
            {/* Arrows positioned relative to container */}
            <div className="hidden md:block">
                 <CarouselPrevious className="-left-4 lg:left-0 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/95 shadow-lg border-gray-100 translate-x-1/2" />
                 <CarouselNext className="-right-4 lg:right-0 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/95 shadow-lg border-gray-100 -translate-x-1/2" />
            </div>
        </Carousel>
      </div>
    </section>
  );
}
