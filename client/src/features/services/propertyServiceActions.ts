export type ServiceAction = {
  category: 'home_improvement' | 'finance_legal' | 'moving' | 'inspection_compliance' | 'insurance';
  intentStage: 'buyer_offer_intent' | 'buyer_move_ready' | 'general';
  label: string;
  description: string;
  reasonKey: string;
};

export type ListingType = 'sale' | 'rent' | 'auction';

const SALE_ACTIONS: ServiceAction[] = [
  {
    category: 'finance_legal',
    intentStage: 'buyer_offer_intent',
    label: 'Finance & legal support',
    description: 'Bond originators, conveyancers, and transfer attorneys.',
    reasonKey: 'bond_or_transfer',
  },
  {
    category: 'inspection_compliance',
    intentStage: 'buyer_offer_intent',
    label: 'Inspection & compliance',
    description: 'Home inspections, compliance certs, and snag checks.',
    reasonKey: 'property_check',
  },
  {
    category: 'moving',
    intentStage: 'buyer_move_ready',
    label: 'Moving help',
    description: 'Pack, move, store, and relocate with vetted teams.',
    reasonKey: 'relocation',
  },
  {
    category: 'home_improvement',
    intentStage: 'buyer_move_ready',
    label: 'Repairs or improvements',
    description: 'Renovation, painting, electrical, and plumbing support.',
    reasonKey: 'fix_or_improve',
  },
] as const;

const RENT_ACTIONS: ServiceAction[] = [
  {
    category: 'inspection_compliance',
    intentStage: 'buyer_move_ready',
    label: 'Inspection & compliance',
    description: 'Pre-lease inspections and compliance certification.',
    reasonKey: 'property_check',
  },
  {
    category: 'moving',
    intentStage: 'buyer_move_ready',
    label: 'Moving help',
    description: 'Pack, move, store, and relocate with vetted teams.',
    reasonKey: 'relocation',
  },
  {
    category: 'insurance',
    intentStage: 'buyer_move_ready',
    label: 'Insurance support',
    description: 'Compare cover options for property and contents.',
    reasonKey: 'cover_protection',
  },
  {
    category: 'home_improvement',
    intentStage: 'buyer_move_ready',
    label: 'Repairs or improvements',
    description: 'Renovation, painting, electrical, and plumbing support.',
    reasonKey: 'fix_or_improve',
  },
] as const;

const AUCTION_ACTIONS: ServiceAction[] = [
  {
    category: 'finance_legal',
    intentStage: 'buyer_offer_intent',
    label: 'Finance & legal support',
    description: 'Bond originators, conveyancers, and transfer attorneys.',
    reasonKey: 'bond_or_transfer',
  },
  {
    category: 'inspection_compliance',
    intentStage: 'buyer_offer_intent',
    label: 'Inspection & compliance',
    description: 'Pre-auction inspections and compliance certs.',
    reasonKey: 'property_check',
  },
  {
    category: 'moving',
    intentStage: 'buyer_move_ready',
    label: 'Moving help',
    description: 'Pack, move, store, and relocate with vetted teams.',
    reasonKey: 'relocation',
  },
  {
    category: 'insurance',
    intentStage: 'buyer_offer_intent',
    label: 'Insurance support',
    description: 'Compare cover options for property and contents.',
    reasonKey: 'cover_protection',
  },
] as const;

export function getServiceActionsForListing(
  listingType: string | undefined | null,
  isDevelopmentLinked?: boolean,
): ServiceAction[] {
  const normalized = String(listingType || '').toLowerCase().trim();

  let actions: readonly ServiceAction[];
  if (normalized === 'rent') {
    actions = RENT_ACTIONS;
  } else if (normalized === 'auction') {
    actions = AUCTION_ACTIONS;
  } else if (normalized === 'sale') {
    actions = SALE_ACTIONS;
  } else {
    return [];
  }

  if (isDevelopmentLinked) {
    if (!actions.some(a => a.category === 'finance_legal')) {
      actions = [
        {
          category: 'finance_legal',
          intentStage: 'buyer_offer_intent',
          label: 'Finance & legal support',
          description: 'Bond originators, conveyancers, and transfer attorneys.',
          reasonKey: 'bond_or_transfer',
        },
        ...actions,
      ];
    }
  }

  return actions.slice(0, 4).map(a => ({ ...a }));
}

export function reasonKeyToLabel(reasonKey: string | null | undefined): string | null {
  const map: Record<string, string> = {
    bond_or_transfer: 'Financing this property',
    property_check: 'Inspecting this property',
    relocation: 'Moving into this property',
    fix_or_improve: 'Improving this property',
    cover_protection: 'Insuring this property',
  };
  return map[String(reasonKey || '')] || null;
}
