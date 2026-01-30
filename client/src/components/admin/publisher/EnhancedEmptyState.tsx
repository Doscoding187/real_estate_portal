import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { publisherTheme, gradients, animations } from '@/lib/publisherTheme';
import {
  Building2,
  Home,
  Users,
  Plus,
  Search,
  Filter,
  TrendingUp,
  MapPin,
  FileText,
  Inbox,
  Settings,
  ArrowRight,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';

interface EmptyStateProps {
  type: 'developments' | 'leads' | 'brands' | 'properties' | 'search' | 'filter';
  title: string;
  description: string;
  actionText?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
  illustration?: 'custom';
}

// Custom SVG illustrations
const EmptyDevelopmentsIllustration = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full max-w-xs mx-auto">
    <defs>
      <linearGradient id="buildGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    <rect x="30" y="120" width="140" height="60" rx="8" fill="#e5e7eb" />
    <rect x="40" y="80" width="30" height="40" rx="4" fill="#f3f4f6" />
    <rect x="80" y="90" width="30" height="30" rx="4" fill="#f3f4f6" />
    <rect x="120" y="85" width="30" height="35" rx="4" fill="#f3f4f6" />
    <path d="M50 100 L60 100 L60 120 L50 120 Z" fill="url(#buildGrad)" />
    <path d="M90 110 L100 110 L100 120 L90 120 Z" fill="url(#buildGrad)" />
    <path d="M130 105 L140 105 L140 120 L130 120 Z" fill="url(#buildGrad)" />
    <circle cx="55" cy="150" r="3" fill="#4f46e5" opacity="0.6" />
    <circle cx="95" cy="150" r="3" fill="#4f46e5" opacity="0.6" />
    <circle cx="135" cy="150" r="3" fill="#4f46e5" opacity="0.6" />
  </svg>
);

const EmptyLeadsIllustration = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full max-w-xs mx-auto">
    <defs>
      <linearGradient id="leadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    <circle cx="60" cy="80" r="25" fill="#e5e7eb" />
    <circle cx="140" cy="100" r="20" fill="#e5e7eb" />
    <circle cx="100" cy="140" r="18" fill="#e5e7eb" />
    <path
      d="M50 60 L50 100 M60 50 L60 110 M70 55 L70 105"
      stroke="url(#leadGrad)"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M125 80 L125 120 M135 75 L135 125 M145 85 L145 115"
      stroke="url(#leadGrad)"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M85 120 L90 135 L95 130 L105 145 L110 135 L115 140"
      stroke="url(#leadGrad)"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <circle cx="45" cy="50" r="2" fill="#10b981" />
    <circle cx="135" cy="65" r="2" fill="#10b981" />
    <circle cx="110" cy="125" r="2" fill="#10b981" />
  </svg>
);

const EmptySearchIllustration = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full max-w-xs mx-auto">
    <defs>
      <radialGradient id="searchGrad">
        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
      </radialGradient>
    </defs>
    <circle cx="100" cy="90" r="35" fill="url(#searchGrad)" />
    <circle cx="100" cy="90" r="25" fill="none" stroke="#4f46e5" strokeWidth="2" opacity="0.4" />
    <circle cx="100" cy="90" r="20" fill="none" stroke="#4f46e5" strokeWidth="2" opacity="0.6" />
    <path d="M115 105 L125 115" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
    <path d="M140 120 L145 115" stroke="#6366f1" strokeWidth="2" opacity="0.4" />
    <path d="M135 125 L145 115" stroke="#6366f1" strokeWidth="2" opacity="0.4" />
    <path d="M130 130 L145 115" stroke="#6366f1" strokeWidth="2" opacity="0.4" />
    <circle cx="85" cy="130" r="2" fill="#4f46e5" opacity="0.6" />
    <circle cx="125" cy="125" r="2" fill="#4f46e5" opacity="0.6" />
  </svg>
);

const getIllustration = (type: string) => {
  switch (type) {
    case 'developments':
      return <EmptyDevelopmentsIllustration />;
    case 'leads':
      return <EmptyLeadsIllustration />;
    case 'search':
    case 'filter':
      return <EmptySearchIllustration />;
    default:
      return <EmptySearchIllustration />;
  }
};

const getIconForType = (type: string) => {
  switch (type) {
    case 'developments':
      return <Building2 className="w-8 h-8" />;
    case 'leads':
      return <Users className="w-8 h-8" />;
    case 'brands':
      return <Target className="w-8 h-8" />;
    case 'properties':
      return <Home className="w-8 h-8" />;
    case 'search':
      return <Search className="w-8 h-8" />;
    case 'filter':
      return <Filter className="w-8 h-8" />;
    default:
      return <Inbox className="w-8 h-8" />;
  }
};

