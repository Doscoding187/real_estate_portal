import { useState } from 'react';
import { motion } from 'framer-motion';
import { FAQAccordionItem } from './FAQAccordionItem';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface FAQSectionProps {
  faqs?: FAQ[];
}

const defaultFAQs: FAQ[] = [
  {
    id: '1',
    question: 'How much does it cost to advertise on the platform?',
    answer: 'Pricing varies by partner type and plan tier. Agents can start from R499/month, developers from R2,999/month, and banks/service providers have custom enterprise plans. All plans include core features like listing promotion and lead management, with premium tiers offering advanced analytics and priority placement.',
    order: 1,
  },
  {
    id: '2',
    question: 'What types of advertising opportunities are available?',
    answer: 'We offer multiple advertising formats including traditional property listings, Explore feed video ads, boost campaigns for increased visibility, featured placements on location pages, and sponsored content in our discovery engine. Each format is designed to reach high-intent property seekers at different stages of their journey.',
    order: 2,
  },
  {
    id: '3',
    question: 'How do I get started with advertising?',
    answer: 'Getting started is simple: Create your partner profile, add your listings or content, and start receiving leads. Our onboarding team will guide you through the setup process, help optimize your profile, and provide training on our dashboard tools. Most partners are fully set up within 24-48 hours.',
    order: 3,
  },
  {
    id: '4',
    question: 'What makes your platform different from other property portals?',
    answer: 'We combine AI-driven visibility with verified lead quality. Our recommendation engine ensures your properties reach the right audience, while our verification process filters out low-quality inquiries. Plus, our Explore feed offers unique short-form video advertising that traditional portals don\'t provide.',
    order: 4,
  },
  {
    id: '5',
    question: 'How are leads verified and delivered?',
    answer: 'All leads go through our verification process which checks contact information, filters spam, and assesses intent signals. Verified leads are delivered instantly to your dashboard with full contact details, property interest, and affordability indicators. You can also set up email and SMS notifications for immediate follow-up.',
    order: 5,
  },
  {
    id: '6',
    question: 'Can I manage multiple properties or developments?',
    answer: 'Yes! Our platform is built for scale. Agents can manage unlimited listings, developers can showcase multiple developments with unit-level detail, and agencies can collaborate with team members. All plans include bulk upload tools, media management, and centralized lead tracking.',
    order: 6,
  },
  {
    id: '7',
    question: 'What kind of analytics and reporting do you provide?',
    answer: 'Our dashboard provides comprehensive analytics including views, engagement rates, lead conversion metrics, and ROI tracking. Premium plans include advanced insights like audience demographics, competitor benchmarking, and predictive analytics to optimize your advertising strategy.',
    order: 7,
  },
  {
    id: '8',
    question: 'Is there a contract or can I cancel anytime?',
    answer: 'We offer flexible month-to-month plans with no long-term contracts. You can upgrade, downgrade, or cancel anytime. For annual commitments, we provide significant discounts (up to 20% off). Enterprise partners can discuss custom terms with our sales team.',
    order: 8,
  },
];

/**
 * FAQSection Component
 * 
 * Displays frequently asked questions in an accordion format.
 * Questions are organized by importance and frequency.
 * 
 * Features:
 * - 6-10 FAQ items addressing common partner concerns
 * - Smooth expand/collapse animations
 * - Only one item open at a time
 * - Keyboard accessible
 * - Touch-friendly on mobile
 * - Scroll-triggered fade-in animation
 * 
 * @example
 * ```tsx
 * <FAQSection />
 * // or with custom FAQs
 * <FAQSection faqs={customFAQs} />
 * ```
 */
export function FAQSection({ faqs = defaultFAQs }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const { ref, isVisible } = useScrollAnimation();

  // Defensive check: ensure faqs is defined and is an array
  if (!faqs || !Array.isArray(faqs) || faqs.length === 0) {
    console.warn('FAQSection: faqs prop is missing or empty');
    return (
      <section
        ref={ref}
        className="faq-section py-20 md:py-28 bg-gradient-to-b from-white to-gray-50"
        aria-labelledby="faq-heading"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">Loading frequently asked questions...</p>
        </div>
      </section>
    );
  }

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Sort FAQs by order
  const sortedFAQs = [...faqs].sort((a, b) => a.order - b.order);

  // Handle arrow key navigation between FAQ items
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = (index + 1) % sortedFAQs.length;
        setFocusedIndex(nextIndex);
        // Focus will be handled by the FAQAccordionItem
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = (index - 1 + sortedFAQs.length) % sortedFAQs.length;
        setFocusedIndex(prevIndex);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(sortedFAQs.length - 1);
        break;
    }
  };

  return (
    <section
      ref={ref}
      className="faq-section py-20 md:py-28 bg-gradient-to-b from-white to-gray-50"
      aria-labelledby="faq-heading"
      aria-describedby="faq-description"
      role="region"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="text-center mb-12 md:mb-16"
        >
          <h2
            id="faq-heading"
            className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4 leading-tight"
          >
            Frequently Asked Questions
          </h2>
          <p id="faq-description" className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Find answers to common questions about advertising on our platform
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="space-y-4"
          role="list"
          aria-label="Frequently asked questions"
        >
          {sortedFAQs.map((faq, index) => (
            <div key={faq.id} role="listitem">
              <FAQAccordionItem
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === index}
                onToggle={() => handleToggle(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                isFocused={focusedIndex === index}
                index={index}
              />
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="mt-12 md:mt-16 text-center"
        >
          <p className="text-gray-600 mb-4">
            Still have questions?
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-primary to-purple-600 rounded-xl hover:shadow-lg transition-all duration-300"
            aria-label="Contact our team for more information"
          >
            Contact Our Team
          </a>
        </motion.div>
      </div>
    </section>
  );
}

export default FAQSection;
