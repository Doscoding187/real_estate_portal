import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { LocationNode } from '@/types/location';
import type { SearchAreaDiscoveryResult } from '@shared/searchDiscovery';

export type HomeSearchFilters = {
  propertyType: string;
  priceMin: string;
  priceMax: string;
  minBedrooms: string;
  minBathrooms: string;
  budgetMax: string;
  developmentType: string;
  developmentStatus: string;
  market: string;
  maxPrice: string;
  classification: string;
  commercialMinAreaM2: string;
  commercialMaxMonthlyBudget: string;
  commercialAvailability: string;
  commercialMinParkingBays: string;
};
export const EMPTY_HOME_SEARCH_FILTERS: HomeSearchFilters = {
  propertyType: '',
  priceMin: '',
  priceMax: '',
  minBedrooms: '',
  minBathrooms: '',
  budgetMax: '',
  developmentType: '',
  developmentStatus: '',
  market: '',
  maxPrice: '',
  classification: '',
  commercialMinAreaM2: '',
  commercialMaxMonthlyBudget: '',
  commercialAvailability: '',
  commercialMinParkingBays: '',
};
export type HomeAreaSelection = {
  locations: LocationNode[];
  searchArea: SearchAreaDiscoveryResult | null;
};
type HomeSearchState = {
  locations: LocationNode[];
  setLocations: Dispatch<SetStateAction<LocationNode[]>>;
  searchArea: SearchAreaDiscoveryResult | null;
  setSearchArea: Dispatch<SetStateAction<SearchAreaDiscoveryResult | null>>;
  filters: HomeSearchFilters;
  setFilters: Dispatch<SetStateAction<HomeSearchFilters>>;
  confirmedBroadId: string | null;
  setConfirmedBroadId: Dispatch<SetStateAction<string | null>>;
  journey: string;
  onJourneyChange: (journey: string) => void;
};
const HomeSearchContext = createContext<HomeSearchState | null>(null);
export function HomeSearchProvider({
  children,
  journey,
  onJourneyChange,
}: {
  children: ReactNode;
  journey: string;
  onJourneyChange: (journey: string) => void;
}) {
  const [confirmedBroadId, setConfirmedBroadId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [searchArea, setSearchArea] = useState<SearchAreaDiscoveryResult | null>(null);
  const [filters, setFilters] = useState<HomeSearchFilters>(EMPTY_HOME_SEARCH_FILTERS);
  return (
    <HomeSearchContext.Provider
      value={{
        locations,
        setLocations,
        searchArea,
        setSearchArea,
        filters,
        setFilters,
        confirmedBroadId,
        setConfirmedBroadId,
        journey,
        onJourneyChange,
      }}
    >
      {children}
    </HomeSearchContext.Provider>
  );
}
export const useHomeSearch = () => useContext(HomeSearchContext);
