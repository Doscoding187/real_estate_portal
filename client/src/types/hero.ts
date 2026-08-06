import {
  normalizePublicHeroJourney,
  type PublicHeroJourneyDefinition,
  type PublicHeroJourneyKey,
} from '@/lib/publicNavigation';

export type HeroTab = Exclude<PublicHeroJourneyKey, 'find_agent'>;
export type HeroUiTab = PublicHeroJourneyKey;
export type HeroJourneyDefinition = PublicHeroJourneyDefinition;

export function normalizeHeroUiTab(raw: string): HeroUiTab | '' {
  return normalizePublicHeroJourney(raw) || '';
}

export function toEnhancedHeroTabLabel(tab: HeroTab): string {
  if (tab === 'buy') return 'Buy';
  if (tab === 'rent') return 'Rent';
  if (tab === 'developments') return 'Developments';
  if (tab === 'shared_living') return 'Shared Living';
  if (tab === 'plot_land') return 'Plots & Land';
  return 'Commercial';
}
