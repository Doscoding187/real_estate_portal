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
import { softUITokens } from './design-tokens';
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
      className={`how-it-works-section ${className}`}
      style={{
        padding: `${softUITokens.spacing['4xl']} ${softUITokens.spacing.xl}`,
        background: softUITokens.colors.neutral.gray50,
      }}
      aria-labelledby="how-it-works-heading"
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {/* Section Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: softUITokens.spacing['4xl'],
          }}
        >
          <h2
            id="how-it-works-heading"
            style={{
              fontSize: softUITokens.typography.fontSize['4xl'],
              fontWeight: softUITokens.typography.fontWeight.bold,
              color: softUITokens.colors.neutral.gray900,
              marginBottom: softUITokens.spacing.md,
              lineHeight: softUITokens.typography.lineHeight.tight,
            }}
          >
            {heading}
          </h2>
          <p
            style={{
              fontSize: softUITokens.typography.fontSize.xl,
              color: softUITokens.colors.neutral.gray600,
              lineHeight: softUITokens.typography.lineHeight.relaxed,
            }}
          >
            {subheading}
          </p>
        </div>

        {/* Process Steps */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isVisible ? "animate" : "initial"}
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: softUITokens.spacing['2xl'],
            marginBottom: softUITokens.spacing['4xl'],
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
          className="process-steps-container"
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: softUITokens.spacing['3xl'],
          }}
        >
          <CTAButton
            label={ctaButton.label}
            href={ctaButton.href}
            variant="primary"
            onClick={ctaButton.onClick}
          />
        </div>
      </div>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          .process-steps-container {
            flex-direction: column !important;
            align-items: center !important;
          }
          
          .connector-line {
            display: none !important;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          .process-steps-container {
            gap: ${softUITokens.spacing.xl} !important;
          }
        }
      `}</style>
    </section>
  );
};
