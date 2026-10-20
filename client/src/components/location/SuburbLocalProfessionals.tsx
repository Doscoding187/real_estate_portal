import { useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, BadgeCheck, Building2, UserRound } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface SuburbLocalProfessionalsProps {
  suburbId: number;
  suburbName: string;
}

export function SuburbLocalProfessionals({ suburbId, suburbName }: SuburbLocalProfessionalsProps) {
  const { data, isLoading, isError, refetch } = trpc.monetization.getRecommendedAgents.useQuery(
    { locationType: 'suburb', locationId: suburbId },
    { retry: false, staleTime: 300_000 },
  );

  const agents = useMemo(() => data ?? [], [data]);

  return (
    <section
      className="suburb-guide-professionals"
      aria-labelledby="suburb-guide-professionals-title"
    >
      <div className="suburb-guide-section-heading">
        <div>
          <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">LOCAL EXPERTS</p>
          <h2 id="suburb-guide-professionals-title">Agents serving {suburbName}</h2>
          <p>
            Public agent profiles that list this exact suburb as an area they serve. Agency details
            appear where the agent has a current verified affiliation.
          </p>
        </div>
        <Link className="suburb-guide-section-link" href="/agents">
          Browse agents <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {isLoading ? (
        <div
          className="suburb-guide-professionals__grid"
          role="status"
          aria-label="Loading local agents"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="suburb-guide-professional-card suburb-guide-professional-card--loading"
              key={index}
            />
          ))}
        </div>
      ) : isError ? (
        <div className="suburb-guide-professionals__state" role="alert">
          <p>Agent profiles for {suburbName} could not be loaded.</p>
          <button type="button" onClick={() => void refetch()}>
            Try again
          </button>
        </div>
      ) : agents.length === 0 ? (
        <div className="suburb-guide-professionals__state" role="status">
          <UserRound size={20} aria-hidden="true" />
          <p>No public agent profiles currently list {suburbName} as an area they serve.</p>
          <Link href="/agents">
            Browse all agents <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="suburb-guide-professionals__carousel group/suburb-agents">
          <Carousel opts={{ align: 'start', loop: agents.length > 4 }} className="w-full">
            <CarouselContent className="-ml-3 pb-2">
              {agents.map(agent => (
                <CarouselItem
                  key={agent.id}
                  className="basis-[88%] pl-3 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <Link className="suburb-guide-professional-card" href={`/agents/${agent.slug}`}>
                    <span className="suburb-guide-professional-card__portrait">
                      {agent.profileImage ? (
                        <img src={agent.profileImage} alt="" loading="lazy" />
                      ) : (
                        <UserRound size={23} aria-hidden="true" />
                      )}
                    </span>
                    <span className="suburb-guide-professional-card__copy">
                      <span className="suburb-guide-professional-card__name">
                        {agent.firstName} {agent.lastName}
                        {agent.isVerified ? (
                          <BadgeCheck size={15} aria-label="Verified agent" />
                        ) : null}
                      </span>
                      <span className="suburb-guide-professional-card__agency">
                        {agent.agencyName ? (
                          <>
                            {agent.agencyLogoUrl ? (
                              <img src={agent.agencyLogoUrl} alt="" loading="lazy" />
                            ) : (
                              <Building2 size={13} aria-hidden="true" />
                            )}
                            {agent.agencyName}
                          </>
                        ) : (
                          'Independent property professional'
                        )}
                      </span>
                      <span className="suburb-guide-professional-card__action">
                        View profile <ArrowRight size={13} aria-hidden="true" />
                      </span>
                    </span>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            {agents.length > 4 ? (
              <>
                <CarouselPrevious className="suburb-guide-carousel-arrow -left-3" />
                <CarouselNext className="suburb-guide-carousel-arrow -right-3" />
              </>
            ) : null}
          </Carousel>
        </div>
      )}
    </section>
  );
}
