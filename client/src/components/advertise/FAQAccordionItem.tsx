import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { trackFAQExpand } from '@/lib/analytics/advertiseTracking';

export interface FAQAccordionItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isFocused?: boolean;
  index?: number; // For analytics tracking
}

/**
 * FAQAccordionItem Component
 *
 * A single FAQ item with smooth expand/collapse animation.
 * Follows soft-UI design principles with rounded corners and subtle shadows.
 *
 * Features:
 * - Smooth expand/collapse animation
 * - Keyboard accessible (Enter/Space to toggle)
 * - ARIA attributes for screen readers
 * - Hover states with soft elevation
 * - Auto-scrolls into view when opened
 *
 * @example
 * ```tsx
 * <FAQAccordionItem
 *   question="How much does it cost?"
 *   answer="Pricing varies by partner type..."
 *   isOpen={openIndex === 0}
 *   onToggle={() => setOpenIndex(openIndex === 0 ? null : 0)}
 * />
 * ```
 */
export function FAQAccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
  onKeyDown: onKeyDownProp,
  isFocused = false,
  index = 0,
}: FAQAccordionItemProps) {
  // Generate a safe ID by removing special characters and spaces
  const safeId = `faq-answer-${question.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20)}`;

  const handleToggle = () => {
    // Track FAQ expand event (only when opening, not closing)
    if (!isOpen) {
      trackFAQExpand({
        question,
        index,
      });
    }
    onToggle();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle toggle keys
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }

    // Pass through to parent for navigation
    if (onKeyDownProp) {
      onKeyDownProp(e);
    }
  };

  return (
    <motion.div
      initial={false}
      className="border border-gray-200 rounded-xl overflow-hidden bg-white"
      style={{
        boxShadow: isOpen ? softUITokens.shadows.softHover : softUITokens.shadows.soft,
      }}
      whileHover={{
        boxShadow: softUITokens.shadows.softHover,
      }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
        aria-expanded={isOpen}
        aria-controls={safeId}
      >
        <span className="text-lg font-semibold text-gray-900 pr-4">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-gray-500" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={safeId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
            }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 pt-2">
              <p className="text-base text-gray-600 leading-relaxed">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
