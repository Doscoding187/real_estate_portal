import { useState } from 'react';
import { motion } from 'framer-motion';
import { FAQAccordionItem } from './FAQAccordionItem';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import type { CommercialProduct } from '@/hooks/useCommercialCatalog';
import {
  formatCommercialLimitLabel,
  formatCommercialLimitValue,
  getCommercialPricePresentation,
  getCommercialPresentationLimits,
  getCommercialTermPresentation,
} from '@/lib/commercialCatalog';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface FAQSectionProps {
  faqs?: FAQ[];
  commercialProducts?: CommercialProduct[];
}

const launchAudiences = ['agent', 'agency', 'developer'] as const;

function getLaunchProduct(products: CommercialProduct[] | undefined, audience: string) {
  return products?.find(
    product => product.audience === audience && product.term.kind === 'paid_launch_access',
  );
}

function productPriceAndTerm(product: CommercialProduct | undefined, fallback: string): string {
  if (!product) return fallback;

  const price = getCommercialPricePresentation(product);
  const term = getCommercialTermPresentation(product);
  return `${price.label}${price.period || ''} for ${term.label}`;
}

function productBenefits(product: CommercialProduct | undefined, fallback: string): string {
  if (!product) return fallback;

  const benefits = product.benefits.filter(Boolean);
  const limits = getCommercialPresentationLimits(product).map(
    ([key, value]) => `${formatCommercialLimitLabel(key)}: ${formatCommercialLimitValue(value)}`,
  );
  const facts = [...benefits, ...limits];
  return facts.length > 0 ? facts.join('; ') : fallback;
}

function listingLimitSummary(products: CommercialProduct[] | undefined): string {
  const summaries = launchAudiences.map(audience => {
    const product = getLaunchProduct(products, audience);
    const limit = product
      ? getCommercialPresentationLimits(product).find(([key]) => key === 'max_active_listings')?.[1]
      : undefined;
    if (product && limit !== undefined && limit !== null) {
      return `${product.displayName}: up to ${String(limit)} active listings`;
    }
    if (audience === 'developer') return 'Developer Launch Access: development portfolio access';
    return `${audience[0].toUpperCase()}${audience.slice(1)} Launch Access: see the current catalogue`;
  });

  return summaries.join('; ');
}

function defaultFAQs(commercialProducts?: CommercialProduct[]): FAQ[] {
  const agent = getLaunchProduct(commercialProducts, 'agent');
  const agency = getLaunchProduct(commercialProducts, 'agency');
  const developer = getLaunchProduct(commercialProducts, 'developer');
  const priceSummary = launchAudiences
    .map(audience => {
      const product = getLaunchProduct(commercialProducts, audience);
      const fallback = `${audience[0].toUpperCase()}${audience.slice(1)} Launch Access: see the current catalogue`;
      return `${product?.displayName || `${audience[0].toUpperCase()}${audience.slice(1)} Launch Access`} — ${productPriceAndTerm(product, fallback)}`;
    })
    .join('; ');
  const audienceSummary = [
    `Agent Launch Access: ${productBenefits(agent, 'listing publication, property enquiry access and the supported Agent workspace')}`,
    `Agency Launch Access: ${productBenefits(agency, 'agency inventory, team capability, lead routing and the supported Agency workspace')}`,
    `Developer Launch Access: ${productBenefits(developer, 'development portfolio, unit inventory and the supported Developer workspace')}`,
  ].join(' ');

  return [
    {
      id: 'launch-access',
      question: 'What is Launch Access?',
      answer:
        'Launch Access is a once-off, paid 90-day access term for the strongest currently supported Property Listify business experience. It connects inventory, discovery, enquiry capture and the relevant business workspace. It is not a monthly subscription.',
      order: 1,
    },
    {
      id: 'pricing',
      question: 'How much does Launch Access cost?',
      answer: `The current catalogue lists ${priceSummary}. Prices, terms and included entitlements are supplied by billing.commercialCatalog.`,
      order: 2,
    },
    {
      id: 'once-off',
      question: 'Is this price monthly?',
      answer:
        'No. Agent, Agency and Developer Launch Access are once-off products for a 90-day term. They are not monthly packages, free trials or permanent discounted pricing.',
      order: 3,
    },
    {
      id: 'term-start',
      question: 'When do the 90 days begin?',
      answer:
        'The 90 days begin only after the manual EFT payment has been verified by finance and the Launch Access activation has been recorded. Requesting an invoice or submitting payment proof does not start the term by itself.',
      order: 4,
    },
    {
      id: 'payment',
      question: 'How do I pay?',
      answer:
        'Launch Access uses manual EFT. Request the product invoice, pay using the invoice reference, submit the payment proof through the supported billing path and wait for finance verification before access is activated.',
      order: 5,
    },
    {
      id: 'expiry-and-renewal',
      question: 'What happens after 90 days, and does Launch Access automatically renew?',
      answer:
        'Launch Access expires at the end of its 90-day term. It does not renew automatically. Contact Property Listify for the current next-step options if you want to continue after expiry.',
      order: 6,
    },
    {
      id: 'audience-experiences',
      question: 'What does Agent, Agency or Developer Launch Access include?',
      answer: `The three products map to the supported business experiences in the current catalogue. ${audienceSummary}`,
      order: 7,
    },
    {
      id: 'listing-limits',
      question: 'How many listings can I publish?',
      answer: `The current catalogue lists these Launch Access safeguards: ${listingLimitSummary(commercialProducts)}. Product limits and entitlements come from billing.commercialCatalog.`,
      order: 8,
    },
    {
      id: 'guarantees',
      question: 'Are leads, enquiries or sales guaranteed?',
      answer:
        'No. Launch Access provides the supported path to publish inventory, participate in discovery, capture enquiries and follow up in the relevant workspace. It does not guarantee a lead, enquiry, sale, delivery time, traffic volume or return on investment.',
      order: 9,
    },
    {
      id: 'custom-conversation',
      question: 'Can I contact Property Listify for a custom conversation?',
      answer:
        'Yes. Contact Property Listify if you want to discuss a larger requirement, a custom business conversation or which supported Launch Access path fits your team. The assisted conversation does not change the canonical Launch Access pricing or policy unless a separately approved path is agreed.',
      order: 10,
    },
  ];
}