export const EnhancedEmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionText,
  actionIcon,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className,
  illustration,
}) => {
  const defaultActionIcon = getIconForType(type);
  const customIllustration = illustration ? getIllustration(illustration) : getIllustration(type);

  return (
    <Card
      className={cn(
        'border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20',
        animations.fadeIn,
        className,
      )}
    >
      <CardContent className="p-12 text-center space-y-6">
        {/* Illustration */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-2xl',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-500',
            )}
          />
          <div className="relative z-10 transform transition-transform duration-300 hover:scale-110">
            {customIllustration}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Title with Icon */}
          <div className="flex items-center justify-center gap-3">
            {type === 'search' || type === 'filter' ? (
              <div className="p-2 bg-amber-100 rounded-full">
                <Search className="w-5 h-5 text-amber-600" />
              </div>
            ) : (
              <div className="p-2 bg-blue-100 rounded-full">{defaultActionIcon}</div>
            )}
            <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
          </div>

          {/* Description */}
          <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">{description}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onAction && actionText && (
            <Button
              onClick={onAction}
              className={cn(
                'px-8 py-3 text-base font-semibold shadow-lg transform transition-all duration-200',
                'hover:scale-105 hover:shadow-xl',
                type === 'search' || type === 'filter'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
                'text-white border-0',
              )}
            >
              {actionIcon || <Plus className="w-5 h-5 mr-2" />}
              {actionText}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
          )}

          {onSecondaryAction && secondaryActionText && (
            <Button
              variant="outline"
              onClick={onSecondaryAction}
              className="px-6 py-3 text-base font-semibold border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200"
            >
              {secondaryActionText}
            </Button>
          )}
        </div>

        {/* Helpful Tips */}
        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-start gap-3 max-w-md mx-auto">
            <div className="p-2 bg-green-100 rounded-full">
              <Sparkles className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-700 mb-1">Pro Tip</h4>
              {type === 'developments' && (
                <p className="text-sm text-gray-600">
                  Start by creating a development profile with detailed information, photos, and
                  pricing to attract potential buyers.
                </p>
              )}
              {type === 'leads' && (
                <p className="text-sm text-gray-600">
                  Generate more leads by optimizing your property listings with compelling
                  descriptions and high-quality photos.
                </p>
              )}
              {type === 'brands' && (
                <p className="text-sm text-gray-600">
                  Complete your brand profile with logo, contact information, and service areas to
                  build trust with prospects.
                </p>
              )}
              {type === 'search' && (
                <p className="text-sm text-gray-600">
                  Try adjusting your search terms or filters. Use broader terms or check for
                  spelling mistakes.
                </p>
              )}
              {(type === 'filter' ||
                !['developments', 'leads', 'brands', 'search'].includes(type)) && (
                <p className="text-sm text-gray-600">
                  Try adjusting your filters or clearing them to see more results. Use different
                  combinations if needed.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Specialized empty state components
export const DevelopmentsEmptyState: React.FC<{
  onCreateDevelopment?: () => void;
  onImportProperties?: () => void;
}> = ({ onCreateDevelopment, onImportProperties }) => (
  <EnhancedEmptyState
    type="developments"
    illustration="custom"
    title="No Developments Yet"
    description="Start creating your first development to showcase properties and attract potential buyers."
    actionText="Create First Development"
    actionIcon={<Building2 />}
    onAction={onCreateDevelopment}
    secondaryActionText="Import Properties"
    onSecondaryAction={onImportProperties}
  />
);

export const LeadsEmptyState: React.FC<{
  onGenerateLeads?: () => void;
  onOptimizeListings?: () => void;
}> = ({ onGenerateLeads, onOptimizeListings }) => (
  <EnhancedEmptyState
    type="leads"
    illustration="custom"
    title="No Leads Yet"
    description="Generate leads by creating compelling property listings and marketing campaigns."
    actionText="Generate Leads"
    actionIcon={<Users />}
    onAction={onGenerateLeads}
    secondaryActionText="Optimize Listings"
    onSecondaryAction={onOptimizeListings}
  />
);

export const SearchEmptyState: React.FC<{
  searchQuery?: string;
  onClearSearch?: () => void;
  onAdjustFilters?: () => void;
}> = ({ searchQuery, onClearSearch, onAdjustFilters }) => (
  <EnhancedEmptyState
    type="search"
    illustration="custom"
    title={searchQuery ? `No results for "${searchQuery}"` : 'No Results Found'}
    description={
      searchQuery
        ? `No items match your search "${searchQuery}". Try different keywords or check spelling.`
        : 'No items found. Try adjusting your search terms or filters.'
    }
    actionText="Clear Search"
    actionIcon={<Search />}
    onAction={onClearSearch}
    secondaryActionText="Adjust Filters"
    onSecondaryAction={onAdjustFilters}
  />
);

export const FilterEmptyState: React.FC<{
  onResetFilters?: () => void;
  onExpandCriteria?: () => void;
}> = ({ onResetFilters, onExpandCriteria }) => (
  <EnhancedEmptyState
    type="filter"
    illustration="custom"
    title="No Results With Current Filters"
    description="Try adjusting your filter criteria or expanding your search parameters to find what you're looking for."
    actionText="Reset Filters"
    actionIcon={<Filter />}
    onAction={onResetFilters}
    secondaryActionText="Expand Criteria"
    onSecondaryAction={onExpandCriteria}
  />
);
