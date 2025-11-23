import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ComparisonContextType {
  comparedProperties: number[];
  addToComparison: (propertyId: number) => void;
  removeFromComparison: (propertyId: number) => void;
  clearComparison: () => void;
  isInComparison: (propertyId: number) => boolean;
  canAddMore: boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const MAX_COMPARISON = 4;
const STORAGE_KEY = 'property-comparison';

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [comparedProperties, setComparedProperties] = useState<number[]>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // Persist to localStorage whenever comparison changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(comparedProperties));
    }
  }, [comparedProperties]);

  const addToComparison = (propertyId: number) => {
    setComparedProperties((prev) => {
      if (prev.includes(propertyId) || prev.length >= MAX_COMPARISON) {
        return prev;
      }
      return [...prev, propertyId];
    });
  };

  const removeFromComparison = (propertyId: number) => {
    setComparedProperties((prev) => prev.filter((id) => id !== propertyId));
  };

  const clearComparison = () => {
    setComparedProperties([]);
  };

  const isInComparison = (propertyId: number) => {
    return comparedProperties.includes(propertyId);
  };

  const canAddMore = comparedProperties.length < MAX_COMPARISON;

  return (
    <ComparisonContext.Provider
      value={{
        comparedProperties,
        addToComparison,
        removeFromComparison,
        clearComparison,
        isInComparison,
        canAddMore,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparison must be used within ComparisonProvider');
  }
  return context;
}
