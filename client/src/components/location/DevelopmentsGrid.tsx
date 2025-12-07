import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Building2 } from 'lucide-react';
import { SimpleDevelopmentCard } from '@/components/SimpleDevelopmentCard';
// Temporary type definition if not imported
interface DevelopmentItem {
  id: number;
  name: string;
  description: string | null;
  images: string[] | string | null;
  minPrice?: number;
  city: string;
  suburb?: string | null;
}

interface DevelopmentsGridProps {
  developments: any[]; // Using any to be flexible with backend return type for now
  locationName: string;
}

export function DevelopmentsGrid({ developments, locationName }: DevelopmentsGridProps) {
  if (!developments || developments.length === 0) return null;

  return (
    <div className="py-16 bg-white">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-primary">
              <Building2 className="h-5 w-5" />
              <span className="font-semibold uppercase tracking-wider text-sm">New Launches</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">New Developments in {locationName}</h2>
            <p className="text-slate-500 mt-2 max-w-2xl">
              Explore the latest residential projects and investment opportunities.
            </p>
          </div>
          <Link href="/developments">
            <Button variant="outline" className="group">
              View All Developments
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {developments.map((dev) => {
             // Handle image parsing safely
             let mainImage = '';
             if (Array.isArray(dev.images) && dev.images.length > 0) {
               mainImage = dev.images[0];
             } else if (typeof dev.images === 'string') {
                try {
                   // Sometimes comes as JSON string
                   const parsed = JSON.parse(dev.images);
                   mainImage = Array.isArray(parsed) ? parsed[0] : parsed;
                } catch {
                   mainImage = dev.images;
                }
             }

             return (
              <Link key={dev.id} href={`/development/${dev.id}`}>
                <div className="cursor-pointer group h-full">
                  <SimpleDevelopmentCard 
                    id={dev.id.toString()}
                    title={dev.name}
                    city={dev.city}
                    priceRange={{
                      min: dev.minPrice || 0,
                      max: 0 // We might not have max price in this view
                    }}
                    image={mainImage || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  );
}
