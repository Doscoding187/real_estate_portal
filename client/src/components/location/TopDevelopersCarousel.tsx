import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export interface FeaturedProject {
    title: string;
    image: string;
    price: string | number;
    location: string;
}

export interface Developer {
    id: number | string;
    name: string;
    logo: string;
    establishedYear?: number;
    projectCount: number;
    description: string;
    featuredProject?: FeaturedProject;
}

interface TopDevelopersCarouselProps {
    developers: Developer[];
    locationName: string;
}

export function TopDevelopersCarousel({ developers, locationName }: TopDevelopersCarouselProps) {
    if (!developers || developers.length === 0) return null;

    return (
        <div className="w-full" aria-labelledby="top-developers-title">
            <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900" id="top-developers-title">
                        Top Developers in {locationName}
                    </h2>
                    <p className="text-gray-600 mt-1 text-sm md:text-base">
                        Leading property developers shaping the {locationName} real estate market
                    </p>
                </div>
                {/* Desktop controls could go here, but sticking to bottom as per spec */}
            </header>

            <Carousel
                opts={{
                    align: "start",
                    loop: true,
                }}
                className="w-full"
            >
                <CarouselContent className="-ml-4 pb-4">
                    {developers.map((dev) => (
                        <CarouselItem key={dev.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                            <article className="h-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col">
                                {/* Header */}
                                <div className="p-4 flex items-center gap-3 border-b border-gray-100 min-h-[80px]">
                                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-gray-50 p-1 flex items-center justify-center border border-gray-100">
                                        <img
                                            src={dev.logo || '/assets/placeholder-logo.png'}
                                            alt={`${dev.name} logo`}
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTMgMjF2LThhMiAyIDAgMCAxIDItMmgyLjVhMiAyIDAgMCAxIDIgMnY4Ii8+PHBhdGggZD0iTTE3IDIxdi04YTIgMiAwIDAgMCAtMi0yaC0yLjVhMiAyIDAgMCAwIC0yIDJ2OCIvPjxwYXRoIGQ9Ik0zIDEwdi0xYTIgMiAwIDAgMSA1IDB2MSIvPjxwYXRoIGQ9Ik0xNyAxMHYtMWEyIDIgMCAwIDEgNSAwdjEiLz48L3N2Zz4=';
                                            }}
                                        />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight">{dev.name}</h3>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/50">
                                    <div className="p-3 text-center">
                                        <div className="font-bold text-gray-900">{dev.establishedYear || '1995'}</div>
                                        <div className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Established</div>
                                    </div>
                                    <div className="p-3 text-center">
                                        <div className="font-bold text-gray-900">{dev.projectCount}</div>
                                        <div className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Projects</div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="p-4 flex-grow">
                                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                                        {dev.description}
                                    </p>
                                </div>

                                {/* Featured Project */}
                                {dev.featuredProject ? (
                                    <div className="mt-auto relative h-48 group cursor-pointer block">
                                        <img
                                            src={dev.featuredProject.image}
                                            alt={dev.featuredProject.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-white/90 mb-1">Featured Development</div>
                                            <h4 className="font-semibold text-sm line-clamp-1 mb-0.5">{dev.featuredProject.title}</h4>
                                            <div className="flex justify-between items-end mt-1">
                                                <p className="text-xs text-white/80 truncate mr-2">{dev.featuredProject.location}</p>
                                                <strong className="text-sm font-bold whitespace-nowrap bg-white/10 px-1.5 py-0.5 rounded backdrop-blur-sm">
                                                    {typeof dev.featuredProject.price === 'number'
                                                        ? `From R${(dev.featuredProject.price / 1000000).toFixed(1)}M`
                                                        : dev.featuredProject.price}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-auto h-12 bg-gray-50 border-t border-gray-100" />
                                )}
                            </article>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                
                <div className="flex items-center justify-end gap-2 mt-4">
                     <CarouselPrevious className="static translate-y-0 h-10 w-10 border-gray-200 hover:bg-gray-50 hover:text-blue-600" />
                     <CarouselNext className="static translate-y-0 h-10 w-10 border-gray-200 hover:bg-gray-50 hover:text-blue-600" />
                </div>
            </Carousel>
        </div>
    );
}
