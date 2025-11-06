import { trpc } from '@/lib/trpc';
import { Navbar } from '@/components/Navbar';
import { Building2, MapPin, Star, Phone, Mail } from 'lucide-react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Agents() {
  const { data: agents, isLoading } = trpc.agents.list.useQuery();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0A2540] to-[#0F4C75] text-white py-16">
          <div className="container">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Find Your Agent</h1>
            <p className="text-lg text-gray-200 max-w-2xl">
              Connect with experienced real estate professionals who can help you find your dream
              property
            </p>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="container py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-32 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : agents && agents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map(agent => (
                <Link key={agent.id} href={`/agent/${agent.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardContent className="p-6">
                      {/* Agent Image */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0F4C75] to-[#3282B8] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                          {agent.firstName.charAt(0)}
                          {agent.lastName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1 truncate">
                            {agent.displayName || `${agent.firstName} ${agent.lastName}`}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <Building2 className="h-4 w-4" />
                            <span className="capitalize">{agent.role.replace('_', ' ')}</span>
                          </div>
                          {agent.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{agent.rating / 100}</span>
                              <span className="text-sm text-muted-foreground">
                                ({agent.reviewCount} reviews)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bio */}
                      {agent.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {agent.bio}
                        </p>
                      )}

                      {/* Specialization */}
                      {agent.specialization && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {JSON.parse(agent.specialization)
                            .slice(0, 3)
                            .map((spec: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t">
                        <div>
                          <div className="text-2xl font-bold text-[#0F4C75]">
                            {agent.totalSales || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Properties Sold</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-[#0F4C75]">
                            {agent.yearsExperience || 0}+
                          </div>
                          <div className="text-xs text-muted-foreground">Years Experience</div>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="space-y-2">
                        {agent.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{agent.phone}</span>
                          </div>
                        )}
                        {agent.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{agent.email}</span>
                          </div>
                        )}
                      </div>

                      {agent.isVerified === 1 && (
                        <Badge className="mt-4 bg-green-500">Verified Agent</Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No agents found</h3>
              <p className="text-muted-foreground">Check back soon for available agents</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0A2540] text-white py-8 mt-auto">
        <div className="container text-center text-sm text-gray-400">
          © 2025 Real Estate Portal. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
