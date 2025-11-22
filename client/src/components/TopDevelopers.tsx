import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ChevronRight, ArrowRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface Developer {
  id: number;
  name: string;
  logo: string;
  totalProjects: number;
  experience: number;
  readyToMove: number;
  underConstruction: number;
  newLaunch: number;
}

export function TopDevelopers() {
  // Placeholder data for top South African developers
  const developers: Developer[] = [
    {
      id: 1,
      name: 'Balwin Properties',
      logo: 'https://placehold.co/120x120/0F4C75/ffffff?text=BP',
      totalProjects: 87,
      experience: 25,
      readyToMove: 45,
      underConstruction: 32,
      newLaunch: 10,
    },
    {
      id: 2,
      name: 'Calgro M3',
      logo: 'https://placehold.co/120x120/3282B8/ffffff?text=CM3',
      totalProjects: 124,
      experience: 32,
      readyToMove: 68,
      underConstruction: 41,
      newLaunch: 15,
    },
    {
      id: 3,
      name: 'Tongaat Hulett',
      logo: 'https://placehold.co/120x120/0A2540/ffffff?text=TH',
      totalProjects: 156,
      experience: 45,
      readyToMove: 92,
      underConstruction: 48,
      newLaunch: 16,
    },
    {
      id: 4,
      name: 'Attacq Limited',
      logo: 'https://placehold.co/120x120/1B4965/ffffff?text=AL',
      totalProjects: 98,
      experience: 28,
      readyToMove: 54,
      underConstruction: 35,
      newLaunch: 9,
    },
    {
      id: 5,
      name: 'Atterbury Property',
      logo: 'https://placehold.co/120x120/2E5266/ffffff?text=AP',
      totalProjects: 142,
      experience: 38,
      readyToMove: 78,
      underConstruction: 52,
      newLaunch: 12,
    },
    {
      id: 6,
      name: 'Growthpoint Properties',
      logo: 'https://placehold.co/120x120/3B6978/ffffff?text=GP',
      totalProjects: 189,
      experience: 42,
      readyToMove: 105,
      underConstruction: 64,
      newLaunch: 20,
    },
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Top Developers in South Africa</h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            The top developers in South Africa offer expertise, high-quality construction, and a
            proven track record of timely delivery. Their projects offer a mix of ready-to-move
            homes, under-construction units, and new launches across key cities.
          </p>
        </div>

        {/* Developers Carousel */}
        <div className="relative group/carousel">
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-6">
              {developers.map(developer => (
                <CarouselItem key={developer.id} className="pl-6 md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white/50 backdrop-blur-sm group">
                    <CardContent className="p-6">
                      {/* Developer Header */}
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm border border-gray-100 group-hover:scale-105 transition-transform duration-300">
                          <img
                            src={developer.logo}
                            alt={developer.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xl mb-3 text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {developer.name}
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="font-bold text-xl text-gray-900">
                                {developer.totalProjects}
                              </div>
                              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Projects</div>
                            </div>
                            <div>
                              <div className="font-bold text-xl text-gray-900">
                                {developer.experience}
                              </div>
                              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Years Exp.</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Project Categories */}
                      <div className="space-y-3">
                        <Link href={`/developments?developer=${developer.id}&status=completed`}>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group/link">
                            <span className="text-sm font-medium text-gray-700 group-hover/link:text-blue-600 transition-colors">
                              Ready to Move ({developer.readyToMove})
                            </span>
                            <div className="h-6 w-6 rounded-full bg-gray-50 flex items-center justify-center group-hover/link:bg-blue-50 transition-colors">
                              <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover/link:text-blue-600 transition-colors" />
                            </div>
                          </div>
                        </Link>

                        <Link
                          href={`/developments?developer=${developer.id}&status=under_construction`}
                        >
                          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group/link">
                            <span className="text-sm font-medium text-gray-700 group-hover/link:text-blue-600 transition-colors">
                              Under Construction ({developer.underConstruction})
                            </span>
                            <div className="h-6 w-6 rounded-full bg-gray-50 flex items-center justify-center group-hover/link:bg-blue-50 transition-colors">
                              <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover/link:text-blue-600 transition-colors" />
                            </div>
                          </div>
                        </Link>

                        <Link href={`/developments?developer=${developer.id}&status=coming_soon`}>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group/link">
                            <span className="text-sm font-medium text-gray-700 group-hover/link:text-blue-600 transition-colors">
                              New Launch ({developer.newLaunch})
                            </span>
                            <div className="h-6 w-6 rounded-full bg-gray-50 flex items-center justify-center group-hover/link:bg-blue-50 transition-colors">
                              <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover/link:text-blue-600 transition-colors" />
                            </div>
                          </div>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/90 hover:bg-white text-blue-900 border-0 shadow-lg hover:scale-110" />
            <CarouselNext className="hidden md:flex -right-4 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 bg-white/90 hover:bg-white text-blue-900 border-0 shadow-lg hover:scale-110" />
          </Carousel>
        </div>

        {/* View All Link */}
        <div className="mt-8 text-center md:text-left">
          <Link href="/developments">
            <Button variant="link" className="text-lg font-semibold group text-blue-600 hover:text-blue-700 p-0 h-auto hover:no-underline">
              View All Real Estate Developers in South Africa
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
