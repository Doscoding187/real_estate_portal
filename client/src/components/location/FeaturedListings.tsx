import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star } from 'lucide-react';
import PropertyCard from '@/components/PropertyCard'; // Using existing card
import { normalizePropertyForUI } from '@/lib/normalizers';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface FeaturedListingsProps {
  listings: any[];
  title: string;
  subtitle?: string;
  viewAllLink: string;
}

export function FeaturedListings({
  listings,
  title,
  subtitle,
  viewAllLink,
}: FeaturedListingsProps) {
  if (!listings || listings.length === 0) return null;

  return (
    <div className="py-16 bg-slate-50">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-yellow-600">
              <Star className="h-5 w-5 fill-yellow-600" />
              <span className="font-semibold uppercase tracking-wider text-sm">Editor's Pick</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-slate-500 mt-2 max-w-2xl">{subtitle}</p>}
          </div>
          <Link href={viewAllLink}>
            <Button variant="outline" className="group">
              View All Properties
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <Carousel className="w-full">
          <CarouselContent className="-ml-4 pb-4">
            {listings.map(item => {
              const property = normalizePropertyForUI(item);
              if (!property) return null;

              return (
                <CarouselItem key={item.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <PropertyCard {...property} />
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-12" />
          <CarouselNext className="hidden md:flex -right-12" />
        </Carousel>
      </div>
    </div>
  );
}
