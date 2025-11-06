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
    <section className="py-16 bg-background">
      <div className="container">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Top Developers in South Africa</h2>
          <p className="text-muted-foreground text-lg max-w-3xl">
            The top developers in South Africa offer expertise, high-quality construction, and a
            proven track record of timely delivery. Their projects offer a mix of ready-to-move
            homes, under-construction units, and new launches across key cities.
          </p>
        </div>

        {/* Developers Carousel */}
        <div className="relative">
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {developers.map(developer => (
                <CarouselItem key={developer.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full hover:shadow-xl transition-shadow duration-300">
                    <CardContent className="p-6">
                      {/* Developer Header */}
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <img
                            src={developer.logo}
                            alt={developer.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xl mb-2 line-clamp-2">{developer.name}</h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="font-bold text-2xl text-primary">
                                {developer.totalProjects}
                              </div>
                              <div className="text-muted-foreground text-xs">Total Projects</div>
                            </div>
                            <div>
                              <div className="font-bold text-2xl text-primary">
                                {developer.experience}
                              </div>
                              <div className="text-muted-foreground text-xs">Years Experience</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Project Categories */}
                      <div className="space-y-3">
                        <Link href={`/developments?developer=${developer.id}&status=completed`}>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group">
                            <span className="text-sm font-medium">
                              Ready to Move ({developer.readyToMove})
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </Link>

                        <Link
                          href={`/developments?developer=${developer.id}&status=under_construction`}
                        >
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group">
                            <span className="text-sm font-medium">
                              Under Construction ({developer.underConstruction})
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </Link>

                        <Link href={`/developments?developer=${developer.id}&status=coming_soon`}>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group">
                            <span className="text-sm font-medium">
                              New Launch ({developer.newLaunch})
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4" />
            <CarouselNext className="hidden md:flex -right-4" />
          </Carousel>
        </div>

        {/* View All Link */}
        <div className="mt-8">
          <Link href="/developments">
            <Button variant="link" className="text-lg font-semibold group">
              View All Real Estate Developers in South Africa
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
