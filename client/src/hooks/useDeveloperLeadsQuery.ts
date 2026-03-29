import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';

type Params = {
  developmentId?: number;
  owner?: 'developer_sales' | 'agency' | 'distribution_partner' | 'unassigned';
  source?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

const STAGE_GROUPS = {
  new: ['new'],
  contacted: ['contacted'],
  qualified: ['qualified'],
  viewing: ['viewing_scheduled', 'viewing_completed'],
  offer: ['offer_made'],
  deal: ['deal_in_progress'],
  won: ['closed_won'],
  lost: ['closed_lost', 'spam', 'duplicate', 'archived'],
} as const;

export function useDeveloperLeadsQuery(params: Params) {
  const query = trpc.developer.getLeads.useQuery(
    {
      developmentId: params.developmentId,
      owner: params.owner,
      source: params.source,
      q: params.q,
      from: params.from,
      to: params.to,
      limit: params.limit,
      offset: params.offset,
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const stageCounts = useMemo(() => {
    const counts = {
      new: 0,
      contacted: 0,
      qualified: 0,
      viewing: 0,
      offer: 0,
      deal: 0,
      won: 0,
      lost: 0,
    };

    for (const lead of items) {
      if (STAGE_GROUPS.new.includes(lead.stage as any)) counts.new += 1;
      else if (STAGE_GROUPS.contacted.includes(lead.stage as any)) counts.contacted += 1;
      else if (STAGE_GROUPS.qualified.includes(lead.stage as any)) counts.qualified += 1;
      else if (STAGE_GROUPS.viewing.includes(lead.stage as any)) counts.viewing += 1;
      else if (STAGE_GROUPS.offer.includes(lead.stage as any)) counts.offer += 1;
      else if (STAGE_GROUPS.deal.includes(lead.stage as any)) counts.deal += 1;
      else if (STAGE_GROUPS.won.includes(lead.stage as any)) counts.won += 1;
      else if (STAGE_GROUPS.lost.includes(lead.stage as any)) counts.lost += 1;
    }

    return counts;
  }, [items]);

  return {
    ...query,
    items,
    total,
    stageCounts,
  };
}

export function stageGroupMatches(
  group: keyof typeof STAGE_GROUPS,
  stage: string,
): boolean {
  return (STAGE_GROUPS[group] as readonly string[]).includes(stage);
}
