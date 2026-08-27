import { trpc } from '@/lib/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Verified } from 'lucide-react';
import { Link } from 'wouter';

interface RecommendedAgentsProps {
  locationType: 'province' | 'city' | 'suburb';
  locationId: number;
  areaLabel?: string;
}

type AgentRecommendation = {
  id: number;
  slug: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  agencyName: string | null;
  agencyLogoUrl: string | null;
  isVerified: boolean;
};

export function RecommendedAgents({ locationType, locationId, areaLabel }: RecommendedAgentsProps) {
  const { data: agents, isLoading } = trpc.monetization.getRecommendedAgents.useQuery({
    locationType,
    locationId,
  });

  if (isLoading) return null;
  if (!agents || agents.length === 0) return null;

  const recommendations = agents as AgentRecommendation[];
  const heading = areaLabel
    ? `Property professionals serving ${areaLabel}`
    : 'Property professionals in this area';

  return (
    <div className="py-12 bg-white">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-green-600">
              <User className="h-5 w-5" />
              <span className="font-semibold uppercase tracking-wider text-sm">Local Experts</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">{heading}</h2>
            <p className="text-slate-500 mt-2 max-w-2xl">
              Approved practitioners with public Property Listify profiles who explicitly serve this
              area
            </p>
          </div>
          <Link href="/agents">
            <Button variant="outline" size="sm">
              View All Agents
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {recommendations.map(agent => (
            <Link key={agent.id} href={`/agents/${agent.slug}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer group border-slate-200">
                <CardContent className="p-0">
                  <div className="relative h-48 bg-slate-100 overflow-hidden rounded-t-xl">
                    {agent.profileImage ? (
                      <img
                        src={agent.profileImage}
                        alt={`${agent.firstName} ${agent.lastName}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <User className="h-20 w-20 text-slate-300" />
                      </div>
                    )}
                    {agent.agencyLogoUrl && (
                      <div className="absolute bottom-3 right-3 bg-white p-1 rounded shadow-sm opacity-90">
                        <img
                          src={agent.agencyLogoUrl}
                          alt={agent.agencyName || 'Agency'}
                          className="h-6 w-auto object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2 group-hover:text-primary transition-colors truncate">
                          {agent.firstName} {agent.lastName}
                          {agent.isVerified && (
                            <Verified className="h-4 w-4 shrink-0 text-blue-500" aria-label="Verified" />
                          )}
                        </h3>
                        <p className="text-sm text-slate-500 truncate">
                          {agent.agencyName || 'Independent Agent'}
                        </p>
                      </div>
                    </div>

                    {agent.isVerified && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-4 pt-4 border-t border-slate-100">
                        <Badge
                          variant="outline"
                          className="rounded-full border-blue-200 bg-blue-50 text-blue-700"
                        >
                          Verified
                        </Badge>
                        <span className="text-xs">Evidence-based status</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
