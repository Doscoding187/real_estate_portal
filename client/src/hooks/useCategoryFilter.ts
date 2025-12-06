/**
 * Category Filter Hook
 * Manages category selection state with session persistence
 * Requirements: 4.4 - Category session persistence
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'explore_selected_category';

export function useCategoryFilter() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(() => {
    // Initialize from session storage
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : undefined;
  });

  // Persist to session storage whenever category changes
  useEffect(() => {
    if (selectedCategoryId !== undefined) {
      sessionStorage.setItem(STORAGE_KEY, selectedCategoryId.toString());
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedCategoryId]);

  const clearCategory = () => {
    setSelectedCategoryId(undefined);
  };

  return {
    selectedCategoryId,
    setSelectedCategoryId,
    clearCategory,
  };
}
