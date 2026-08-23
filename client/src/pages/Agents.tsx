import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Building2, Phone, Mail, Search, MapPin } from 'lucide-react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HomeLayout } from '@/layouts/HomeLayout';
import { parseDelimitedList } from '@/lib/agentPresence';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Property Practitioner',
  principal_agent: 'Principal Property Practitioner',
  broker: 'Property Broker',
};

function agentDisplayName(agent: {
  displayName?: string | null;
  firstName: string;
  lastName: string;
}) {
  return agent.displayName?.trim() || `${agent.firstName} ${agent.lastName}`.trim() || 'Agent';
}

function matchesSearch(
  agent: Parameters<typeof agentDisplayName>[0] & {
    specialization?: string | null;
    areasServed?: string | null;
  },
  query: string,
) {
  const haystack = [
    agentDisplayName(agent),
    ...parseDelimitedList(agent.specialization),
    ...parseDelimitedList(agent.areasServed),
  ]
    .join(' ')
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(term => haystack.includes(term));
}

export default function Agents() {
  const [searchQuery, setSearchQuery] = useState('');
  const agentsQuery = trpc.agent.list.useQuery();
  const agents = agentsQuery.data;

  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    const query = searchQuery.trim();
    if (!query) return agents;
    return agents.filter(agent => matchesSearch(agent, query));
  }, [agents, searchQuery]);

  return (
    <HomeLayout>
      <main className="flex-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0A2540] to-[#0F4C75] text-white py-16">
          <div className="container">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Find Your Agent</h1>
                <p className="text-lg text-gray-200 max-w-2xl">
                  Connect with experienced real estate professionals who can help you find your dream
                  property
                </p>
              </div>
              <a
                href="/advertise/sell/agents"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Are you an agent? Get your own presence
              </a>
            </div>
            {agents && agents.length > 0 && (
              <div className="mt-8 max-w-xl relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="Search by name, specialization or area"
                  aria-label="Search agents"
                  className="pl-9 bg-white/95 text-foreground"
                />
              </div>
            )}
          </div>
        </div>

        {/* Agents Grid */}
        <div className="container py-12">
          {agentsQuery.isLoading ? (
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
          ) : agentsQuery.isError ? (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Something went wrong</h3>
              <p className="text-muted-foreground mb-6">
                We could not load the agent directory right now. Please try again.
              </p>
              <Button variant="outline" onClick={() => void agentsQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : filteredAgents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map(agent => {
                const specializations = parseDelimitedList(agent.specialization);
                const areasServed = parseDelimitedList(agent.areasServed);
                const name = agentDisplayName(agent);
                return (
                  <Link key={agent.id} href={`/agents/${agent.slug}`} data-testid="agent-card">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <CardContent className="p-6 flex flex-col h-full">
                        {/* Agent Identity */}
                        <div className="flex items-start gap-4 mb-4">
                          {agent.profileImage ? (
                            <img
                              src={agent.profileImage}
                              alt={name}
                              className="w-20 h-20 rounded-full object-cover flex-shrink-0 border border-border"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0F4C75] to-[#3282B8] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                              {agent.firstName?.charAt(0) || '?'}
                              {agent.lastName?.charAt(0) || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1 truncate">{name}</h3>
                            {agent.role && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                <Building2 className="h-4 w-4" />
                                <span>
                                  {ROLE_LABELS[agent.role] || agent.role.replace(/_/g, ' ')}
                                </span>
                              </div>
                            )}
                            {typeof agent.yearsExperience === 'number' &&
                              agent.yearsExperience > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  {agent.yearsExperience}+ years experience
                                </p>
                              )}
                          </div>
                        </div>

                        {/* Bio */}
                        {agent.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {agent.bio}
                          </p>
                        )}

                        {/* Specializations */}
                        {specializations.length > 0 && (
                          <div
                            className="flex flex-wrap gap-2 mb-4"
                            data-testid="agent-specializations"
                          >
                            {specializations.slice(0, 3).map(spec => (
                              <Badge key={spec} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Areas Served */}
                        {areasServed.length > 0 && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{areasServed.join(' · ')}</span>
                          </div>
                        )}

                        {/* Contact */}
                        <div className="space-y-2 mt-auto pt-4 border-t">
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
                          {agent.isVerified === 1 && (
                            <Badge className="mt-2 bg-green-500">Verified Agent</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : searchQuery.trim() ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No agents match your search</h3>
              <p className="text-muted-foreground mb-6">
                Try a different name, specialization or area.
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
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
    </HomeLayout>
  );
}
