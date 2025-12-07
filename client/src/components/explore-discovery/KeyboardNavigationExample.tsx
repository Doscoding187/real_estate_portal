/**
 * Keyboard Navigation Example
 * 
 * Demonstrates how to implement keyboard navigation in Explore pages.
 * Requirements: 5.1, 5.6
 * 
 * This example shows:
 * - Keyboard shortcuts
 * - Focus management
 * - Arrow key navigation
 * - Escape key handling
 * - Shortcuts guide
 */

import { useState, useRef } from 'react';
import { Filter, Grid, Map, HelpCircle } from 'lucide-react';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { IconButton } from '@/components/ui/soft/IconButton';
import { KeyboardShortcutsGuide } from './KeyboardShortcutsGuide';
import { SkipToContent } from '@/components/ui/SkipToContent';
import {
  useKeyboardNavigation,
  useArrowKeyNavigation,
  useEscapeKey,
} from '@/hooks/useKeyboardNavigation';

export function KeyboardNavigationExample() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    title: `Property ${i + 1}`,
  }));

  // Define keyboard shortcuts
  const shortcuts = [
    {
      key: 'f',
      description: 'Toggle filters',
      action: () => setFiltersOpen(!filtersOpen),
    },
    {
      key: 'v',
      description: 'Toggle view mode',
      action: () => setViewMode(viewMode === 'grid' ? 'map' : 'grid'),
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      action: () => setShowShortcuts(true),
    },
  ];

  // Enable keyboard shortcuts
  useKeyboardNavigation({
    shortcuts,
    enabled: true,
  });

  // Enable arrow key navigation
  const { setCurrentIndex } = useArrowKeyNavigation(
    items.length,
    (index) => {
      setSelectedIndex(index);
      // Scroll to item
      const element = document.getElementById(`item-${index}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    true
  );

  // Close shortcuts guide with Escape
  useEscapeKey(() => setShowShortcuts(false), showShortcuts);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip Link */}
      <SkipToContent targetId="main-content" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Keyboard Navigation Example
          </h1>

          <div className="flex items-center gap-3">
            <IconButton
              icon={Filter}
              onClick={() => setFiltersOpen(!filtersOpen)}
              label="Toggle filters (F)"
              variant={filtersOpen ? 'accent' : 'default'}
            />
            <IconButton
              icon={viewMode === 'grid' ? Map : Grid}
              onClick={() => setViewMode(viewMode === 'grid' ? 'map' : 'grid')}
              label="Toggle view mode (V)"
              variant="default"
            />
            <IconButton
              icon={HelpCircle}
              onClick={() => setShowShortcuts(true)}
              label="Show keyboard shortcuts (?)"
              variant="default"
            />
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-600">
          <span>
            Press <kbd className="keyboard-hint">F</kbd> for filters
          </span>
          <span>
            Press <kbd className="keyboard-hint">V</kbd> to toggle view
          </span>
          <span>
            Press <kbd className="keyboard-hint">?</kbd> for help
          </span>
          <span>
            Use <kbd className="keyboard-hint">↑</kbd>
            <kbd className="keyboard-hint">↓</kbd> to navigate
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main
        id="main-content"
        className="container mx-auto px-6 py-8"
        tabIndex={-1}
      >
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Properties
          </h2>
          <p className="text-gray-600">
            Use arrow keys to navigate, Enter to select
          </p>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, index) => (
            <ModernCard
              key={item.id}
              id={`item-${index}`}
              onClick={() => {
                setSelectedIndex(index);
                setCurrentIndex(index);
              }}
              className={`p-6 ${
                selectedIndex === index
                  ? 'ring-2 ring-indigo-500 ring-offset-2'
                  : ''
              }`}
              hoverable
              variant="default"
              as="article"
              aria-label={`Property ${index + 1}`}
              aria-current={selectedIndex === index ? 'true' : undefined}
            >
              <div className="aspect-video bg-gray-200 rounded-lg mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">
                {item.title}
              </h3>
              <p className="text-gray-600 mt-2">
                {selectedIndex === index ? '✓ Selected' : 'Click or press Enter to select'}
              </p>
            </ModernCard>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-12 p-6 bg-indigo-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Keyboard Navigation Instructions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Navigation</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• Tab - Move to next element</li>
                <li>• Shift+Tab - Move to previous element</li>
                <li>• ↑↓ - Navigate between items</li>
                <li>• Home - First item</li>
                <li>• End - Last item</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Actions</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• Enter/Space - Activate</li>
                <li>• F - Toggle filters</li>
                <li>• V - Toggle view</li>
                <li>• ? - Show shortcuts</li>
                <li>• Escape - Close modals</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Keyboard Shortcuts Guide */}
      <KeyboardShortcutsGuide
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Filters Panel (example) */}
      {filtersOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center"
          onClick={() => setFiltersOpen(false)}
        >
          <ModernCard
            className="w-full max-w-md p-6"
            variant="elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Filters</h3>
            <p className="text-gray-600 mb-4">
              Press Escape to close this panel
            </p>
            <button
              onClick={() => setFiltersOpen(false)}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Close (Escape)
            </button>
          </ModernCard>
        </div>
      )}
    </div>
  );
}