export function FAQSection({ faqs, commercialProducts }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const { ref, isVisible } = useScrollAnimation();
  const resolvedFAQs = faqs || defaultFAQs(commercialProducts);

  if (!Array.isArray(resolvedFAQs) || resolvedFAQs.length === 0) {
    console.warn('FAQSection: faqs is missing or empty');
    return (
      <section
        ref={ref}
        className="faq-section bg-gradient-to-b from-white to-gray-50 py-16 md:py-20"
        aria-labelledby="faq-heading"
      >
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-gray-600">Launch Access questions are being prepared.</p>
        </div>
      </section>
    );
  }

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const sortedFAQs = [...resolvedFAQs].sort((a, b) => a.order - b.order);

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((index + 1) % sortedFAQs.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((index - 1 + sortedFAQs.length) % sortedFAQs.length);
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(sortedFAQs.length - 1);
        break;
    }
  };

  return (
    <section
      data-testid="faq-section"
      ref={ref}
      className="faq-section bg-gradient-to-b from-white to-gray-50 py-16 md:py-20"
      aria-labelledby="faq-heading"
      aria-describedby="faq-description"
      role="region"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="mb-10 text-center md:mb-12"
        >
          <h2
            id="faq-heading"
            className="mb-4 text-3xl font-semibold leading-tight text-gray-900 md:text-4xl"
          >
            Frequently Asked Questions about Launch Access
          </h2>
          <p
            id="faq-description"
            className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600 md:text-xl"
          >
            Clear answers about pricing, payment, activation, entitlements and the 90-day term.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="grid items-start gap-4 md:grid-cols-2 md:gap-5"
          role="list"
          aria-label="Launch Access frequently asked questions"
        >
          {sortedFAQs.map((faq, index) => (
            <div key={faq.id} role="listitem">
              <FAQAccordionItem
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === index}
                onToggle={() => handleToggle(index)}
                onKeyDown={event => handleKeyDown(event, index)}
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
          className="mt-10 text-center md:mt-12"
        >
          <p className="mb-4 text-gray-600">Still have questions?</p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-base font-semibold text-white transition-all duration-300 hover:shadow-lg"
            aria-label="Contact our team about Launch Access"
          >
            Contact Our Team
          </a>
        </motion.div>
      </div>
    </section>
  );
}

export default FAQSection;
