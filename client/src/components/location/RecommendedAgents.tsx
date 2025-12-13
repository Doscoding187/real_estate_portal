import { trpc } from '@/lib/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Star, Verified, Phone } from 'lucide-react';
import { Link } from 'wouter';

interface RecommendedAgentsProps {
  locationType: 'province' | 'city' | 'suburb';
  locationId: number;
}

export function RecommendedAgents({ locationType, locationId }: RecommendedAgentsProps) {
  const { data: agents, isLoading } = trpc.monetization.getRecommendedAgents.useQuery({
    locationType,
    locationId
  });

  if (isLoading) return null;
  if (!agents || agents.length === 0) return null;

  return (
    <div className="py-12 bg-white">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Recommended Agents</h2>
            <p className="text-slate-500 mt-1">Top rated local experts ready to help you.</p>
          </div>
          <Link href="/agents">
            <Button variant="outline" size="sm">View All Agents</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/agent/${agent.id}`}>
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
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-white/90 text-slate-900 hover:bg-white shadow-sm flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {agent.rating ? (agent.rating / 20).toFixed(1) : '5.0'}
                      </Badge>
                    </div>
                    {agent.agency?.logo && (
                      <div className="absolute bottom-3 right-3 bg-white p-1 rounded shadow-sm opacity-90">
                         <img src={agent.agency.logo} alt={agent.agency.name} className="h-6 w-auto object-contain" />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                       <div>
                         <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2 group-hover:text-primary transition-colors">
                           {agent.firstName} {agent.lastName}
                           <Verified className="h-4 w-4 text-blue-500" />
                         </h3>
                         <p className="text-sm text-slate-500">{agent.agency?.name || 'Independent Agent'}</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-600 mt-4 pt-4 border-t border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-900 block">{agent.totalSales || 0}</span>
                        <span className="text-xs">Sold</span>
                      </div>
                      <div className="h-8 w-px bg-slate-100" />
                       <div>
                        <span className="font-semibold text-slate-900 block">Verified</span>
                        <span className="text-xs">Status</span>
                      </div>
                      <div className="ml-auto">
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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
