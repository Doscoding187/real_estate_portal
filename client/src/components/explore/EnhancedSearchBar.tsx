import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Home, TrendingUp } from 'lucide-react';

interface Suggestion {
  type: 'location' | 'property' | 'trending';
  label: string;
  icon?: any;
}

interface EnhancedSearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export function EnhancedSearchBar({
  onSearch,
  placeholder = 'Search properties, areas, agents...',
}: EnhancedSearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Mock suggestions - replace with actual API call
  const mockSuggestions: Suggestion[] = [
    { type: 'trending', label: 'Sandton Properties', icon: TrendingUp },
    { type: 'location', label: 'Cape Town', icon: MapPin },
    { type: 'location', label: 'Camps Bay', icon: MapPin },
    { type: 'property', label: 'Luxury Apartments', icon: Home },
    { type: 'property', label: 'Beachfront Homes', icon: Home },
  ];

  useEffect(() => {
    if (query.length > 1) {
      // Filter suggestions based on query
      const filtered = mockSuggestions.filter(s =>
        s.label.toLowerCase().includes(query.toLowerCase()),
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setQuery(suggestion.label);
    onSearch?.(suggestion.label);
    setShowSuggestions(false);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-12 pr-4 py-3.5 rounded-full border-2 border-gray-200 bg-white/90 backdrop-blur-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 outline-none text-gray-900 placeholder-gray-500 shadow-sm hover:shadow-md"
          />
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.icon;
            return (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 flex items-center gap-3 border-b border-gray-100 last:border-0"
              >
                {Icon && (
                  <div className="p-2 bg-blue-50 rounded-full">
                    <Icon className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">{suggestion.label}</p>
                  <p className="text-xs text-gray-500 capitalize">{suggestion.type}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
