import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { LocationNode } from '@/types/location';

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
};
type HomeSearchState = {
  locations: LocationNode[];
  setLocations: Dispatch<SetStateAction<LocationNode[]>>;
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
  const [filters, setFilters] = useState<HomeSearchFilters>(EMPTY_HOME_SEARCH_FILTERS);
  return (
    <HomeSearchContext.Provider
      value={{
        locations,
        setLocations,
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
