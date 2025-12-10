/**
 * KeyboardNavigationGuide Component
 * 
 * Displays keyboard shortcuts and navigation instructions for the landing page.
 * Can be toggled with a keyboard shortcut (Shift + ?).
 * 
 * Requirements: 10.5
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { softUITokens } from './design-tokens';

export interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: 'navigation' | 'interaction' | 'general';
}

const keyboardShortcuts: KeyboardShortcut[] = [
  // Navigation
  {
    keys: ['Tab'],
    description: 'Move to next interactive element',
    category: 'navigation',
  },
  {
    keys: ['Shift', 'Tab'],
    description: 'Move to previous interactive element',
    category: 'navigation',
  },
  {
    keys: ['Arrow Keys'],
    description: 'Navigate between cards in grids',
    category: 'navigation',
  },
  {
    keys: ['Home'],
    description: 'Jump to first item in a list',
    category: 'navigation',
  },
  {
    keys: ['End'],
    description: 'Jump to last item in a list',
    category: 'navigation',
  },
  
  // Interaction
  {
    keys: ['Enter'],
    description: 'Activate links and buttons',
    category: 'interaction',
  },
  {
    keys: ['Space'],
    description: 'Activate buttons and toggle accordions',
    category: 'interaction',
  },
  {
    keys: ['Esc'],
    description: 'Close modals and overlays',
    category: 'interaction',
  },
  
  // General
  {
    keys: ['Shift', '?'],
    description: 'Show/hide this keyboard guide',
    category: 'general',
  },
];

export const KeyboardNavigationGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle guide with Shift + ?
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      
      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const groupedShortcuts = {
    navigation: keyboardShortcuts.filter((s) => s.category === 'navigation'),
    interaction: keyboardShortcuts.filter((s) => s.category === 'interaction'),
    general: keyboardShortcuts.filter((s) => s.category === 'general'),
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        aria-label="Show keyboard navigation guide"
        title="Keyboard shortcuts (Shift + ?)"
        style={{
          border: `2px solid ${softUITokens.colors.primary.base}`,
        }}
      >
        <Keyboard size={24} color={softUITokens.colors.primary.base} />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
              aria-hidden="true"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="keyboard-guide-title"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                style={{
                  boxShadow: softUITokens.shadows.softLarge,
                }}
              >
                {/* Header */}
                <div
                  className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${softUITokens.colors.primary.light} 0%, ${softUITokens.colors.neutral.white} 100%)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Keyboard size={28} color={softUITokens.colors.primary.base} />
                    <h2
                      id="keyboard-guide-title"
                      className="text-2xl font-bold text-gray-900"
                    >
                      Keyboard Navigation
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close keyboard guide"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Navigation Shortcuts */}
                  <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Navigation
                    </h3>
                    <div className="space-y-2">
                      {groupedShortcuts.navigation.map((shortcut, index) => (
                        <ShortcutRow key={index} shortcut={shortcut} />
                      ))}
                    </div>
                  </section>

                  {/* Interaction Shortcuts */}
                  <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Interaction
                    </h3>
                    <div className="space-y-2">
                      {groupedShortcuts.interaction.map((shortcut, index) => (
                        <ShortcutRow key={index} shortcut={shortcut} />
                      ))}
                    </div>
                  </section>

                  {/* General Shortcuts */}
                  <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      General
                    </h3>
                    <div className="space-y-2">
                      {groupedShortcuts.general.map((shortcut, index) => (
                        <ShortcutRow key={index} shortcut={shortcut} />
                      ))}
                    </div>
                  </section>

                  {/* Accessibility Note */}
                  <div
                    className="mt-6 p-4 rounded-lg"
                    style={{
                      background: softUITokens.colors.primary.light,
                      border: `1px solid ${softUITokens.colors.primary.subtle}`,
                    }}
                  >
                    <p className="text-sm text-gray-700">
                      <strong>Accessibility Tip:</strong> This page is fully keyboard
                      accessible. All interactive elements can be reached and activated
                      using only your keyboard.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * ShortcutRow Component
 * 
 * Displays a single keyboard shortcut with keys and description
 */
const ShortcutRow: React.FC<{ shortcut: KeyboardShortcut }> = ({ shortcut }) => {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {shortcut.keys.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-gray-400">+</span>}
            <kbd
              className="px-3 py-1 text-sm font-semibold rounded-md"
              style={{
                background: softUITokens.colors.neutral.gray100,
                border: `1px solid ${softUITokens.colors.neutral.gray300}`,
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              {key}
            </kbd>
          </React.Fragment>
        ))}
      </div>
      <span className="text-gray-600 text-sm ml-4">{shortcut.description}</span>
    </div>
  );
};
