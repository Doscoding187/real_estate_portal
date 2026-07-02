import type {
  IntentStage,
  ServiceCategory,
} from '@/features/services/catalog';

export type PropertyServiceAction = {
  category: ServiceCategory;
  intentStage: IntentStage;
  label: string;
  description: string;
  reasonKey: string;
};

type PropertyServiceActionInput = {
  listingType?: string | null;
  isDevelopmentLinked?: boolean;
};

const SALE_ACTIONS: PropertyServiceAction[] = [
  {
    category: 'finance_legal',
    intentStage: 'buyer_offer_intent',
    label: 'Finance & legal support',
    description: 'Get help with bond readiness, transfer, and legal steps.',
    reasonKey: 'buyer_finance_legal',
  },
  {
    category: 'inspection_compliance',
    intentStage: 'buyer_offer_intent',
    label: 'Inspection & compliance',
    description: 'Arrange checks before you commit to the property.',
    reasonKey: 'buyer_inspection',
  },
  {
    category: 'insurance',
    intentStage: 'buyer_offer_intent',
    label: 'Insurance support',
    description: 'Explore property and contents cover for this purchase.',
    reasonKey: 'buyer_insurance',
  },
  {
    category: 'moving',
    intentStage: 'buyer_move_ready',
    label: 'Moving help',
    description: 'Plan your move once the property journey progresses.',
    reasonKey: 'buyer_moving',
  },
];

const RENT_ACTIONS: PropertyServiceAction[] = [
  {
    category: 'moving',
    intentStage: 'buyer_move_ready',
    label: 'Moving help',
    description: 'Compare moving and relocation support for this rental.',
    reasonKey: 'renter_moving',
  },
  {
    category: 'insurance',
    intentStage: 'buyer_move_ready',
    label: 'Insurance support',
    description: 'Explore contents and rental-related cover.',
    reasonKey: 'renter_insurance',
  },
  {
    category: 'inspection_compliance',
    intentStage: 'buyer_move_ready',
    label: 'Inspection & compliance',
    description: 'Get help checking the property before moving in.',
    reasonKey: 'renter_inspection',
  },
  {
    category: 'home_improvement',
    intentStage: 'buyer_move_ready',
    label: 'Repairs or improvements',
    description: 'Find help for approved maintenance or move-in work.',
    reasonKey: 'renter_improvements',
  },
];

const AUCTION_ACTIONS: PropertyServiceAction[] = [
  {
    category: 'finance_legal',
    intentStage: 'buyer_offer_intent',
    label: 'Finance & legal support',
    description: 'Prepare for auction finance, conditions, and transfer.',
    reasonKey: 'auction_finance_legal',
  },
  {
    category: 'inspection_compliance',
    intentStage: 'buyer_offer_intent',
    label: 'Inspection & compliance',
    description: 'Arrange property checks before bidding.',
    reasonKey: 'auction_inspection',
  },
  {
    category: 'insurance',
    intentStage: 'buyer_offer_intent',
    label: 'Insurance support',
    description: 'Plan appropriate cover for an auction purchase.',
    reasonKey: 'auction_insurance',
  },
  {
    category: 'home_improvement',
    intentStage: 'buyer_offer_intent',
    label: 'Repairs or improvements',
    description: 'Assess renovation or repair support after purchase.',
    reasonKey: 'auction_improvements',
  },
];

export function getPropertyServiceActions({
  listingType,
  isDevelopmentLinked = false,
}: PropertyServiceActionInput): PropertyServiceAction[] {
  const normalizedListingType = String(listingType || '')
    .trim()
    .toLowerCase();

  let actions: PropertyServiceAction[];

  switch (normalizedListingType) {
    case 'sale':
      actions = SALE_ACTIONS;
      break;
    case 'rent':
    case 'rental':
      actions = RENT_ACTIONS;
      break;
    case 'auction':
      actions = AUCTION_ACTIONS;
      break;
    default:
      return [];
  }

  if (!isDevelopmentLinked) {
    return actions.slice(0, 4);
  }

  return actions
    .map(action =>
      action.category === 'finance_legal'
        ? {
            ...action,
            description: 'Get help with finance, transfer, and development purchase steps.',
            reasonKey: 'development_finance_legal',
          }
        : action,
    )
    .slice(0, 4);
}
