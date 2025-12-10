/**
 * HeroSection Component
 * 
 * The hero section is the first visible section of the Advertise With Us landing page.
 * It communicates the core value proposition and provides primary CTAs.
 * 
 * Requirements: 1.1, 10.2, 10.3, 10.4
 */

import React from 'react';
import { motion } from 'framer-motion';
import { softUITokens } from './design-tokens';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations/advertiseAnimations';
import { CTAButtonGroup } from './CTAButton';
import { BillboardBanner } from './BillboardBanner';
import { TrustSignals } from './TrustSignals';
import { BackgroundOrbs } from './BackgroundOrbs';

export interface CTAConfig {
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
  onClick?: () => void;
}

export interface BillboardConfig {
  imageUrl: string;
  alt: string;
  developmentName: string;
  tagline: string;
  ctaLabel?: string;
  href: string;
}

export interface TrustSignal {
  type: 'logo' | 'text';
  content: string;
  imageUrl?: string;
}

export interface HeroSectionProps {
  headline: string;
  subheadline: string;
  primaryCTA: CTAConfig;
  secondaryCTA: CTAConfig;
  billboard: BillboardConfig;
  trustSignals: TrustSignal[];
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  headline,
  subheadline,
  primaryCTA,
  secondaryCTA,
  billboard,
  trustSignals,
}) => {
  return (
    <section
      className="relative overflow-hidden"
      aria-labelledby="hero-headline"
      aria-describedby="hero-subheadline"
      role="banner"
      style={{
        background: `linear-gradient(135deg, ${softUITokens.colors.primary.light} 0%, ${softUITokens.colors.neutral.white} 50%, ${softUITokens.colors.secondary.light} 100%)`,
        minHeight: 'max(90vh, 640px)',
      }}
    >
      {/* Container with max width */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Left Column: Text Content */}
          <motion.div
            className="text-center lg:text-left space-y-6"
            variants={staggerItem}
          >
            {/* Headline with gradient text */}
            <motion.h1
              id="hero-headline"
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight"
              variants={fadeUp}
              style={{
                background: softUITokens.colors.primary.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {headline}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              id="hero-subheadline"
              className="text-lg sm:text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0"
              variants={fadeUp}
            >
              {subheadline}
            </motion.p>

            {/* CTA Button Group */}
            <motion.div
              className="justify-center lg:justify-start"
              variants={fadeUp}
            >
              <CTAButtonGroup
                primaryCTA={primaryCTA}
                secondaryCTA={secondaryCTA}
              />
            </motion.div>

            {/* Trust Signals */}
            {trustSignals.length > 0 && (
              <TrustSignals signals={trustSignals} />
            )}
          </motion.div>

          {/* Right Column: Static Billboard Banner */}
          <motion.div
            className="relative"
            variants={staggerItem}
          >
            <BillboardBanner
              imageUrl={billboard.imageUrl}
              alt={billboard.alt}
              developmentName={billboard.developmentName}
              tagline={billboard.tagline}
              ctaLabel={billboard.ctaLabel}
              href={billboard.href}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Background Orbs */}
      <BackgroundOrbs />
    </section>
  );
};
