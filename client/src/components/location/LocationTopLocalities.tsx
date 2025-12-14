
import React from 'react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, TrendingUp } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface TopLocalityStats {
    id: number;
    name: string;
    slug: string;
    listingCount: number;
    avgPrice: number;
    imageUrl?: string;
}

interface LocationTopLocalitiesProps {
  locationName: string;
  localities: TopLocalityStats[];
  parentSlug: string; // e.g., "gauteng/johannesburg"
}

export function LocationTopLocalities({ locationName, localities, parentSlug }: LocationTopLocalitiesProps) {
    if (!localities || localities.length === 0) return null;

    return (
        <section className="py-12 bg-slate-50">
            <div className="container">
                 <div className="flex flex-col md:flex-row justify-between items-end mb-8">
                    <div>
                         <div className="flex items-center gap-2 mb-2 text-indigo-600">
                            <TrendingUp className="h-5 w-5" />
                            <span className="font-semibold uppercase tracking-wider text-sm">Market Intelligence</span>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900">Top Localities in {locationName}</h2>
                        <p className="mt-2 text-slate-600 max-w-2xl">
                             Discover {locationName}'s most in-demand localities based on buyer activity, price trends, and inventory.
                        </p>
                    </div>
                    <Link href={`/${parentSlug}`}>
                        <Button variant="link" className="text-primary hidden md:flex">
                            Explore all localities <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                <div className="relative">
                     <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                        <CarouselContent className="-ml-4 pb-4">
                            {localities.map((locality) => (
                                <CarouselItem key={locality.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                                     <Link href={`/${parentSlug}/${locality.slug}`}>
                                        <Card className="h-full cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group border-slate-200 overflow-hidden">
                                            <div className="relative h-48 bg-slate-200 overflow-hidden">
                                                 <img 
                                                    src={locality.imageUrl || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
                                                    alt={locality.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute top-2 right-2">
                                                    <Badge variant="secondary" className="bg-white/90 text-slate-800 shadow-sm backdrop-blur-sm">
                                                        {locality.listingCount} Properties
                                                    </Badge>
                                                </div>
                                            </div>
                                            <CardContent className="p-4">
                                                <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-primary transition-colors">
                                                    {locality.name}
                                                </h3>
                                                <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
                                                    <span>Avg. Price</span>
                                                    <span className="font-semibold text-slate-900">
                                                        {locality.avgPrice > 0 
                                                            ? `R ${(locality.avgPrice / 1000000).toFixed(1)}M` 
                                                            : 'Price on Request'
                                                        }
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                     </Link>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="hidden md:flex -left-5" />
                        <CarouselNext className="hidden md:flex -right-5" />
                    </Carousel>
                </div>

                <div className="mt-6 md:hidden text-center">
                    <Link href={`/${parentSlug}`}>
                        <Button variant="outline" className="w-full">
                            Explore all localities
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
