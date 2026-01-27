import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SearchCriteria {
  city?: string;
  propertyType?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  [key: string]: any;
}

interface GuestActivity {
  viewedProperties: number[];
  favoriteProperties: number[];
  recentSearches: SearchCriteria[];
  lastUpdated: string;
}

interface GuestActivityContextType {
  viewedProperties: number[];
  favoriteProperties: number[];
  recentSearches: SearchCriteria[];
  addViewedProperty: (propertyId: number) => void;
  addGuestFavorite: (propertyId: number) => void;
  removeGuestFavorite: (propertyId: number) => void;
  isGuestFavorite: (propertyId: number) => boolean;
  addGuestSearch: (criteria: SearchCriteria) => void;
  getActivityCounts: () => { viewed: number; favorites: number; searches: number };
  clearGuestData: () => void;
  getGuestData: () => GuestActivity;
}

const GuestActivityContext = createContext<GuestActivityContextType | undefined>(undefined);

const STORAGE_KEY = 'guestActivity';
const MAX_VIEWED = 50; // Keep last 50 viewed
const MAX_SEARCHES = 10; // Keep last 10 searches

function loadGuestActivity(): GuestActivity {
  if (typeof window === 'undefined') {
    return {
      viewedProperties: [],
      favoriteProperties: [],
      recentSearches: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load guest activity:', error);
  }

  return {
    viewedProperties: [],
    favoriteProperties: [],
    recentSearches: [],
    lastUpdated: new Date().toISOString(),
  };
}

function saveGuestActivity(activity: GuestActivity) {
  if (typeof window === 'undefined') return;

  try {
    activity.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activity));
  } catch (error) {
    console.error('Failed to save guest activity:', error);
  }
}

export function GuestActivityProvider({ children }: { children: ReactNode }) {
  const [activity, setActivity] = useState<GuestActivity>(loadGuestActivity);

  // Save to localStorage whenever activity changes
  useEffect(() => {
    saveGuestActivity(activity);
  }, [activity]);

  const addViewedProperty = (propertyId: number) => {
    setActivity(prev => {
      // Don't add if already at the top
      if (prev.viewedProperties[0] === propertyId) return prev;

      // Remove if exists, then add to front
      const filtered = prev.viewedProperties.filter(id => id !== propertyId);
      const updated = [propertyId, ...filtered].slice(0, MAX_VIEWED);

      return { ...prev, viewedProperties: updated };
    });
  };

  const addGuestFavorite = (propertyId: number) => {
    setActivity(prev => {
      if (prev.favoriteProperties.includes(propertyId)) return prev;
      return {
        ...prev,
        favoriteProperties: [...prev.favoriteProperties, propertyId],
      };
    });
  };

  const removeGuestFavorite = (propertyId: number) => {
    setActivity(prev => ({
      ...prev,
      favoriteProperties: prev.favoriteProperties.filter(id => id !== propertyId),
    }));
  };

  const isGuestFavorite = (propertyId: number) => {
    return activity.favoriteProperties.includes(propertyId);
  };

  const addGuestSearch = (criteria: SearchCriteria) => {
    setActivity(prev => {
      // Check if similar search already exists
      const isDuplicate = prev.recentSearches.some(
        search => JSON.stringify(search) === JSON.stringify(criteria),
      );

      if (isDuplicate) return prev;

      const updated = [criteria, ...prev.recentSearches].slice(0, MAX_SEARCHES);
      return { ...prev, recentSearches: updated };
    });
  };

  const getActivityCounts = () => ({
    viewed: activity.viewedProperties.length,
    favorites: activity.favoriteProperties.length,
    searches: activity.recentSearches.length,
  });

  const clearGuestData = () => {
    const empty: GuestActivity = {
      viewedProperties: [],
      favoriteProperties: [],
      recentSearches: [],
      lastUpdated: new Date().toISOString(),
    };
    setActivity(empty);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const getGuestData = () => activity;

  return (
    <GuestActivityContext.Provider
      value={{
        viewedProperties: activity.viewedProperties,
        favoriteProperties: activity.favoriteProperties,
        recentSearches: activity.recentSearches,
        addViewedProperty,
        addGuestFavorite,
        removeGuestFavorite,
        isGuestFavorite,
        addGuestSearch,
        getActivityCounts,
        clearGuestData,
        getGuestData,
      }}
    >
      {children}
    </GuestActivityContext.Provider>
  );
}

export function useGuestActivity() {
  const context = useContext(GuestActivityContext);
  if (!context) {
    throw new Error('useGuestActivity must be used within GuestActivityProvider');
  }
  return context;
}
