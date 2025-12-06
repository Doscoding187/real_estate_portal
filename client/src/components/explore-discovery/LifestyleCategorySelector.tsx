/**
 * Lifestyle Category Selector Component
 * Horizontal scrollable category chips for filtering Explore content
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface Category {
  id: number;
  name: string;
  icon: string;
  description: string | null;
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
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['exploreCategories'],
    queryFn: async () => {
      // TODO: Replace with actual tRPC call
      // const response = await apiClient.exploreApi.getCategories.query();
      // return response;
      
      // Mock data for now
      return [
        { id: 1, name: 'Secure Estates', icon: '🔒', description: 'Gated communities with 24/7 security' },
        { id: 2, name: 'Luxury', icon: '💎', description: 'High-end properties with premium finishes' },
        { id: 3, name: 'Family Living', icon: '👨‍👩‍👧‍👦', description: 'Family-friendly homes near schools' },
        { id: 4, name: 'Student Living', icon: '🎓', description: 'Accommodation near universities' },
        { id: 5, name: 'Urban Living', icon: '🏙️', description: 'City center apartments and lofts' },
        { id: 6, name: 'Pet-Friendly', icon: '🐕', description: 'Properties that welcome pets' },
        { id: 7, name: 'Retirement', icon: '🌅', description: 'Peaceful retirement communities' },
        { id: 8, name: 'Investment', icon: '📈', description: 'High-yield investment properties' },
        { id: 9, name: 'Eco-Friendly', icon: '🌱', description: 'Sustainable and green homes' },
        { id: 10, name: 'Beach Living', icon: '🏖️', description: 'Coastal properties with ocean views' },
      ];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Persist category selection in session storage (Requirement 4.4)
  useEffect(() => {
    if (selectedCategoryId !== undefined) {
      sessionStorage.setItem('explore_selected_category', selectedCategoryId.toString());
    } else {
      sessionStorage.removeItem('explore_selected_category');
    }
  }, [selectedCategoryId]);

  // Restore category from session on mount
  useEffect(() => {
    const savedCategory = sessionStorage.getItem('explore_selected_category');
    if (savedCategory && !selectedCategoryId) {
      onCategoryChange(parseInt(savedCategory, 10));
    }
  }, []);

  const handleCategoryClick = (categoryId: number) => {
    // Toggle: if already selected, clear selection
    if (selectedCategoryId === categoryId) {
      onCategoryChange(undefined);
    } else {
      onCategoryChange(categoryId);
    }
  };

  const handleClearCategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCategoryChange(undefined);
  };

  if (isLoading) {
    return (
      <div className={`flex gap-2 overflow-x-auto scrollbar-hide ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-10 w-32 bg-gray-200 rounded-full animate-pulse"
          />
        ))}
      </div>
    );
  }

  const isDark = variant === 'dark';

  return (
    <div className={`flex items-center gap-2 overflow-x-auto scrollbar-hide ${className}`}>
      {/* "All" button */}
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
        <span>🏠</span>
        <span>All</span>
      </button>

      {/* Category buttons */}
      {categories?.map((category) => (
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
          <span>{category.icon}</span>
          <span>{category.name}</span>
          {selectedCategoryId === category.id && (
            <X
              className="w-4 h-4 ml-1"
              onClick={handleClearCategory}
              aria-label="Clear filter"
            />
          )}
        </button>
      ))}
    </div>
  );
}
