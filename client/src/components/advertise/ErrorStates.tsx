/**
 * Error States for Advertise Landing Page
 * 
 * Provides error handling UI for various failure scenarios:
 * - Partner types loading failure
 * - Metrics loading failure
 * - FAQ loading failure
 * - Pricing data loading failure
 * 
 * Requirements: 10.1
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, XCircle, WifiOff } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { fadeUp } from '@/lib/animations/advertiseAnimations';

export interface ErrorStateProps {
  /**
   * Error message to display
   */
  message?: string;
  
  /**
   * Optional retry callback
   */
  onRetry?: () => void;
  
  /**
   * Whether to show retry button
   */
  showRetry?: boolean;
  
  /**
   * Error type for styling
   */
  type?: 'error' | 'warning' | 'network';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Generic Error State Component
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong. Please try again.',
  onRetry,
  showRetry = true,
  type = 'error',
  className = '',
}) => {
  const getIcon = () => {
    switch (type) {
      case 'network':
        return <WifiOff size={48} />;
      case 'warning':
        return <AlertCircle size={48} />;
      default:
        return <XCircle size={48} />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'network':
        return softUITokens.colors.neutral.gray600;
      case 'warning':
        return '#f59e0b'; // amber-500
      default:
        return '#ef4444'; // red-500
    }
  };

  return (
    <motion.div
      className={`error-state ${className}`}
      variants={fadeUp}
      initial="initial"
      animate="animate"
      style={{
        padding: softUITokens.spacing['5xl'],
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
      }}
      role="alert"
      aria-live="assertive"
    >
      <div
        style={{
          color: getColor(),
          marginBottom: softUITokens.spacing.lg,
        }}
        aria-hidden="true"
      >
        {getIcon()}
      </div>
      
      <h3
        style={{
          fontSize: softUITokens.typography.fontSize['2xl'],
          fontWeight: softUITokens.typography.fontWeight.semibold,
          color: softUITokens.colors.neutral.gray900,
          marginBottom: softUITokens.spacing.md,
        }}
      >
        {type === 'network' ? 'Connection Issue' : 'Oops!'}
      </h3>
      
      <p
        style={{
          fontSize: softUITokens.typography.fontSize.lg,
          color: softUITokens.colors.neutral.gray600,
          marginBottom: softUITokens.spacing.xl,
          maxWidth: '500px',
        }}
      >
        {message}
      </p>
      
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: softUITokens.spacing.sm,
            padding: `${softUITokens.spacing.md} ${softUITokens.spacing.xl}`,
            background: softUITokens.colors.primary.gradient,
            color: softUITokens.colors.neutral.white,
            border: 'none',
            borderRadius: softUITokens.borderRadius.soft,
            fontSize: softUITokens.typography.fontSize.base,
            fontWeight: softUITokens.typography.fontWeight.medium,
            cursor: 'pointer',
            transition: `all ${softUITokens.transitions.base}`,
            boxShadow: softUITokens.shadows.soft,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = softUITokens.shadows.softHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = softUITokens.shadows.soft;
          }}
          aria-label="Retry loading content"
        >
          <RefreshCw size={18} />
          Try Again
        </button>
      )}
    </motion.div>
  );
};

/**
 * Partner Types Error State
 * Shows error message with retry button for partner types loading failure
 */
