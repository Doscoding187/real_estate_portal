import { FAQSection } from '../components/advertise/FAQSection';

/**
 * FAQDemo Page
 * 
 * Demonstrates the FAQ Section component with default content.
 * 
 * Features:
 * - 8 FAQ items covering common partner concerns
 * - Smooth accordion animations
 * - Keyboard accessible
 * - Mobile responsive
 * - Contact CTA at bottom
 */
export default function FAQDemo() {
  return (
    <div className="min-h-screen bg-white">
      <div className="py-12 px-4 bg-gradient-to-r from-primary to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            FAQ Section Demo
          </h1>
          <p className="text-lg text-white/90">
            Interactive accordion with smooth animations and keyboard support
          </p>
        </div>
      </div>

      <FAQSection />

      <div className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Component Features
          </h2>
          <ul className="space-y-2 text-gray-600">
            <li>✓ 8 FAQ items organized by importance</li>
            <li>✓ Smooth expand/collapse animations (300ms)</li>
            <li>✓ Only one item open at a time</li>
            <li>✓ Keyboard accessible (Enter/Space to toggle)</li>
            <li>✓ ARIA attributes for screen readers</li>
            <li>✓ Hover states with soft elevation</li>
            <li>✓ Touch-friendly on mobile (adequate tap targets)</li>
            <li>✓ Scroll-triggered fade-in animation</li>
            <li>✓ Contact CTA for additional questions</li>
          </ul>

          <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">
            Keyboard Navigation
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li><kbd className="px-2 py-1 bg-gray-200 rounded">Tab</kbd> - Navigate between FAQ items</li>
            <li><kbd className="px-2 py-1 bg-gray-200 rounded">Enter</kbd> or <kbd className="px-2 py-1 bg-gray-200 rounded">Space</kbd> - Toggle accordion</li>
            <li><kbd className="px-2 py-1 bg-gray-200 rounded">Shift + Tab</kbd> - Navigate backwards</li>
          </ul>

          <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">
            Accessibility Features
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li>✓ Semantic HTML with proper heading hierarchy</li>
            <li>✓ ARIA expanded/controls attributes</li>
            <li>✓ Focus indicators (2px ring)</li>
            <li>✓ Screen reader friendly</li>
            <li>✓ Respects prefers-reduced-motion</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
