export type WorkclassDevelopmentFitInput = {
  developmentId: number;
  developmentName: string;
  opportunityStatus: 'ready' | 'pending_setup' | 'blocked';
  priceFrom?: number | null;
  priceTo?: number | null;
  buyerBudget?: number | null;
  buyerLocation?: string | null;
  developmentLocation?: string | null;
  requiredDocumentsCount?: number | null;
  hasManagerAssigned?: boolean;
};

export type WorkclassDevelopmentFit = WorkclassDevelopmentFitInput & {
  fitScore: number;
  fitReasons: string[];
};

function normalize(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

function budgetFits(input: WorkclassDevelopmentFitInput) {
  const budget = Number(input.buyerBudget || 0);
  if (!Number.isFinite(budget) || budget <= 0) return false;
  const priceFrom = Number(input.priceFrom || 0);
  if (Number.isFinite(priceFrom) && priceFrom > 0) return budget >= priceFrom;
  const priceTo = Number(input.priceTo || 0);
  return Number.isFinite(priceTo) && priceTo > 0 ? budget <= priceTo : false;
}

export function rankWorkclassDevelopmentFits(
  opportunities: WorkclassDevelopmentFitInput[],
): WorkclassDevelopmentFit[] {
  return opportunities
    .map(opportunity => {
      let fitScore = 0;
      const fitReasons: string[] = [];

      if (opportunity.opportunityStatus === 'ready') {
        fitScore += 50;
        fitReasons.push('Ready for buyer submission');
      }

      if (budgetFits(opportunity)) {
        fitScore += 25;
        fitReasons.push('Fits buyer budget');
      }

      const buyerLocation = normalize(opportunity.buyerLocation);
      const developmentLocation = normalize(opportunity.developmentLocation);
      if (buyerLocation && developmentLocation && developmentLocation.includes(buyerLocation)) {
        fitScore += 15;
        fitReasons.push('Matches preferred area');
      }

      if (opportunity.hasManagerAssigned) {
        fitScore += 5;
        fitReasons.push('Manager coverage in place');
      }

      if (Number(opportunity.requiredDocumentsCount || 0) > 0) {
        fitScore += 5;
        fitReasons.push('Required documents are defined');
      }

      return {
        ...opportunity,
        fitScore,
        fitReasons,
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore || a.developmentName.localeCompare(b.developmentName));
}
