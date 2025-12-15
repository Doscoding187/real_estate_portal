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

    // Group projects into pairs (rows) for the grid layout
    // Each CarouselItem will represent a COLUMN containing 2 projects (Top and Bottom)
    const columns = [];
    for (let i = 0; i < projects.length; i += 2) {
        columns.push(projects.slice(i, i + 2));
    }

  return (
    <section className="high-demand-projects w-full py-8" aria-labelledby="high-demand-title">
      <header className="section-header mb-6 container">
        <h2 id="high-demand-title" className="text-xl md:text-2xl font-bold text-gray-900">
          High-demand projects to invest now
        </h2>
        <p className="text-gray-600 mt-1 text-sm">Leading projects in high demand in {locationName}</p>
      </header>

      <div className="projects-carousel relative group/carousel">
        <Carousel
            opts={{ align: "start", loop: false }} // Loop false is often better for grids to avoid confusion
            className="w-full"
        >
            <CarouselContent className="-ml-3 pb-4 px-4">
                {columns.map((column, colIndex) => (
                    <CarouselItem key={colIndex} className="pl-3 md:basis-1/2 lg:basis-1/3 xl:basis-1/3">
                       <div className="flex flex-col gap-3 h-full">
                           {column.map((project) => (
                               <article key={project.id} className="project-card bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-row group h-[140px]">
                                   {/* Left Column - Image */}
                                   <div className="project-image w-[120px] md:w-[130px] relative overflow-hidden bg-gray-100 flex-shrink-0">
                                       <img 
                                         src={project.image} 
                                         alt={`${project.title} development`}
                                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                         loading="lazy"
                                       />
                                       {/* Badge - Smaller */}
                                       {/* <div className="absolute top-1 left-1">
                                            <Badge variant="default" className="bg-blue-600/90 font-bold uppercase tracking-wider text-[8px] px-1 py-0 h-4 shadow-sm backdrop-blur-sm">
                                                High Demand
                                            </Badge>
                                       </div> */}
                                   </div>
                                   
                                   {/* Right Column - Content */}
                                   <div className="project-info p-3 flex flex-col justify-between flex-1 min-w-0 bg-white">
                                       <div>
                                           <h3 className="project-title font-bold text-sm text-gray-900 leading-tight mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                {project.title}
                                           </h3>
                                           <p className="project-developer text-[10px] text-gray-500 mb-1">
                                               by <span className="text-gray-700 font-medium">{project.developer}</span>
                                           </p>
        
                                           <p className="project-config text-xs font-medium text-gray-700 mb-0.5 line-clamp-1">
                                               {project.config}
                                           </p>
                                           <p className="project-location text-[10px] text-gray-500 line-clamp-1">
                                               {project.location}
                                           </p>
                                       </div>
                                       
                                       <div className="pt-2 border-t border-gray-50 mt-auto">
                                           <p className="project-price text-sm font-bold text-blue-600">
                                               {project.priceRange}
                                           </p>
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
