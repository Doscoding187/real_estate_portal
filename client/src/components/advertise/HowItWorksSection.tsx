/**
 * HowItWorksSection Component
 * 
 * Displays the "How It Works" section with three sequential process steps
 * and a CTA button. Shows the onboarding process for partners.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, FileText, TrendingUp } from 'lucide-react';
import { ProcessStep } from './ProcessStep';
import { CTAButton } from './CTAButton';
import { staggerContainer } from '@/lib/animations/advertiseAnimations';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export interface HowItWorksSectionProps {
  /**
   * Optional custom heading
   */
  heading?: string;
  
  /**
   * Optional custom subheading
   */
  subheading?: string;
  
  /**
   * CTA button configuration
   */
  ctaButton?: {
    label: string;
    href: string;
    onClick?: () => void;
  };
  
  /**
   * Optional additional CSS classes
   */
  className?: string;
}

const defaultSteps = [
  {
    stepNumber: 1,
    icon: UserPlus,
    title: 'Create Profile',
    description: 'Set up your partner account in minutes with our streamlined registration process.',
  },
  {
    stepNumber: 2,
    icon: FileText,
    title: 'Add Listings',
    description: 'Upload your properties or services with our intuitive listing wizard and media tools.',
  },
  {
    stepNumber: 3,
    icon: TrendingUp,
    title: 'Get Leads',
    description: 'Start receiving high-intent leads from verified buyers actively searching for properties.',
  },
];

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({
  heading = 'How It Works',
  subheading = 'Get started in three simple steps',
  ctaButton = {
    label: 'Start Advertising Now',
    href: '/register',
  },
  className = '',
}) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <section
      ref={ref}
      className={`how-it-works-section py-20 md:py-28 bg-gray-50 ${className}`}
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2
            id="how-it-works-heading"
            className="text-3xl md:text-4xl font-semibold leading-tight mb-4"
          >
            {heading}
          </h2>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            {subheading}
          </p>
        </div>

        {/* Process Steps */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isVisible ? "animate" : "initial"}
          className="flex flex-col md:flex-row items-center justify-between gap-10 process-steps-container"
        >
          {defaultSteps.map((step, index) => (
            <ProcessStep
              key={step.stepNumber}
              stepNumber={step.stepNumber}
              icon={step.icon}
              title={step.title}
              description={step.description}
              showConnector={index < defaultSteps.length - 1}
            />
          ))}
        </motion.div>

        {/* CTA Button */}
        <div className="mt-12 md:mt-16 flex justify-center">
          <CTAButton
            label={ctaButton.label}
            href={ctaButton.href}
            variant="primary"
            onClick={ctaButton.onClick}
          />
        </div>
      </div>


    </section>
  );
};
