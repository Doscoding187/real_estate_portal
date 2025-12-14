import { trpc } from '@/lib/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { Link } from 'wouter';

interface FeaturedDevelopersProps {
  locationType: 'province' | 'city' | 'suburb';
  locationId: number;
  locationName: string;
}

export function FeaturedDevelopers({ locationType, locationId, locationName }: FeaturedDevelopersProps) {
  const { data: developers, isLoading } = trpc.monetization.getFeaturedDevelopers.useQuery({
    locationType,
    locationId
  });

  if (isLoading) return null; // or skeleton
  if (!developers || developers.length === 0) return null;

  return (
    <div className="py-12 bg-slate-50">
      <div className="container">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 text-blue-600 justify-center">
            <Building2 className="h-5 w-5" />
            <span className="font-semibold uppercase tracking-wider text-sm">Trusted Partners</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 text-center">Developer Showcase</h2>
          <p className="text-slate-500 mt-2 max-w-2xl mx-auto text-center">
            Leading developers building quality homes in {locationName}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {developers.map((dev) => (
            <Link key={dev.id} href={`/developer/${dev.slug}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer group h-full border-transparent hover:border-primary/20">
                <CardContent className="p-6 flex flex-col items-center text-center h-full justify-center">
                  <div className="w-24 h-24 mb-4 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100 group-hover:border-primary/20 transition-colors">
                    {dev.logo ? (
                      <img src={dev.logo} alt={dev.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <Building2 className="h-10 w-10 text-slate-400" />
                    )}
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 group-hover:text-primary transition-colors">
                    {dev.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">
                    Premier Developer
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