export const PartnerTypesError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <div
      style={{
        padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.xl}`,
        background: softUITokens.colors.neutral.gray50,
      }}
      role="region"
      aria-label="Partner types error"
    >
      <div className="container mx-auto max-w-7xl">
        <ErrorState
          message="We couldn't load the partner types. Please check your connection and try again."
          onRetry={onRetry}
          type="network"
        />
      </div>
    </div>
  );
};

/**
 * Metrics Placeholder
 * Shows placeholder values when metrics fail to load
 */
export const MetricsPlaceholder: React.FC = () => {
  const placeholderMetrics = [
    {
      value: '---',
      label: 'Verified Leads Generated',
      note: 'Data temporarily unavailable',
    },
    {
      value: '---',
      label: 'Properties Promoted',
      note: 'Data temporarily unavailable',
    },
    {
      value: '---',
      label: 'Partner Satisfaction',
      note: 'Data temporarily unavailable',
    },
    {
      value: '---',
      label: 'Active Partners',
      note: 'Data temporarily unavailable',
    },
  ];

  return (
    <div
      style={{
        padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.xl}`,
        background: softUITokens.colors.neutral.white,
      }}
      role="region"
      aria-label="Social proof metrics"
    >
      <div className="container mx-auto max-w-7xl">
        {/* Info banner */}
        <div
          style={{
            background: softUITokens.colors.neutral.gray100,
            padding: softUITokens.spacing.lg,
            borderRadius: softUITokens.borderRadius.soft,
            marginBottom: softUITokens.spacing.xl,
            textAlign: 'center',
          }}
          role="status"
          aria-live="polite"
        >
          <p
            style={{
              color: softUITokens.colors.neutral.gray600,
              fontSize: softUITokens.typography.fontSize.sm,
            }}
          >
            <AlertCircle
              size={16}
              style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }}
            />
            Metrics are temporarily unavailable. Please check back later.
          </p>
        </div>

        {/* Placeholder metrics grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {placeholderMetrics.map((metric, index) => (
            <div
              key={index}
              style={{
                textAlign: 'center',
                padding: softUITokens.spacing.lg,
                background: softUITokens.colors.neutral.gray50,
                borderRadius: softUITokens.borderRadius.soft,
              }}
            >
              <div
                style={{
                  fontSize: softUITokens.typography.fontSize['4xl'],
                  fontWeight: softUITokens.typography.fontWeight.bold,
                  color: softUITokens.colors.neutral.gray400,
                  marginBottom: softUITokens.spacing.sm,
                }}
              >
                {metric.value}
              </div>
              <div
                style={{
                  fontSize: softUITokens.typography.fontSize.sm,
                  color: softUITokens.colors.neutral.gray600,
                  marginBottom: softUITokens.spacing.xs,
                }}
              >
                {metric.label}
              </div>
              <div
                style={{
                  fontSize: softUITokens.typography.fontSize.xs,
                  color: softUITokens.colors.neutral.gray500,
                  fontStyle: 'italic',
                }}
              >
                {metric.note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * FAQ Section Hidden State
 * Hides FAQ section entirely if loading fails
 */
export const FAQSectionHidden: React.FC = () => {
  // Return null to hide the section completely
  return null;
};

/**
 * Pricing Fallback CTA
 * Shows generic CTA when pricing data fails to load
 */
export const PricingFallbackCTA: React.FC = () => {
  return (
    <div
      style={{
        padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.xl}`,
        background: softUITokens.colors.neutral.gray50,
      }}
      role="region"
      aria-label="Pricing information"
    >
      <div className="container mx-auto max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          style={{
            textAlign: 'center',
            padding: softUITokens.spacing['5xl'],
            background: softUITokens.colors.neutral.white,
            borderRadius: softUITokens.borderRadius.softLarge,
            boxShadow: softUITokens.shadows.soft,
          }}
        >
          <h2
            style={{
              fontSize: softUITokens.typography.fontSize['3xl'],
              fontWeight: softUITokens.typography.fontWeight.bold,
              color: softUITokens.colors.neutral.gray900,
              marginBottom: softUITokens.spacing.md,
            }}
          >
            Flexible Pricing for Every Partner
          </h2>
          
          <p
            style={{
              fontSize: softUITokens.typography.fontSize.xl,
              color: softUITokens.colors.neutral.gray600,
              marginBottom: softUITokens.spacing.xl,
              maxWidth: '600px',
              margin: `0 auto ${softUITokens.spacing.xl}`,
            }}
          >
            We offer customized advertising solutions for agents, developers, banks, and service providers.
          </p>
          
          <div
            style={{
              display: 'flex',
              gap: softUITokens.spacing.md,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="/pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: `${softUITokens.spacing.md} ${softUITokens.spacing.xl}`,
                background: softUITokens.colors.primary.gradient,
                color: softUITokens.colors.neutral.white,
                textDecoration: 'none',
                borderRadius: softUITokens.borderRadius.soft,
                fontSize: softUITokens.typography.fontSize.lg,
                fontWeight: softUITokens.typography.fontWeight.medium,
                transition: `all ${softUITokens.transitions.base}`,
                boxShadow: softUITokens.shadows.soft,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = softUITokens.shadows.softHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = softUITokens.shadows.soft;
              }}
            >
              View Pricing
            </a>
            
            <a
              href="/contact"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: `${softUITokens.spacing.md} ${softUITokens.spacing.xl}`,
                background: softUITokens.colors.neutral.white,
                color: softUITokens.colors.primary.dark,
                textDecoration: 'none',
                border: `2px solid ${softUITokens.colors.primary.dark}`,
                borderRadius: softUITokens.borderRadius.soft,
                fontSize: softUITokens.typography.fontSize.lg,
                fontWeight: softUITokens.typography.fontWeight.medium,
                transition: `all ${softUITokens.transitions.base}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = softUITokens.colors.primary.light;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = softUITokens.colors.neutral.white;
              }}
            >
              Contact Sales
            </a>
          </div>
          
          {/* Info note */}
          <div
            style={{
              marginTop: softUITokens.spacing.xl,
              padding: softUITokens.spacing.md,
              background: softUITokens.colors.neutral.gray50,
              borderRadius: softUITokens.borderRadius.soft,
            }}
            role="status"
            aria-live="polite"
          >
            <p
              style={{
                color: softUITokens.colors.neutral.gray600,
                fontSize: softUITokens.typography.fontSize.sm,
              }}
            >
              <AlertCircle
                size={16}
                style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }}
              />
              Detailed pricing information is temporarily unavailable. Please contact us for current rates.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/**
 * Inline Error Message
 * Small error message for inline use within sections
 */
export const InlineError: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => {
  return (
    <div
      style={{
        padding: softUITokens.spacing.lg,
        background: '#fef2f2', // red-50
        border: '1px solid #fecaca', // red-200
        borderRadius: softUITokens.borderRadius.soft,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: softUITokens.spacing.md,
      }}
      role="alert"
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: softUITokens.spacing.sm }}>
        <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
        <span
          style={{
            color: '#991b1b', // red-800
            fontSize: softUITokens.typography.fontSize.sm,
          }}
        >
          {message}
        </span>
      </div>
      
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: `${softUITokens.spacing.xs} ${softUITokens.spacing.md}`,
            background: '#ef4444', // red-500
            color: softUITokens.colors.neutral.white,
            border: 'none',
            borderRadius: softUITokens.borderRadius.soft,
            fontSize: softUITokens.typography.fontSize.sm,
            fontWeight: softUITokens.typography.fontWeight.medium,
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Retry"
        >
          Retry
        </button>
      )}
    </div>
  );
};
