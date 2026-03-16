/**
 * Lifestyle Category Selector Component
 * Horizontal scrollable category chips for filtering Explore content.
 */

import { X } from 'lucide-react';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';

interface Category {
  id: number;
  key?: string;
  name: string;
  description?: string | null;
}

interface LifestyleCategorySelectorProps {
  selectedCategoryId?: number;
  onCategoryChange: (categoryId: number | undefined) => void;
  variant?: 'light' | 'dark';
  className?: string;
}

export function LifestyleCategorySelector({
  selectedCategoryId,
  onCategoryChange,
  variant = 'light',
  className = '',
}: LifestyleCategorySelectorProps) {
  const categoriesQuery = trpc.explore.getCategories.useQuery();
  const categories = (categoriesQuery.data || []) as Category[];
  const isLoading = categoriesQuery.isLoading;

  useEffect(() => {
    if (selectedCategoryId !== undefined) {
      sessionStorage.setItem('explore_selected_category', selectedCategoryId.toString());
    } else {
      sessionStorage.removeItem('explore_selected_category');
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    const savedCategory = sessionStorage.getItem('explore_selected_category');
    if (savedCategory && !selectedCategoryId) {
      onCategoryChange(parseInt(savedCategory, 10));
    }
  }, [onCategoryChange, selectedCategoryId]);

  const handleCategoryClick = (categoryId: number) => {
    if (selectedCategoryId === categoryId) {
      onCategoryChange(undefined);
      return;
    }
    onCategoryChange(categoryId);
  };

  const handleClearCategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCategoryChange(undefined);
  };

  if (isLoading) {
    return (
      <div className={`flex gap-2 overflow-x-auto scrollbar-hide ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 w-32 bg-gray-200 rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  const isDark = variant === 'dark';

  return (
    <div className={`flex items-center gap-2 overflow-x-auto scrollbar-hide ${className}`}>
      <button
        onClick={() => onCategoryChange(undefined)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
          selectedCategoryId === undefined
            ? isDark
              ? 'bg-white text-black shadow-md'
              : 'bg-blue-600 text-white shadow-md'
            : isDark
              ? 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
        }`}
        aria-label="Show all categories"
        aria-pressed={selectedCategoryId === undefined}
      >
        <span>All</span>
      </button>

      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => handleCategoryClick(category.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            selectedCategoryId === category.id
              ? isDark
                ? 'bg-white text-black shadow-md'
                : 'bg-blue-600 text-white shadow-md'
              : isDark
                ? 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
          aria-label={`Filter by ${category.name}`}
          aria-pressed={selectedCategoryId === category.id}
          title={category.description || undefined}
        >
          <span>{category.name}</span>
          {selectedCategoryId === category.id && (
            <X className="w-4 h-4 ml-1" onClick={handleClearCategory} aria-label="Clear filter" />
          )}
        </button>
      ))}
    </div>
  );
}
