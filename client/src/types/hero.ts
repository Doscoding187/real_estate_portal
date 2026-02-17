export type HeroTab =
  | 'buy'
  | 'rent'
  | 'developments'
  | 'shared_living'
  | 'plot_land'
  | 'commercial';

export type HeroUiTab = HeroTab | 'agents';

export function normalizeHeroUiTab(raw: string): HeroUiTab {
  const value = String(raw || '')
    .trim()
    .toLowerCase();

  if (value === 'buy') return 'buy';
  if (value === 'rent' || value === 'rental') return 'rent';
  if (value === 'developments' || value === 'projects') return 'developments';
  if (value.includes('shared') || value === 'pg') return 'shared_living';
  if (value.includes('plot')) return 'plot_land';
  if (value === 'commercial') return 'commercial';
  if (value === 'agents') return 'agents';
  return 'buy';
}

export function toEnhancedHeroTabLabel(tab: HeroTab): string {
  if (tab === 'buy') return 'Buy';
  if (tab === 'rent') return 'Rent';
  if (tab === 'developments') return 'Developments';
  if (tab === 'shared_living') return 'Shared Living';
  if (tab === 'plot_land') return 'Plot & Land';
  return 'Commercial';
}

