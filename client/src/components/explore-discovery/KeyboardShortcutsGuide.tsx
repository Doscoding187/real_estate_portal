/**
 * Keyboard Shortcuts Guide Component
 *
 * Displays available keyboard shortcuts for Explore pages.
 * Requirements: 5.1, 5.6
 *
 * Features:
 * - Modal display of shortcuts
 * - Keyboard accessible (Escape to close)
 * - Organized by category
 * - Responsive design
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { IconButton } from '@/components/ui/soft/IconButton';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { designTokens } from '@/lib/design-tokens';
import { useEscapeKey, useFocusTrap } from '@/hooks/useKeyboardNavigation';

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: string;
}

interface KeyboardShortcutsGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation
  { keys: ['↑', '↓'], description: 'Navigate between items', category: 'Navigation' },
  { keys: ['←', '→'], description: 'Navigate between items (horizontal)', category: 'Navigation' },
  { keys: ['Home'], description: 'Go to first item', category: 'Navigation' },
  { keys: ['End'], description: 'Go to last item', category: 'Navigation' },
  { keys: ['Tab'], description: 'Move to next interactive element', category: 'Navigation' },
  {
    keys: ['Shift', 'Tab'],
    description: 'Move to previous interactive element',
    category: 'Navigation',
  },

  // Actions
  { keys: ['Enter'], description: 'Activate selected item', category: 'Actions' },
  { keys: ['Space'], description: 'Activate button or toggle', category: 'Actions' },
  { keys: ['Escape'], description: 'Close modal or panel', category: 'Actions' },

  // Filters
  { keys: ['F'], description: 'Open filters panel', category: 'Filters' },
  { keys: ['Ctrl', 'K'], description: 'Focus search', category: 'Filters' },
  { keys: ['Ctrl', 'Shift', 'F'], description: 'Clear all filters', category: 'Filters' },

  // View
  { keys: ['V'], description: 'Toggle view mode', category: 'View' },
  { keys: ['M'], description: 'Toggle map view', category: 'View' },
  { keys: ['G'], description: 'Toggle grid/list view', category: 'View' },

  // Help
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'Help' },
];

const categories = Array.from(new Set(shortcuts.map(s => s.category)));

export function KeyboardShortcutsGuide({ isOpen, onClose }: KeyboardShortcutsGuideProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEscapeKey(onClose, isOpen);

  // Focus trap
  useFocusTrap(modalRef, isOpen);

  // Focus modal when opened
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-2xl max-h-[80vh] overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shortcuts-title"
              tabIndex={-1}
            >
              <ModernCard variant="elevated" className="p-0">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{
                          background: designTokens.colors.accent.subtle,
                        }}
                      >
                        <Keyboard
                          className="w-6 h-6"
                          style={{ color: designTokens.colors.accent.primary }}
                        />
                      </div>
                      <h2 id="shortcuts-title" className="text-2xl font-bold text-gray-900">
                        Keyboard Shortcuts
                      </h2>
                    </div>
                    <IconButton
                      icon={X}
                      onClick={onClose}
                      label="Close shortcuts guide"
                      size="md"
                      variant="default"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(80vh-80px)] px-6 py-6">
                  <div className="space-y-8">
                    {categories.map(category => (
                      <div key={category}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{category}</h3>
                        <div className="space-y-3">
                          {shortcuts
                            .filter(s => s.category === category)
                            .map((shortcut, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <span className="text-gray-700">{shortcut.description}</span>
                                <div className="flex items-center gap-1">
                                  {shortcut.keys.map((key, keyIndex) => (
                                    <span key={keyIndex} className="flex items-center gap-1">
                                      <kbd
                                        className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded shadow-sm"
                                        style={{ fontFamily: 'monospace' }}
                                      >
                                        {key}
                                      </kbd>
                                      {keyIndex < shortcut.keys.length - 1 && (
                                        <span className="text-gray-400 text-xs">+</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer note */}
                  <div
                    className="mt-8 p-4 rounded-lg"
                    style={{
                      background: designTokens.colors.accent.subtle,
                    }}
                  >
                    <p className="text-sm text-gray-700">
                      <strong>Tip:</strong> Press{' '}
                      <kbd className="px-2 py-0.5 text-xs font-semibold bg-white border border-gray-300 rounded">
                        ?
                      </kbd>{' '}
                      at any time to view this guide.
                    </p>
                  </div>
                </div>
              </ModernCard>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
